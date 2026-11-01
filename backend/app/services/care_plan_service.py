"""Review workflow for care plans and their tasks."""

from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.db import models
from app.db.enums import RecordStatus, TaskOrigin, TaskReviewStatus, TaskStatus
from app.db.models import utcnow
from app.services.activity_service import log_activity
from app.services.status_service import apply_transition

PLAN_ENTITY = "care_plan"
TASK_ENTITY = "care_plan_task"
CONTENT_FIELDS = ("description", "source_reason", "suggested_due_date", "priority")


def _get_plan(db: Session, plan_id: str) -> models.CarePlan:
    plan = db.get(models.CarePlan, plan_id)
    if plan is None:
        raise AppError("NOT_FOUND", "Care plan not found.", 404)
    return plan


def _get_task(db: Session, task_id: str) -> models.CarePlanTask:
    task = db.get(models.CarePlanTask, task_id)
    if task is None:
        raise AppError("NOT_FOUND", "Task not found.", 404)
    return task


def _require_plan_in_review(plan: models.CarePlan) -> None:
    if plan.status != RecordStatus.AWAITING_REVIEW:
        raise AppError(
            "PLAN_NOT_IN_REVIEW",
            "Tasks can only be added or changed while the care plan is awaiting review.",
            409,
        )


def _require_draft(task: models.CarePlanTask) -> None:
    if task.review_status != TaskReviewStatus.DRAFT:
        raise AppError("TASK_ALREADY_REVIEWED", "This task has already been reviewed and cannot be changed.", 409)


def _log(db: Session, task: models.CarePlanTask, action: str, summary: str) -> None:
    log_activity(db, entity_type=TASK_ENTITY, entity_id=task.id, action=action, summary=summary)


def _finish(db: Session, plan: models.CarePlan) -> models.CarePlan:
    db.commit()
    db.refresh(plan)
    _ = plan.tasks  # load tasks while the session is open
    return plan


def add_manual_task(db: Session, plan_id: str, data) -> models.CarePlan:
    plan = _get_plan(db, plan_id)
    _require_plan_in_review(plan)
    next_order = max((task.sort_order for task in plan.tasks), default=-1) + 1
    task = models.CarePlanTask(
        description=data.description,
        source_reason=data.source_reason,
        suggested_due_date=data.suggested_due_date,
        priority=data.priority,
        task_status=TaskStatus.PENDING,
        review_status=TaskReviewStatus.DRAFT,
        origin=TaskOrigin.MANUAL,
        sort_order=next_order,
    )
    plan.tasks.append(task)
    db.flush()
    _log(db, task, "created", "Manual task added")
    return _finish(db, plan)


def update_task(db: Session, task_id: str, data) -> models.CarePlan:
    """Edit a draft task's content, or complete / reopen / cancel an approved task."""
    task = _get_task(db, task_id)
    plan = task.care_plan
    changes = data.model_dump(exclude_unset=True)

    content = {field: value for field, value in changes.items() if field in CONTENT_FIELDS}
    if content:
        _require_plan_in_review(plan)
        _require_draft(task)
        if "description" in content and content["description"] is None:
            raise AppError("INVALID_INPUT", "A task needs a description.", 422)
        for field, value in content.items():
            setattr(task, field, value)
        _log(db, task, "edited", "Task edited by reviewer")

    new_status = changes.get("task_status")
    if new_status is not None:
        if task.review_status != TaskReviewStatus.APPROVED:
            raise AppError(
                "TASK_NOT_APPROVED", "Only approved tasks can be completed, reopened, or cancelled.", 409
            )
        if plan.status not in (RecordStatus.AWAITING_REVIEW, RecordStatus.APPROVED):
            raise AppError("PLAN_CLOSED", "This care plan is closed.", 409)
        if new_status != task.task_status:
            old_status = TaskStatus(task.task_status)
            task.task_status = new_status
            _log(db, task, "status_changed", f"Task status changed from {old_status.value} to {new_status.value}")

    return _finish(db, plan)


def delete_task(db: Session, task_id: str) -> models.CarePlan:
    task = _get_task(db, task_id)
    plan = task.care_plan
    _require_plan_in_review(plan)
    _require_draft(task)
    _log(db, task, "deleted", "Draft task removed by reviewer")
    plan.tasks.remove(task)
    return _finish(db, plan)


def _review_task(db: Session, task_id: str, decision: TaskReviewStatus, action: str) -> models.CarePlan:
    task = _get_task(db, task_id)
    plan = task.care_plan
    _require_plan_in_review(plan)
    _require_draft(task)
    task.review_status = decision
    _log(db, task, action, f"Task {action}")
    return _finish(db, plan)


def approve_task(db: Session, task_id: str) -> models.CarePlan:
    return _review_task(db, task_id, TaskReviewStatus.APPROVED, "approved")


def reject_task(db: Session, task_id: str) -> models.CarePlan:
    return _review_task(db, task_id, TaskReviewStatus.REJECTED, "rejected")


def approve_plan(db: Session, plan_id: str) -> models.CarePlan:
    """Approve the plan only when every task has been reviewed and at least one was approved."""
    plan = _get_plan(db, plan_id)
    if any(task.review_status == TaskReviewStatus.DRAFT for task in plan.tasks):
        raise AppError("TASKS_NOT_REVIEWED", "Review every task before approving the care plan.", 409)
    if not any(task.review_status == TaskReviewStatus.APPROVED for task in plan.tasks):
        raise AppError("NO_APPROVED_TASKS", "Approve at least one task before approving the care plan.", 409)
    apply_transition(
        db, plan, RecordStatus.APPROVED, entity_type=PLAN_ENTITY, action="approved", summary="Care plan approved"
    )
    plan.approved_at = utcnow()
    return _finish(db, plan)


def reject_plan(db: Session, plan_id: str) -> models.CarePlan:
    plan = _get_plan(db, plan_id)
    apply_transition(
        db, plan, RecordStatus.REJECTED, entity_type=PLAN_ENTITY, action="rejected", summary="Care plan rejected"
    )
    return _finish(db, plan)