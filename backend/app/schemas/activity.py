from datetime import datetime

from app.schemas.common import CamelModel


class ActivityRead(CamelModel):
    id: str
    created_at: datetime
    entity_type: str
    entity_id: str
    action: str
    from_status: str | None
    to_status: str | None
    summary: str
