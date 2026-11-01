from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import models


def log_activity(
    db: Session,
    *,
    entity_type: str,
    entity_id: str,
    action: str,
    summary: str,
    from_status: str | None = None,
    to_status: str | None = None,
) -> models.ActivityLog:
    """Record an action. Summaries must never contain patient details or note text."""
    entry = models.ActivityLog(
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        from_status=str(from_status) if from_status else None,
        to_status=str(to_status) if to_status else None,
        summary=summary[:255],
    )
    db.add(entry)
    return entry


def list_activity(db: Session, *, limit: int = 50, entity_type: str | None = None) -> list[models.ActivityLog]:
    statement = select(models.ActivityLog)
    if entity_type:
        statement = statement.where(models.ActivityLog.entity_type == entity_type)
    statement = statement.order_by(models.ActivityLog.created_at.desc()).limit(limit)
    return list(db.scalars(statement))
