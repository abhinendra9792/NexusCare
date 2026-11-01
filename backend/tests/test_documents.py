import pymupdf

URL = "/api/v1/documents"
FICTIONAL_TEXT = "Fictional referral letter. Follow-up appointment requested for 3 November 2026."


def make_pdf(text: str | None = FICTIONAL_TEXT) -> bytes:
    document = pymupdf.open()
    page = document.new_page()
    if text:
        page.insert_text((72, 72), text)
    data = document.tobytes()
    document.close()
    return data


def upload(client, data: bytes, name: str = "referral.pdf", content_type: str = "application/pdf"):
    return client.post(URL, files={"file": (name, data, content_type)})


def test_valid_pdf_creates_a_document_job(client):
    response = upload(client, make_pdf())
    assert response.status_code == 201
    body = response.json()
    assert body["originalFilename"] == "referral.pdf"
    assert body["pageCount"] == 1
    assert body["extractedCharCount"] > 0
    assert "Fictional referral letter" in body["textPreview"]
    assert body["status"] == "draft"
    assert body["items"] == []


def test_rejects_non_pdf_file(client):
    response = upload(client, b"plain text", name="notes.txt", content_type="text/plain")
    assert response.status_code == 415


def test_rejects_fake_pdf(client):
    response = upload(client, b"MZ this is not really a pdf", name="trick.pdf")
    assert response.status_code == 415
    assert response.json()["error"]["code"] == "UNSUPPORTED_FILE_TYPE"


def test_rejects_pdf_without_text(client):
    response = upload(client, make_pdf(text=None))
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "NO_TEXT_FOUND"


def test_rejects_empty_file(client):
    response = upload(client, b"")
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "EMPTY_FILE"


def test_rejects_oversized_file(client):
    too_big = b"%PDF" + b"0" * (5 * 1024 * 1024)
    response = upload(client, too_big)
    assert response.status_code == 413


def test_folder_path_is_removed_from_filename(client):
    response = upload(client, make_pdf(), name="../../secret/referral.pdf")
    assert response.status_code == 201
    assert response.json()["originalFilename"] == "referral.pdf"


def test_uploaded_documents_are_listed(client):
    created = upload(client, make_pdf()).json()
    listed = client.get(URL).json()
    assert [item["id"] for item in listed] == [created["id"]]