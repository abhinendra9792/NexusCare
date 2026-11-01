VISIT_URL = "/api/v1/visit-summaries"
SERVICE_URL = "/api/v1/service-requests"
CARE_URL = "/api/v1/care-plans"

VISIT_NOTES = "Fictional visit notes: PT-0931 attended a routine review and asked for a report copy."
PROGRESS_NOTES = "Fictional progress notes: needs a follow-up in two weeks and a billing breakdown."


def test_visit_summary_create_list_and_get(client):
    created = client.post(VISIT_URL, json={"sourceText": VISIT_NOTES})
    assert created.status_code == 201
    body = created.json()
    assert body["status"] == "draft"
    assert body["approvedContent"] is None

    assert [item["id"] for item in client.get(VISIT_URL).json()] == [body["id"]]
    assert client.get(f"{VISIT_URL}/{body['id']}").status_code == 200


def test_visit_summary_rejects_short_notes(client):
    response = client.post(VISIT_URL, json={"sourceText": "too short"})
    assert response.status_code == 422


def test_visit_summary_cannot_be_cancelled_twice(client):
    record_id = client.post(VISIT_URL, json={"sourceText": VISIT_NOTES}).json()["id"]
    assert client.post(f"{VISIT_URL}/{record_id}/cancel").status_code == 200
    second = client.post(f"{VISIT_URL}/{record_id}/cancel")
    assert second.status_code == 409
    assert second.json()["error"]["code"] == "INVALID_TRANSITION"


def test_service_request_flags_possible_emergency(client):
    body = client.post(SERVICE_URL, json={"sourceText": "My father has chest pain right now"}).json()
    assert body["possibleEmergency"] is True


def test_service_request_normal_inquiry_is_not_flagged(client):
    body = client.post(SERVICE_URL, json={"sourceText": "I was charged twice for my visit"}).json()
    assert body["possibleEmergency"] is False
    assert body["category"] is None


def test_service_request_accepts_short_inquiry(client):
    response = client.post(SERVICE_URL, json={"sourceText": "Need a bill copy"})
    assert response.status_code == 201


def test_care_plan_created_with_title_and_no_tasks(client):
    response = client.post(CARE_URL, json={"sourceText": PROGRESS_NOTES, "title": "PT-1042 follow-up"})
    assert response.status_code == 201
    body = response.json()
    assert body["title"] == "PT-1042 follow-up"
    assert body["tasks"] == []
    assert client.get(f"{CARE_URL}/{body['id']}").json()["tasks"] == []


def test_activity_never_contains_source_text(client):
    client.post(VISIT_URL, json={"sourceText": VISIT_NOTES})
    client.post(SERVICE_URL, json={"sourceText": "My father has chest pain right now"})
    client.post(CARE_URL, json={"sourceText": PROGRESS_NOTES})

    entries = client.get("/api/v1/activity").json()
    assert len(entries) == 3
    for entry in entries:
        assert "PT-0931" not in entry["summary"]
        assert "chest pain" not in entry["summary"]
        assert "billing" not in entry["summary"]