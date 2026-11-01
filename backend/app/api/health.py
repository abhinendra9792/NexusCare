from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db

router = APIRouter(tags=["health"])


@router.get("/health")
def health(db: Session = Depends(get_db)) -> dict:
    settings = get_settings()
    try:
        db.execute(text("SELECT 1"))
        database = "ok"
    except Exception:
        database = "unavailable"

    return {
        "status": "ok" if database == "ok" else "degraded",
        "app": settings.app_name,
        "environment": settings.app_env,
        "database": database,
        "ai_configured": settings.gemini_configured,
    }
