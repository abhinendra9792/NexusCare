"""Review tests for extracted document items: edit, approve, reject. Gemini is never called."""

import json
import uuid

import pymupdf
import pytest

from app.main import app
from app.services.ai_service import AIService, ProviderResponse, get_ai_service

BASE = "/api/v1/documents"

APPOINTMENT = {
    "date": "2026-11-20",
    "time": "10:30",
    "department_or_provider": "Cardiology",
    "location": "Block B",
    "purpose": "Consultation",
    "source_excerpt": "Appointment on 20 November 2026 at 10:30.",
}
FOLLOW_UP = {"action": "Bring ECG reports", "due_date": None, "source_excerpt": "Bring ECG reports."}
AI_OUTPUT = {"appointments": [APPOINTMENT], "follow_up_actions": [FOLLOW_UP], "missing_information": []}


class FakeProvider:
    provider_name = "fake"
    model_name = "fake-model"

    def generate_json(self, *, system_instruction, prompt, schema):
        return ProviderResponse(text=json.dumps(AI_OUTPUT), attempts=1)


def make_pdf() -> bytes:
    document = pymupdf.open()
    document.new_page().insert_text((50, 72), "Appointment on 20 November 2026 at 10:30.\nBring ECG reports.")
    return document.tobytes()


@pytest.fixture
def items(client):
    """Upload a document and return its two items: (appointment, follow_up)."""
    app.dependency_overrides[get_ai_service] = lambda: AIService(FakeProvider())
    body = client.post(f"{BASE}/generate", files={"file": ("letter.pdf", make_pdf(), "application/pdf")}).json()
    assert body["status"] == "awaiting_review"
    by_type = {item["itemType"]: item for item in body["items"]}
    return by_type["appointment"], by_type["follow_up"]


def find(body, item_id):
    return next(item for item in body["items"] if item["id"] == item_id)


def test_edit_then_approve_one_item(client, items):
    appointment, follow_up = items
    edited = {**APPOINTMENT, "time": "11:00"}

    edit = client.patch(f"{BASE}/items/{appointment['id']}", json={"draftContent": edited})
    assert edit.status_code == 200
    assert find(edit.json(), appointment["id"])["approvedContent"] is None  # editing never approves

    response = client.post(f"{BASE}/items/{appointment['id']}/approve")

    assert response.status_code == 200
    approved = find(response.json(), appointment["id"])
    assert approved["status"] == "approved"
    assert approved["approvedContent"]["time"] == "11:00"
    assert approved["approvedAt"] is not None
    assert find(response.json(), follow_up["id"])["status"] == "awaiting_review"  # other items untouched


def test_approved_item_is_locked(client, items):
    appointment, _ = items
    client.post(f"{BASE}/items/{appointment['id']}/approve")

    assert client.patch(f"{BASE}/items/{appointment['id']}", json={"draftContent": APPOINTMENT}).status_code == 409
    assert client.post(f"{BASE}/items/{appointment['id']}/approve").status_code == 409
    assert client.post(f"{BASE}/items/{appointment['id']}/reject").status_code == 409


def test_reject_item_is_final(client, items):
    _, follow_up = items

    response = client.post(f"{BASE}/items/{follow_up['id']}/reject")

    assert response.status_code == 200
    rejected = find(response.json(), follow_up["id"])
    assert rejected["status"] == "rejected"
    assert rejected["approvedContent"] is None
    assert client.post(f"{BASE}/items/{follow_up['id']}/approve").status_code == 409


def test_invalid_item_edit_is_rejected_and_draft_unchanged(client, items):
    appointment, _ = items
    broken = {**APPOINTMENT, "date": {"day": 20}}

    response = client.patch(f"{BASE}/items/{appointment['id']}", json={"draftContent": broken})

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INVALID_ITEM"
    job = client.get(BASE).json()[0]
    assert find(job, appointment["id"])["draftContent"]["date"] == "2026-11-20"


def test_unknown_item_returns_404(client, items):
    response = client.post(f"{BASE}/items/{uuid.uuid4()}/approve")

    assert response.status_code == 404