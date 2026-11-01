from uuid import UUID

from fastapi import APIRouter, Depends, File, Query, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import get_settings
from app.core.errors import AppError
from app.db import models
from app.db.session import get_db
from app.schemas.documents import DocumentRead
from app.services import document_service
from app.services.ai_service import AIService, get_ai_service

router = APIRouter(prefix="/api/v1/documents", tags=["documents"])
WITH_ITEMS = selectinload(models.DocumentJob.items)


@router.post("", response_model=DocumentRead, status_code=201)
async def upload_document(file: UploadFile = File(...), db: Session = Depends(get_db)):
    return await document_service.create_document_job(db, file, get_settings().max_upload_size_mb)


@router.post("/generate", response_model=DocumentRead, status_code=201)
async def generate_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    ai: AIService = Depends(get_ai_service),
):
    """Upload a PDF, extract its text, and let the AI propose items for review."""
    return await document_service.generate_document_job(db, file, get_settings().max_upload_size_mb, ai)


@router.get("", response_model=list[DocumentRead])
def list_documents(limit: int = Query(default=50, ge=1, le=200), db: Session = Depends(get_db)):
    statement = (
        select(models.DocumentJob)
        .options(WITH_ITEMS)
        .order_by(models.DocumentJob.created_at.desc())
        .limit(limit)
    )
    return list(db.scalars(statement))


@router.get("/{document_id}", response_model=DocumentRead)
def get_document(document_id: UUID, db: Session = Depends(get_db)):
    job = db.get(models.DocumentJob, str(document_id), options=[WITH_ITEMS])
    if job is None:
        raise AppError("NOT_FOUND", "Document not found.", 404)
    return job