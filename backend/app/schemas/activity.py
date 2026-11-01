from app.schemas.common import CamelModel, UtcDatetime


class ActivityRead(CamelModel):
    id: str
    created_at: UtcDatetime
    entity_type: str
    entity_id: str
    action: str
    from_status: str | None
    to_status: str | None
    summary: str
