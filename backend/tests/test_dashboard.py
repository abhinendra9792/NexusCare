from app.db import models
from app.db.enums import RecordStatus, SourceType, TaskOrigin, TaskReviewStatus, TaskStatus

STATS_URL = "/api/v1/dashboard/stats"


def test_stats_on_empty_database(client):
    response = client.get(STATS_URL)
    assert response.status_code == 200
    assert response.json() == {
        "totalAppointmentRequests": 0,
        "awaitingReview": 0,
        "documentsProcessed": 0,
        "pendingTasks": 0,
        "statusBreakdown": [],
    }


def test_stats_count_real_records(client, db_session):
    for status in [
        RecordStatus.AWAITING_REVIEW,
        RecordStatus.AWAITING_REVIEW,
        RecordStatus.APPROVED,
        RecordStatus.REJECTED,
    ]:
        db_session.add(
            models.AppointmentRequest(source_type=SourceType.TEXT, source_text="Fictional note", status=status)
        )

    db_session.add(models.VisitSummary(source_text="Fictional notes", status=RecordStatus.AWAITING_REVIEW))
    db_session.add(models.DocumentJob(original_filename="letter.pdf", file_size_bytes=1024, status=RecordStatus.APPROVED))
    db_session.add(models.DocumentJob(original_filename="broken.pdf", file_size_bytes=1024, status=RecordStatus.FAILED))

    approved_plan = models.CarePlan(source_text="Fictional progress note", status=RecordStatus.APPROVED)
    approved_plan.tasks = [
        models.CarePlanTask(description="Book follow-up", origin=TaskOrigin.AI, review_status=TaskReviewStatus.APPROVED),
        models.CarePlanTask(
            description="Send report",
            origin=TaskOrigin.AI,
            review_status=TaskReviewStatus.APPROVED,
            task_status=TaskStatus.COMPLETED,
        ),
        models.CarePlanTask(description="Unreviewed idea", origin=TaskOrigin.AI, review_status=TaskReviewStatus.DRAFT),
    ]

    unapproved_plan = models.CarePlan(source_text="Another fictional note", status=RecordStatus.AWAITING_REVIEW)
    unapproved_plan.tasks = [
        models.CarePlanTask(description="Plan not approved yet", origin=TaskOrigin.AI, review_status=TaskReviewStatus.APPROVED),
    ]

    db_session.add_all([approved_plan, unapproved_plan])
    db_session.commit()

    body = client.get(STATS_URL).json()

    assert body["totalAppointmentRequests"] == 4
    # 2 appointments + 1 visit summary + 1 care plan awaiting review
    assert body["awaitingReview"] == 4
    # Failed documents are not counted as processed
    assert body["documentsProcessed"] == 1
    # Only approved, unfinished tasks in approved plans count
    assert body["pendingTasks"] == 1
    assert body["statusBreakdown"] == [
        {"status": "awaiting_review", "count": 2},
        {"status": "approved", "count": 1},
        {"status": "rejected", "count": 1},
    ]
