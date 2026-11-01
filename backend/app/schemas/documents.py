from app.db.enums import DocumentItemType, RecordStatus
from app.schemas.common import CamelModel, UtcDatetime


class ExtractedItemRead(CamelModel):
    id: str
    item_type: DocumentItemType
    draft_content: dict
    approved_content: dict | None
    status: RecordStatus
    approved_at: UtcDatetime | None


class DocumentRead(CamelModel):
    id: str
    created_at: UtcDatetime
    updated_at: UtcDatetime
    original_filename: str
    file_size_bytes: int
    page_count: int | None
    extracted_char_count: int | None
    text_preview: str | None
    status: RecordStatus
    ai_model: str | None
    error_message: str | None
    items: list[ExtractedItemRead]