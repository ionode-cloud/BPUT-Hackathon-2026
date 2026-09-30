"""Health, readiness, Prometheus metrics and reference data."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import text

from ...core.config import settings
from ...core.observability import metrics_response
from ...db import engine, get_db
from ...engines import llm, predictor
from ...engines.skills import ROLE_PROFILES, SKILL_CATEGORY
from ...models import Campus, User, Venue
from ..deps import current_user

router = APIRouter(tags=["system"])


@router.get("/api/health")
def health():
    """Liveness probe – the process is up."""
    return {"status": "ok", "app": settings.APP_NAME, "env": settings.ENV}


@router.get("/api/ready")
def ready(db=Depends(get_db)):
    """Readiness probe – database reachable and models loaded."""
    checks = {}
    try:
        with engine.connect() as c:
            c.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as e:  # pragma: no cover
        checks["database"] = f"error: {type(e).__name__}"
    checks["placement_model"] = "trained" if predictor.is_trained(db) else "untrained (import history)"
    checks["llm"] = llm.status()["state"]
    if settings.MONGODB_URI:
        from ...db import mongo_client
        if mongo_client:
            try:
                mongo_client.admin.command('ping')
                checks["mongodb"] = "ok (connected to Atlas)"
            except Exception as e:
                checks["mongodb"] = f"error: {type(e).__name__}"
        else:
            checks["mongodb"] = "not initialized"
    ok = checks["database"] == "ok"
    return JSONResponse({"status": "ready" if ok else "not ready", "checks": checks}, status_code=200 if ok else 503)


@router.get("/metrics", include_in_schema=False)
def metrics():
    return metrics_response()


@router.get("/api/meta")
def meta(user: User = Depends(current_user), db=Depends(get_db)):
    return {"campuses": [{"id": c.id, "name": c.name, "city": c.city} for c in db.query(Campus).all()],
            "venues": [{"id": v.id, "name": v.name, "capacity": v.capacity, "kind": v.kind, "campus_id": v.campus_id}
                       for v in db.query(Venue).all()],
            "roles": list(ROLE_PROFILES), "skills": sorted(SKILL_CATEGORY),
            "branches": ["CSE", "IT", "ECE", "EEE", "MECH", "CIVIL"],
            "levels": ["Not Ready", "Developing", "Ready", "Highly Employable"], "demo_mode": settings.DEMO_MODE}
