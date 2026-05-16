"""User, PasswordResetToken, and RefreshToken ORM models."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column, String, Boolean, Enum as SAEnum, ForeignKey, DateTime
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base

import enum


class UserRole(str, enum.Enum):
    admin = "admin"
    user = "user"
    viewer = "viewer"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(100), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=True)
    role = Column(SAEnum(UserRole, name="user_role_enum"), nullable=False)
    is_blocked = Column(Boolean, nullable=False, default=False)
    
    # Employee fields from Emcure API
    employee_id = Column(String(50), unique=True, nullable=True)
    first_name = Column(String(255), nullable=True)
    middle_name = Column(String(255), nullable=True)
    last_name = Column(String(255), nullable=True)
    designation = Column(String(500), nullable=True)
    department = Column(String(500), nullable=True)
    division = Column(String(500), nullable=True)
    business_unit = Column(String(500), nullable=True)
    office_location = Column(String(500), nullable=True)
    employee_status = Column(String(50), nullable=True)
    direct_manager_name = Column(String(255), nullable=True)
    direct_manager_email = Column(String(255), nullable=True)

    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    password_reset_tokens = relationship("PasswordResetToken", back_populates="user", cascade="all, delete-orphan")
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash = Column(String(255), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="password_reset_tokens")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash = Column(String(255), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="refresh_tokens")
