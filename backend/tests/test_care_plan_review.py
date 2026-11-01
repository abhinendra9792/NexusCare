"""Review tests for care plans: task approve/reject/edit/complete, manual tasks, plan approval."""

import json

import pytest

from app.main import app
from app.services.ai_service import AIService, ProviderResponse, get_ai_service

BASE = "/api/v1/care-plans"
PAYLOAD = {
    "title": "Post-discharge follow-up",
    "sourceText": "Needs a follow-up with the orthopaedic clinic in two weeks. Daughter asked for the discharge summary.",
}
AI_TASKS = {
    "tasks": [
        {"description": "Book orthopaedic follow-up", "source_reason": "Notes", "suggested_due_date": "2026-11-15", "priority": None},
        {"description": "Send discharge summary to daughter", "source_reason": "Notes", "suggested_due_date": None, "priority": None},
    ],
    "notes": None,
}


class FakeProvider:
    provider_name = "fake"
    model_name = "fake-model"

    def generate_json(self, *, system_instruction, prompt, schema):
        return ProviderResponse(text=json.dumps(AI_TASKS), attempts=1)


@pytest.fixture
def plan(client):
    """A care plan awaiting review with two AI draft tasks."""
    app.dependency_overrides[get_ai_service] = lambda: AIService(FakeProvider())
    body = client.post(f"{BASE}/generate", json=PAYLOAD).json()
    assert body["status"] == "awaiting_review"
    return body


def task_ids(plan_body):
    return [task["id"] for task in plan_body["tasks"]]


def test_full_review_flow_approves_plan(client, plan):
    first, second = task_ids(plan)
    client.post(f"{BASE}/tasks/{first}/approve")
    client.post(f"{BASE}/tasks/{second}/reject")

    response = client.post(f"{BASE}/{plan['id']}/approve")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "approved"
    assert body["approvedAt"] is not None
    assert [task["reviewStatus"] for task in body["tasks"]] == ["approved", "rejected"]


def test_plan_cannot_be_approved_with_unreviewed_tasks(client, plan):
    first, _ = task_ids(plan)
    client.post(f"{BASE}/tasks/{first}/approve")

    response = client.post(f"{BASE}/{plan['id']}/approve")

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "TASKS_NOT_REVIEWED"


def test_plan_needs_at_least_one_approved_task(client, plan):
    for task_id in task_ids(plan):
        client.post(f"{BASE}/tasks/{task_id}/reject")

    response = client.post(f"{BASE}/{plan['id']}/approve")

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "NO_APPROVED_TASKS"


def test_only_draft_tasks_can_be_edited(client, plan):
    first, second = task_ids(plan)

    edit = client.patch(f"{BASE}/tasks/{first}", json={"description": "Book orthopaedic review", "priority": "high"})
    assert edit.status_code == 200
    assert edit.json()["tasks"][0]["description"] == "Book orthopaedic review"
    assert edit.json()["tasks"][0]["priority"] == "high"

    client.post(f"{BASE}/tasks/{second}/approve")
    assert client.patch(f"{BASE}/tasks/{second}", json={"description": "Changed"}).status_code == 409


def test_only_approved_tasks_can_be_completed_and_reopened(client, plan):
    first, _ = task_ids(plan)

    assert client.patch(f"{BASE}/tasks/{first}", json={"taskStatus": "completed"}).status_code == 409

    client.post(f"{BASE}/tasks/{first}/approve")
    done = client.patch(f"{BASE}/tasks/{first}", json={"taskStatus": "completed"})
    assert done.json()["tasks"][0]["taskStatus"] == "completed"

    reopened = client.patch(f"{BASE}/tasks/{first}", json={"taskStatus": "pending"})
    assert reopened.json()["tasks"][0]["taskStatus"] == "pending"


def test_manual_task_starts_as_draft_and_only_drafts_can_be_deleted(client, plan):
    added = client.post(f"{BASE}/{plan['id']}/tasks", json={"description": "Call the family"})
    assert added.status_code == 201
    manual = added.json()["tasks"][-1]
    assert manual["origin"] == "manual"
    assert manual["reviewStatus"] == "draft"

    deleted = client.delete(f"{BASE}/tasks/{manual['id']}")
    assert deleted.status_code == 200
    assert manual["id"] not in task_ids(deleted.json())

    first, _ = task_ids(plan)
    client.post(f"{BASE}/tasks/{first}/approve")
    assert client.delete(f"{BASE}/tasks/{first}").status_code == 409


def test_approved_plan_is_locked_but_tasks_can_still_be_completed(client, plan):
    first, second = task_ids(plan)
    client.post(f"{BASE}/tasks/{first}/approve")
    client.post(f"{BASE}/tasks/{second}/reject")
    client.post(f"{BASE}/{plan['id']}/approve")

    assert client.post(f"{BASE}/{plan['id']}/tasks", json={"description": "Late addition"}).status_code == 409
    assert client.patch(f"{BASE}/tasks/{first}", json={"description": "Changed"}).status_code == 409

    done = client.patch(f"{BASE}/tasks/{first}", json={"taskStatus": "completed"})
    assert done.status_code == 200
    assert done.json()["tasks"][0]["taskStatus"] == "completed"


def test_invalid_priority_is_rejected(client, plan):
    first, _ = task_ids(plan)

    response = client.patch(f"{BASE}/tasks/{first}", json={"priority": "urgent"})

    assert response.status_code == 422