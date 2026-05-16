"""Document ORM model."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column, String, Boolean, ForeignKey, DateTime, Date, BigInteger, LargeBinary
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_name = Column(String(500), nullable=False)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False)
    bank_id = Column(UUID(as_uuid=True), ForeignKey("banks.id"), nullable=False)
    facility_id = Column(UUID(as_uuid=True), ForeignKey("facilities.id"), nullable=False)
    expiry_date = Column(Date, nullable=False)
    file_data = Column(LargeBinary, nullable=False)
    file_name = Column(String(500), nullable=False)
    mime_type = Column(String(255), nullable=False)
    file_size_bytes = Column(BigInteger, nullable=False)
    is_deleted = Column(Boolean, nullable=False, default=False)
    deleted_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    uploaded_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    # Relationships
    company = relationship("Company", lazy="selectin")
    bank = relationship("Bank", lazy="selectin")
    facility = relationship("Facility", lazy="selectin")
    uploader = relationship("User", foreign_keys=[uploaded_by], lazy="selectin")
