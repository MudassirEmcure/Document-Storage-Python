"""Document-related Pydantic schemas."""

from datetime import date, datetime
from uuid import UUID
from typing import Optional

from pydantic import BaseModel


class DocumentResponse(BaseModel):
    id: UUID
    document_name: str
    company_id: UUID
    bank_id: UUID
    facility_id: UUID
    company_name: Optional[str] = None
    bank_name: Optional[str] = None
    facility_name: Optional[str] = None
    expiry_date: date
    file_name: str
    mime_type: str
    file_size_bytes: int
    uploaded_by: UUID
    uploader_name: Optional[str] = None
    uploader_email: Optional[str] = None
    uploaded_at: datetime

    class Config:
        from_attributes = True


class DocumentListResponse(BaseModel):
    items: list[DocumentResponse]
    total: int
    page: int
    page_size: int
