import logging
from typing import Any

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.dependencies.database import get_db
from app.services.cache import cache_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/health", tags=["Health & Monitoring"])


@router.get("/live", status_code=status.HTTP_200_OK)
def liveness() -> dict[str, str]:
    """
    Kubernetes/ECS liveness probe.
    Returns 200 OK immediately if the web process is running.
    """
    return {"status": "ok"}


@router.get("/ready")
def readiness(
    response: Response,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """
    Kubernetes/ECS readiness probe.
    Verifies that required backing dependencies (database, and optionally redis) are responsive.
    Returns 503 if any mandatory dependency fails.
    """
    health_status: dict[str, Any] = {
        "status": "ok",
        "environment": settings.APP_ENV,
        "database": "unknown",
        "redis": "disabled",
    }
    is_healthy = True

    # 1. Database Connectivity Probe
    try:
        db.execute(text("SELECT 1"))
        health_status["database"] = "healthy"
    except Exception as e:
        logger.error("Readiness check failed for database: %s", e)
        health_status["database"] = "unhealthy"
        is_healthy = False

    # 2. Redis Connectivity Probe (if configured)
    if settings.REDIS_URL:
        if cache_service.ping():
            health_status["redis"] = "healthy"
        else:
            health_status["redis"] = "unhealthy"
            # Note: Depending on architectural requirements, Redis can be soft or hard failure.
            # Here we treat Redis as optional fallback cache, but reflect status accurately.

    if not is_healthy:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        health_status["status"] = "degraded"

    return health_status
