from datetime import date

from sqlalchemy import inspect

from app.db import models
from app.db.enums import RecordStatus, SourceType, TaskOrigin, TaskStatus

EXPECTED_TABLES = {
    "appointment_requests",
    "document_jobs",
    "extracted_document_items",
    "visit_summaries",
    "care_plans",
    "care_plan_tasks",
    "service_requests",
    "activity_logs",
}


def test_all_tables_exist(db_session):
    tables = set(inspect(db_session.get_bind()).get_table_names())
    assert EXPECTED_TABLES <= tables


def test_appointment_request_persists_with_safe_defaults(db_session):
    request = models.AppointmentRequest(source_type=SourceType.TEXT, source_text="Fictional note")
    db_session.add(request)
    db_session.commit()

    loaded = db_session.get(models.AppointmentRequest, request.id)
    assert loaded is not None
    assert len(loaded.id) == 36
    assert loaded.status == RecordStatus.DRAFT
    assert loaded.approved_content is None
    assert loaded.approved_at is None
    assert loaded.created_at is not None


def test_json_content_round_trips(db_session):
    draft = {"visit_purpose": "Routine review", "missing_information": ["Preferred time"]}
    summary = models.VisitSummary(source_text="Fictional visit notes", draft_content=draft)
    db_session.add(summary)
    db_session.commit()
    db_session.expire_all()

    assert db_session.get(models.VisitSummary, summary.id).draft_content == draft


def test_care_plan_tasks_save_and_cascade_delete(db_session):
    plan = models.CarePlan(source_text="Fictional progress note")
    plan.tasks.append(
        models.CarePlanTask(
            description="Book follow-up appointment",
            origin=TaskOrigin.AI,
            suggested_due_date=date(2026, 11, 11),
        )
    )
    db_session.add(plan)
    db_session.commit()

    task = db_session.query(models.CarePlanTask).one()
    assert task.task_status == TaskStatus.PENDING

    db_session.delete(plan)
    db_session.commit()
    assert db_session.query(models.CarePlanTask).count() == 0
