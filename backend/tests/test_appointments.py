import uuid

URL = "/api/v1/appointments"
NOTE = "Fictional caregiver note asking for a follow-up visit next week."


def create(client, **overrides):
    payload = {"sourceText": NOTE, "sourceType": "text", **overrides}
    return client.post(URL, json=payload)


def test_create_saves_a_draft_without_approved_content(client):
    response = create(client)
    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "draft"
    assert body["sourceText"] == NOTE
    assert body["draftContent"] is None
    assert body["approvedContent"] is None


def test_create_rejects_short_text(client):
    response = create(client, sourceText="too short")
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_create_rejects_unknown_source_type(client):
    response = create(client, sourceType="fax")
    assert response.status_code == 422


def test_created_appointment_is_listed_and_retrievable(client):
    created = create(client).json()
    listed = client.get(URL).json()
    assert [item["id"] for item in listed] == [created["id"]]
    fetched = client.get(f"{URL}/{created['id']}")
    assert fetched.status_code == 200
    assert fetched.json()["id"] == created["id"]


def test_unknown_appointment_returns_404(client):
    response = client.get(f"{URL}/{uuid.uuid4()}")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


def test_invalid_id_returns_422(client):
    response = client.get(f"{URL}/not-a-real-id")
    assert response.status_code == 422


def test_cancelling_twice_is_rejected(client):
    created = create(client).json()
    first = client.post(f"{URL}/{created['id']}/cancel")
    assert first.status_code == 200
    assert first.json()["status"] == "cancelled"

    second = client.post(f"{URL}/{created['id']}/cancel")
    assert second.status_code == 409
    assert second.json()["error"]["code"] == "INVALID_TRANSITION"


def test_actions_are_logged_without_note_text(client):
    created = create(client).json()
    client.post(f"{URL}/{created['id']}/cancel")

    entries = client.get("/api/v1/activity").json()
    assert {entry["action"] for entry in entries} == {"created", "cancelled"}
    assert all(entry["entityId"] == created["id"] for entry in entries)
    assert all(NOTE not in entry["summary"] for entry in entries)


def test_dashboard_counts_created_appointment(client):
    create(client)
    stats = client.get("/api/v1/dashboard/stats").json()
    assert stats["totalAppointmentRequests"] == 1
