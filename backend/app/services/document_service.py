import pymupdf
from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.db import models
from app.db.enums import RecordStatus
from app.services.activity_service import log_activity

ENTITY_TYPE = "document_job"
MAX_PAGES = 20
PREVIEW_CHARS = 1000
PDF_CONTENT_TYPES = {"application/pdf", "application/x-pdf"}


def safe_filename(name: str | None) -> str:
    """Keep only the final file name; drop any folder path and unprintable characters."""
    base = (name or "document.pdf").replace("\\", "/").split("/")[-1]
    cleaned = "".join(char for char in base if char.isprintable()).strip()
    return (cleaned or "document.pdf")[:255]


def normalise_text(text: str) -> str:
    lines = (line.strip() for line in text.splitlines())
    return "\n".join(line for line in lines if line)


def extract_pdf_text(data: bytes) -> tuple[str, int]:
    try:
        document = pymupdf.open(stream=data, filetype="pdf")
    except Exception:
        raise AppError("UNREADABLE_PDF", "The PDF could not be read. It may be damaged.", 422) from None

    with document:
        if document.needs_pass:
            raise AppError("ENCRYPTED_PDF", "Password-protected PDFs are not supported.", 422)
        page_count = document.page_count
        if page_count > MAX_PAGES:
            raise AppError("TOO_MANY_PAGES", f"PDFs are limited to {MAX_PAGES} pages.", 422)
        text = "\n".join(page.get_text() for page in document)

    return normalise_text(text), page_count


async def create_document_job(db: Session, file: UploadFile, max_upload_mb: int) -> models.DocumentJob:
    filename = safe_filename(file.filename)
    if not filename.lower().endswith(".pdf"):
        raise AppError("UNSUPPORTED_FILE_TYPE", "Only PDF files are supported.", 415)
    if file.content_type and file.content_type not in PDF_CONTENT_TYPES:
        raise AppError("UNSUPPORTED_FILE_TYPE", "Only PDF files are supported.", 415)

    max_bytes = max_upload_mb * 1024 * 1024
    data = await file.read(max_bytes + 1)
    if len(data) > max_bytes:
        raise AppError("FILE_TOO_LARGE", f"The file is larger than {max_upload_mb} MB.", 413)
    if not data:
        raise AppError("EMPTY_FILE", "The file is empty.", 422)
    if not data.startswith(b"%PDF"):
        raise AppError("UNSUPPORTED_FILE_TYPE", "The file is not a valid PDF.", 415)

    text, page_count = extract_pdf_text(data)
    if not text:
        raise AppError(
            "NO_TEXT_FOUND",
            "No readable text was found. Scanned or image-only PDFs are not supported.",
            422,
        )

    job = models.DocumentJob(
        original_filename=filename,
        file_size_bytes=len(data),
        page_count=page_count,
        extracted_char_count=len(text),
        text_preview=text[:PREVIEW_CHARS],
        status=RecordStatus.DRAFT,
    )
    db.add(job)
    db.flush()
    log_activity(
        db,
        entity_type=ENTITY_TYPE,
        entity_id=job.id,
        action="uploaded",
        to_status=RecordStatus.DRAFT,
        summary=f"PDF uploaded ({page_count} pages, {len(text)} characters extracted)",
    )
    db.commit()
    db.refresh(job)
    _ = job.items  # load items while the database session is still open
    return job