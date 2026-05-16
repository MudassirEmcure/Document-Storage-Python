"""Master (Company, Bank, Facility) Pydantic schemas."""

from datetime import datetime
from uuid import UUID
from typing import Optional

from pydantic import BaseModel


class MasterCreate(BaseModel):
    name: str
    code: str


class MasterUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    is_active: Optional[bool] = None


class CompanyResponse(BaseModel):
    id: UUID
    name: str
    code: str
    is_active: bool
    created_by: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BankResponse(BaseModel):
    id: UUID
    name: str
    code: str
    is_active: bool
    created_by: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class FacilityResponse(BaseModel):
    id: UUID
    name: str
    code: str
    is_active: bool
    created_by: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MasterListResponse(BaseModel):
    items: list
    total: int
    page: int
    page_size: int
