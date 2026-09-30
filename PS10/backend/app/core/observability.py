"""Structured logging, request IDs, Prometheus metrics, security headers and rate limiting."""
from __future__ import annotations

import json
import logging
import sys
import threading
import time
import uuid
from collections import defaultdict, deque

from fastapi import Request
from fastapi.responses import JSONResponse
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest
from starlette.responses import Response

from .config import settings

log = logging.getLogger("campuslink")

REQUESTS = Counter("campuslink_http_requests_total", "HTTP requests", ["method", "route", "status"])
LATENCY = Histogram("campuslink_http_request_duration_seconds", "Request latency", ["route"],
                    buckets=(.005, .01, .025, .05, .1, .25, .5, 1, 2.5, 5, 10))
AUTH_FAILURES = Counter("campuslink_auth_failures_total", "Failed logins")
MODEL_INFERENCES = Counter("campuslink_model_inferences_total", "PyTorch model inference calls", ["model"])


class JsonFormatter(logging.Formatter):
    def format(self, record):
        data = {"ts": self.formatTime(record, "%Y-%m-%dT%H:%M:%S"), "level": record.levelname, "logger": record.name,
                "msg": record.getMessage()}
        for k in ("request_id", "method", "path", "status", "ms", "user", "client"):
            if hasattr(record, k):
                data[k] = getattr(record, k)
        if record.exc_info:
            data["exc"] = self.formatException(record.exc_info)
        return json.dumps(data)


def setup_logging() -> None:
    h = logging.StreamHandler(sys.stdout)
    h.setFormatter(JsonFormatter() if settings.LOG_JSON else
                   logging.Formatter("%(asctime)s %(levelname)-7s %(name)s: %(message)s"))
    root = logging.getLogger()
    root.handlers[:] = [h]
    root.setLevel(settings.LOG_LEVEL)
    logging.getLogger("uvicorn.access").disabled = True  # replaced by our access log


class RateLimiter:
    """Sliding-window limiter (in-process). Use Redis for multi-instance deployments."""

    def __init__(self):
        self._hits: dict[str, deque] = defaultdict(deque)
        self._lock = threading.Lock()

    def allow(self, key: str, limit: int, window: float = 60.0) -> bool:
        now = time.monotonic()
        with self._lock:
            q = self._hits[key]
            while q and now - q[0] > window:
                q.popleft()
            if len(q) >= limit:
                return False
            q.append(now)
            return True


limiter = RateLimiter()

SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Content-Security-Policy": "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline' "
                               "https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; "
                               "script-src 'self'; connect-src 'self'; frame-ancestors 'none'",
}


def client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    return fwd.split(",")[0].strip() if fwd else (request.client.host if request.client else "unknown")


async def http_middleware(request: Request, call_next):
    rid = request.headers.get("x-request-id") or uuid.uuid4().hex[:16]
    request.state.request_id = rid
    ip = client_ip(request)
    t0 = time.perf_counter()
    if request.url.path.startswith("/api/") and not limiter.allow(f"api:{ip}", settings.API_REQUESTS_PER_MINUTE):
        resp = JSONResponse({"detail": "Too many requests", "request_id": rid}, status_code=429)
    else:
        try:
            resp = await call_next(request)
        except Exception:
            log.exception("unhandled error", extra={"request_id": rid, "path": request.url.path})
            resp = JSONResponse({"detail": "Internal server error", "request_id": rid}, status_code=500)
    ms = (time.perf_counter() - t0) * 1000
    route = getattr(request.scope.get("route"), "path", "unmatched")
    if request.url.path.startswith(("/api/", "/metrics")):
        REQUESTS.labels(request.method, route, str(resp.status_code)).inc()
        LATENCY.labels(route).observe(ms / 1000)
        log.info(f"{request.method} {request.url.path} {resp.status_code} {ms:.1f}ms",
                 extra={"request_id": rid, "method": request.method, "path": request.url.path,
                        "status": resp.status_code, "ms": round(ms, 1), "client": ip,
                        "user": getattr(request.state, "user_email", None)})
    resp.headers["X-Request-ID"] = rid
    for k, v in SECURITY_HEADERS.items():
        resp.headers.setdefault(k, v)
    if settings.is_production:
        resp.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    return resp


def metrics_response() -> Response:
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
