"""User-related Pydantic schemas."""

from datetime import datetime
from uuid import UUID
from typing import Optional

from pydantic import BaseModel, EmailStr

from app.models.user import UserRole


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    role: UserRole
    password: Optional[str] = None
    employee_id: Optional[str] = None


class UserResponse(BaseModel):
    id: UUID
    username: str
    email: str
    role: UserRole
    is_blocked: bool
    employee_id: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    designation: Optional[str] = None
    department: Optional[str] = None
    division: Optional[str] = None
    office_location: Optional[str] = None
    employee_status: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    items: list[UserResponse]
    total: int
    page: int
    page_size: int


class ImportEmployeeRequest(BaseModel):
    employee_ids: str  # comma-separated employee IDs
    role: UserRole = UserRole.user


class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    role: Optional[UserRole] = None
    password: Optional[str] = None
    employee_id: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    designation: Optional[str] = None
    department: Optional[str] = None
    division: Optional[str] = None
    office_location: Optional[str] = None
    is_blocked: Optional[bool] = None
