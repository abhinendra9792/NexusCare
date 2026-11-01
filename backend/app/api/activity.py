from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.activity import ActivityRead
from app.services.activity_service import list_activity

router = APIRouter(prefix="/api/v1/activity", tags=["activity"])


@router.get("", response_model=list[ActivityRead])
def read_activity(
    limit: int = Query(default=50, ge=1, le=200),
    entity_type: str | None = Query(default=None, alias="entityType", max_length=50),
    db: Session = Depends(get_db),
):
    return list_activity(db, limit=limit, entity_type=entity_type)
