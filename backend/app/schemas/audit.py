"""Audit log Pydantic schemas."""

from datetime import datetime
from uuid import UUID
from typing import Optional, Any

from pydantic import BaseModel


class AuditLogResponse(BaseModel):
    id: UUID
    actor_id: Optional[UUID] = None
    actor_email: Optional[str] = None
    action: str
    entity_type: Optional[str] = None
    entity_id: Optional[UUID] = None
    metadata_: Optional[dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AuditLogListResponse(BaseModel):
    items: list[AuditLogResponse]
    total: int
    page: int
    page_size: int
