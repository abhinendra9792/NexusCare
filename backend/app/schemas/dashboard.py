from app.db.enums import RecordStatus
from app.schemas.common import CamelModel


class StatusCount(CamelModel):
    status: RecordStatus
    count: int


class DashboardStats(CamelModel):
    total_appointment_requests: int
    awaiting_review: int
    documents_processed: int
    pending_tasks: int
    status_breakdown: list[StatusCount]
