def test_timestamps_are_returned_in_utc(client):
    body = client.post(
        "/api/v1/appointments",
        json={"sourceText": "Fictional note asking for a follow-up visit.", "sourceType": "text"},
    ).json()
    assert body["createdAt"].endswith("Z")
    activity = client.get("/api/v1/activity").json()
    assert activity[0]["createdAt"].endswith("Z")
