"""CampusLink – FastAPI application factory.

REST API under /api (OpenAPI docs at /docs), Prometheus metrics at /metrics,
React build served at / in single-container deployments.
"""
from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.concurrency import run_in_threadpool
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from .api.routers import admin, auth, insights, offers, portal, recruitment, students, system
from .core.config import settings
from .core.observability import http_middleware, setup_logging
from .db import SessionLocal
from .engines import llm, notifications
from .services import bootstrap

log = logging.getLogger("campuslink")


async def automation_loop(minutes: int):
    """Scheduled workflow automation (reminders, escalations, follow-ups)."""
    while True:
        await asyncio.sleep(minutes * 60)
        try:
            def job():
                db = SessionLocal()
                try:
                    return notifications.run_automation(db)
                finally:
                    db.close()
            r = await run_in_threadpool(job)
            log.info(f"scheduled automation: {r}")
        except Exception:  # pragma: no cover
            log.exception("scheduled automation failed")


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    settings.validate_for_production()
    log.info(f"starting {settings.APP_NAME} env={settings.ENV} db={settings.DATABASE_URL.split('@')[-1]}")
    await run_in_threadpool(bootstrap)
    llm.start_background_load()
    task = asyncio.create_task(automation_loop(settings.AUTOMATION_INTERVAL_MINUTES)) \
        if settings.AUTOMATION_INTERVAL_MINUTES > 0 else None
    yield
    if task:
        task.cancel()


def create_app() -> FastAPI:
    app = FastAPI(title="CampusLink API", version="2.0.0", lifespan=lifespan,
                  description="AI-powered Campus-to-Corporate Placement Management & Analytics Platform. "
                              "Authenticate with POST /api/auth/login and send `Authorization: Bearer <token>`.",
                  docs_url="/docs", redoc_url=None)
    app.middleware("http")(http_middleware)
    app.add_middleware(GZipMiddleware, minimum_size=1024)
    app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins,
                       allow_origin_regex=r"https://.*\.vercel\.app",
                       allow_credentials=True,
                       allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
                       allow_headers=["Authorization", "Content-Type", "X-Request-ID"])

    @app.exception_handler(StarletteHTTPException)
    async def http_error(request, exc):
        return JSONResponse({"detail": exc.detail, "request_id": getattr(request.state, "request_id", None)},
                            status_code=exc.status_code, headers=getattr(exc, "headers", None))

    @app.exception_handler(RequestValidationError)
    async def validation_error(request, exc):
        errs = [f"{'.'.join(str(x) for x in e['loc'][1:])}: {e['msg']}" for e in exc.errors()]
        return JSONResponse({"detail": "; ".join(errs) or "Invalid request", "errors": exc.errors(),
                             "request_id": getattr(request.state, "request_id", None)}, status_code=422)

    for r in (system, auth, portal, students, recruitment, offers, insights, admin):
        app.include_router(r.router)

    dist = Path(__file__).resolve().parents[2] / "frontend" / "dist"
    if dist.exists():
        app.mount("/assets", StaticFiles(directory=dist / "assets"), name="assets")

        @app.get("/{full_path:path}", include_in_schema=False)
        def spa(full_path: str):
            if full_path.startswith("api/"):
                return JSONResponse({"detail": "Not found"}, status_code=404)
            f = (dist / full_path).resolve()
            return FileResponse(f if f.is_file() and dist in f.parents else dist / "index.html")
    return app


app = create_app()
