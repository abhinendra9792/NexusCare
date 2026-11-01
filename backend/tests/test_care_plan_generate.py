"""Tests for AI care-plan task generation. Uses a fake AI provider, so Gemini is never called."""

import json

import pytest

from app.db import models
from app.db.enums import TaskOrigin, TaskReviewStatus
from app.main import app
from app.services.ai_service import AIService, ProviderResponse, get_ai_service

BASE = "/api/v1/care-plans"
PAYLOAD = {
    "title": "Post-discharge follow-up",
    "sourceText": "Needs a follow-up with the orthopaedic clinic in two weeks. Daughter asked for the discharge summary.",
}


def tasks_output(*tasks) -> str:
    return json.dumps({"tasks": list(tasks), "notes": None})


def task(description, due=None, priority=None):
    return {
        "description": description,
        "source_reason": "From the progress notes.",
        "suggested_due_date": due,
        "priority": priority,
    }


class FakeProvider:
    provider_name = "fake"
    model_name = "fake-model"

    def __init__(self) -> None:
        self.text = tasks_output(
            task("Book orthopaedic follow-up", due="2026-11-15", priority="medium"),
            task("Send discharge summary to daughter"),
        )
        self.calls = 0

    def generate_json(self, *, system_instruction, prompt, schema):
        self.calls += 1
        return ProviderResponse(text=self.text, attempts=1)


@pytest.fixture
def fake_ai(client):
    provider = FakeProvider()
    app.dependency_overrides[get_ai_service] = lambda: AIService(provider)
    return provider


def test_generate_creates_draft_ai_tasks(client, fake_ai):
    response = client.post(f"{BASE}/generate", json=PAYLOAD)

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "awaiting_review"
    assert len(body["tasks"]) == 2

    first, second = body["tasks"]
    assert first["description"] == "Book orthopaedic follow-up"
    assert first["suggestedDueDate"] == "2026-11-15"
    assert first["priority"] == "medium"
    assert second["suggestedDueDate"] is None
    for item in body["tasks"]:
        assert item["origin"] == "ai"
        assert item["reviewStatus"] == "draft"
        assert item["taskStatus"] == "pending"


def test_retry_keeps_manual_and_reviewed_tasks(client, fake_ai, db_session):
    plan_id = client.post(f"{BASE}/generate", json=PAYLOAD).json()["id"]

    # Simulate a reviewer: approve the first AI task and add a manual task.
    plan = db_session.get(models.CarePlan, plan_id)
    plan.tasks[0].review_status = TaskReviewStatus.APPROVED
    plan.tasks.append(models.CarePlanTask(description="Call family", origin=TaskOrigin.MANUAL, sort_order=10))
    db_session.commit()

    fake_ai.text = tasks_output(task("Arrange transport to clinic"))
    response = client.post(f"{BASE}/{plan_id}/retry")

    assert response.status_code == 200
    descriptions = [item["description"] for item in response.json()["tasks"]]
    assert descriptions == [
        "Book orthopaedic follow-up",  # approved -> kept
        "Call family",  # manual -> kept
        "Arrange transport to clinic",  # new AI draft
    ]
    assert "Send discharge summary to daughter" not in descriptions  # old unreviewed draft replaced


def test_invalid_output_fails_without_creating_tasks(client, fake_ai):
    fake_ai.text = json.dumps({"tasks": [{"description": "Missing other fields", "priority": "urgent"}]})

    response = client.post(f"{BASE}/generate", json=PAYLOAD)

    assert response.status_code == 502
    plans = client.get(BASE).json()
    assert plans[0]["status"] == "failed"
    assert plans[0]["tasks"] == []