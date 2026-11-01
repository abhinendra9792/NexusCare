from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import models
from app.db.enums import RecordStatus, TaskReviewStatus, TaskStatus
from app.schemas.dashboard import DashboardStats, StatusCount

REVIEWABLE_MODELS = (
    models.AppointmentRequest,
    models.VisitSummary,
    models.ServiceRequest,
    models.CarePlan,
    models.ExtractedDocumentItem,
)

PROCESSED_DOCUMENT_STATUSES = (
    RecordStatus.AWAITING_REVIEW,
    RecordStatus.APPROVED,
    RecordStatus.REJECTED,
)


def _count(db: Session, statement) -> int:
    return db.scalar(statement) or 0


def get_dashboard_stats(db: Session) -> DashboardStats:
    total_appointments = _count(db, select(func.count()).select_from(models.AppointmentRequest))

    awaiting_review = sum(
        _count(db, select(func.count()).select_from(model).where(model.status == RecordStatus.AWAITING_REVIEW))
        for model in REVIEWABLE_MODELS
    )

    documents_processed = _count(
        db,
        select(func.count())
        .select_from(models.DocumentJob)
        .where(models.DocumentJob.status.in_(PROCESSED_DOCUMENT_STATUSES)),
    )

    pending_tasks = _count(
        db,
        select(func.count())
        .select_from(models.CarePlanTask)
        .join(models.CarePlan)
        .where(
            models.CarePlan.status == RecordStatus.APPROVED,
            models.CarePlanTask.review_status == TaskReviewStatus.APPROVED,
            models.CarePlanTask.task_status == TaskStatus.PENDING,
        ),
    )

    rows = db.execute(
        select(models.AppointmentRequest.status, func.count()).group_by(models.AppointmentRequest.status)
    ).all()
    counts = {status: count for status, count in rows}
    breakdown = [StatusCount(status=status, count=counts[status]) for status in RecordStatus if counts.get(status)]

    return DashboardStats(
        total_appointment_requests=total_appointments,
        awaiting_review=awaiting_review,
        documents_processed=documents_processed,
        pending_tasks=pending_tasks,
        status_breakdown=breakdown,
    )
