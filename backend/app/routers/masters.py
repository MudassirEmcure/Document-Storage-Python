"""Masters router: Companies, Banks, Facilities CRUD."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.user import User, UserRole
from app.models.masters import Company, Bank, Facility
from app.models.document import Document
from app.schemas.masters import MasterCreate, MasterUpdate, CompanyResponse, BankResponse, FacilityResponse
from app.dependencies import require_role, get_current_user
from app.services.audit_service import log_audit

router = APIRouter(prefix="/masters", tags=["masters"])


# ==================== COMPANIES ====================

@router.get("/companies", response_model=list[CompanyResponse])
async def list_companies(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List companies. Admin sees all; others see only active."""
    query = select(Company)
    if current_user.role != UserRole.admin:
        query = query.where(Company.is_active == True)
    result = await db.execute(query.order_by(Company.name))
    return [CompanyResponse.model_validate(c) for c in result.scalars().all()]


@router.post("/companies", response_model=CompanyResponse, status_code=status.HTTP_201_CREATED)
async def create_company(
    body: MasterCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.user)),
):
    """Create a company. Admin and User roles."""
    # Check code uniqueness
    existing = await db.execute(select(Company).where(Company.code == body.code))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Company code already exists")

    company = Company(name=body.name, code=body.code, created_by=current_user.id)
    db.add(company)
    await db.flush()
    await db.refresh(company)

    await log_audit(db, "COMPANY_CREATED", actor_id=current_user.id, actor_email=current_user.email,
                    entity_type="company", entity_id=company.id, metadata={"name": company.name, "code": company.code})

    return CompanyResponse.model_validate(company)


@router.patch("/companies/{company_id}", response_model=CompanyResponse)
async def update_company(
    company_id: UUID,
    body: MasterUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    """Update a company. Admin only."""
    result = await db.execute(select(Company).where(Company.id == company_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")

    if body.name is not None:
        company.name = body.name
    if body.code is not None:
        # Check uniqueness
        existing = await db.execute(select(Company).where(Company.code == body.code, Company.id != company_id))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Company code already exists")
        company.code = body.code
    if body.is_active is not None:
        company.is_active = body.is_active

    await db.flush()
    await db.refresh(company)

    await log_audit(db, "COMPANY_UPDATED", actor_id=current_user.id, actor_email=current_user.email,
                    entity_type="company", entity_id=company.id, metadata={"name": company.name})

    return CompanyResponse.model_validate(company)


@router.delete("/companies/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_company(
    company_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    """Hard delete a company. Only if no documents linked (including soft-deleted)."""
    result = await db.execute(select(Company).where(Company.id == company_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")

    # Check for linked documents
    doc_count = await db.execute(
        select(func.count(Document.id)).where(Document.company_id == company_id)
    )
    if doc_count.scalar() > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete: documents are linked to this record.",
        )

    await log_audit(db, "COMPANY_DELETED", actor_id=current_user.id, actor_email=current_user.email,
                    entity_type="company", entity_id=company.id, metadata={"name": company.name, "code": company.code})

    await db.delete(company)


# ==================== BANKS ====================

@router.get("/banks", response_model=list[BankResponse])
async def list_banks(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Bank)
    if current_user.role != UserRole.admin:
        query = query.where(Bank.is_active == True)
    result = await db.execute(query.order_by(Bank.name))
    return [BankResponse.model_validate(b) for b in result.scalars().all()]


@router.post("/banks", response_model=BankResponse, status_code=status.HTTP_201_CREATED)
async def create_bank(
    body: MasterCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.user)),
):
    existing = await db.execute(select(Bank).where(Bank.code == body.code))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Bank code already exists")

    bank = Bank(name=body.name, code=body.code, created_by=current_user.id)
    db.add(bank)
    await db.flush()
    await db.refresh(bank)

    await log_audit(db, "BANK_CREATED", actor_id=current_user.id, actor_email=current_user.email,
                    entity_type="bank", entity_id=bank.id, metadata={"name": bank.name, "code": bank.code})

    return BankResponse.model_validate(bank)


@router.patch("/banks/{bank_id}", response_model=BankResponse)
async def update_bank(
    bank_id: UUID,
    body: MasterUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    result = await db.execute(select(Bank).where(Bank.id == bank_id))
    bank = result.scalar_one_or_none()
    if not bank:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bank not found")

    if body.name is not None:
        bank.name = body.name
    if body.code is not None:
        existing = await db.execute(select(Bank).where(Bank.code == body.code, Bank.id != bank_id))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Bank code already exists")
        bank.code = body.code
    if body.is_active is not None:
        bank.is_active = body.is_active

    await db.flush()
    await db.refresh(bank)

    await log_audit(db, "BANK_UPDATED", actor_id=current_user.id, actor_email=current_user.email,
                    entity_type="bank", entity_id=bank.id, metadata={"name": bank.name})

    return BankResponse.model_validate(bank)


@router.delete("/banks/{bank_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_bank(
    bank_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    result = await db.execute(select(Bank).where(Bank.id == bank_id))
    bank = result.scalar_one_or_none()
    if not bank:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bank not found")

    doc_count = await db.execute(
        select(func.count(Document.id)).where(Document.bank_id == bank_id)
    )
    if doc_count.scalar() > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete: documents are linked to this record.",
        )

    await log_audit(db, "BANK_DELETED", actor_id=current_user.id, actor_email=current_user.email,
                    entity_type="bank", entity_id=bank.id, metadata={"name": bank.name, "code": bank.code})

    await db.delete(bank)


# ==================== FACILITIES ====================

@router.get("/facilities", response_model=list[FacilityResponse])
async def list_facilities(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Facility)
    if current_user.role != UserRole.admin:
        query = query.where(Facility.is_active == True)
    result = await db.execute(query.order_by(Facility.name))
    return [FacilityResponse.model_validate(f) for f in result.scalars().all()]


@router.post("/facilities", response_model=FacilityResponse, status_code=status.HTTP_201_CREATED)
async def create_facility(
    body: MasterCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.user)),
):
    existing = await db.execute(select(Facility).where(Facility.code == body.code))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Facility code already exists")

    facility = Facility(name=body.name, code=body.code, created_by=current_user.id)
    db.add(facility)
    await db.flush()
    await db.refresh(facility)

    await log_audit(db, "FACILITY_CREATED", actor_id=current_user.id, actor_email=current_user.email,
                    entity_type="facility", entity_id=facility.id, metadata={"name": facility.name, "code": facility.code})

    return FacilityResponse.model_validate(facility)


@router.patch("/facilities/{facility_id}", response_model=FacilityResponse)
async def update_facility(
    facility_id: UUID,
    body: MasterUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    result = await db.execute(select(Facility).where(Facility.id == facility_id))
    facility = result.scalar_one_or_none()
    if not facility:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Facility not found")

    if body.name is not None:
        facility.name = body.name
    if body.code is not None:
        existing = await db.execute(select(Facility).where(Facility.code == body.code, Facility.id != facility_id))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Facility code already exists")
        facility.code = body.code
    if body.is_active is not None:
        facility.is_active = body.is_active

    await db.flush()
    await db.refresh(facility)

    await log_audit(db, "FACILITY_UPDATED", actor_id=current_user.id, actor_email=current_user.email,
                    entity_type="facility", entity_id=facility.id, metadata={"name": facility.name})

    return FacilityResponse.model_validate(facility)


@router.delete("/facilities/{facility_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_facility(
    facility_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    result = await db.execute(select(Facility).where(Facility.id == facility_id))
    facility = result.scalar_one_or_none()
    if not facility:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Facility not found")

    doc_count = await db.execute(
        select(func.count(Document.id)).where(Document.facility_id == facility_id)
    )
    if doc_count.scalar() > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete: documents are linked to this record.",
        )

    await log_audit(db, "FACILITY_DELETED", actor_id=current_user.id, actor_email=current_user.email,
                    entity_type="facility", entity_id=facility.id, metadata={"name": facility.name, "code": facility.code})

    await db.delete(facility)
