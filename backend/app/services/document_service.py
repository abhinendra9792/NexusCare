from dataclasses import dataclass
from datetime import date

import pymupdf
from fastapi import UploadFile
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from app.core.errors import AppError
from app.db import models
from app.db.enums import DocumentItemType, RecordStatus
from app.prompts import document as document_prompt
from app.schemas.ai_outputs import DocumentExtraction
from app.services import record_service
from app.services.activity_service import log_activity
from app.services.ai_service import AIService

ENTITY_TYPE = "document_job"
LABEL = "Document"
MAX_PAGES = 20
PREVIEW_CHARS = 1000
MAX_AI_CHARS = 30_000
PDF_CONTENT_TYPES = {"application/pdf", "application/x-pdf"}


@dataclass
class ExtractedPdf:
    filename: str
    size_bytes: int
    page_count: int
    text: str


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


async def read_and_extract(file: UploadFile, max_upload_mb: int) -> ExtractedPdf:
    """Validate the upload and extract its text in memory. The file is never written to disk."""
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
    return ExtractedPdf(filename=filename, size_bytes=len(data), page_count=page_count, text=text)


def _create_job(db: Session, pdf: ExtractedPdf) -> models.DocumentJob:
    job = models.DocumentJob(
        original_filename=pdf.filename,
        file_size_bytes=pdf.size_bytes,
        page_count=pdf.page_count,
        extracted_char_count=len(pdf.text),
        text_preview=pdf.text[:PREVIEW_CHARS],
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
        summary=f"PDF uploaded ({pdf.page_count} pages, {len(pdf.text)} characters extracted)",
    )
    db.commit()
    db.refresh(job)
    return job


async def create_document_job(db: Session, file: UploadFile, max_upload_mb: int) -> models.DocumentJob:
    """Upload and extract only, without AI."""
    pdf = await read_and_extract(file, max_upload_mb)
    job = _create_job(db, pdf)
    _ = job.items  # load items while the database session is still open
    return job


async def generate_document_job(
    db: Session, file: UploadFile, max_upload_mb: int, ai: AIService
) -> models.DocumentJob:
    """Upload, extract, then let the AI propose items for review.

    The full text is not stored, so a failed job cannot be retried: upload the PDF again.
    """
    pdf = await read_and_extract(file, max_upload_mb)
    job = _create_job(db, pdf)

    text_for_ai = pdf.text[:MAX_AI_CHARS]
    truncated = len(pdf.text) > MAX_AI_CHARS

    def store_items(record: models.DocumentJob, result: DocumentExtraction) -> None:
        for appointment in result.appointments:
            record.items.append(
                models.ExtractedDocumentItem(
                    item_type=DocumentItemType.APPOINTMENT,
                    draft_content=appointment.model_dump(mode="json"),
                )
            )
        for action in result.follow_up_actions:
            record.items.append(
                models.ExtractedDocumentItem(
                    item_type=DocumentItemType.FOLLOW_UP,
                    draft_content=action.model_dump(mode="json"),
                )
            )
        record.ai_metadata = {
            **(record.ai_metadata or {}),
            "missing_information": result.missing_information,
            "text_truncated": truncated,
        }

    # The Gemini call can take many seconds; run it in a worker thread so the server stays responsive.
    job = await run_in_threadpool(
        record_service.run_ai_generation,
        db,
        job,
        ai,
        entity_type=ENTITY_TYPE,
        label=LABEL,
        schema=DocumentExtraction,
        system_instruction=document_prompt.SYSTEM_INSTRUCTION,
        prompt=document_prompt.build_prompt(text_for_ai, date.today()),
        prompt_version=document_prompt.PROMPT_VERSION,
        apply_result=store_items,
    )
    _ = job.items
    return job