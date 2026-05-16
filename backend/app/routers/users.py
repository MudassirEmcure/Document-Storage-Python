"""User management router (Admin only)."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserResponse, UserListResponse, ImportEmployeeRequest, UserUpdate
from app.dependencies import require_role
from app.services.auth_service import hash_password
from app.services.audit_service import log_audit
from app.services.employee_service import fetch_employee_data, extract_user_fields

router = APIRouter(prefix="/users", tags=["users"])

DEFAULT_PASSWORD = "Emcure@12345"


@router.get("", response_model=UserListResponse)
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    """List all users (paginated). Admin only."""
    offset = (page - 1) * page_size

    count_result = await db.execute(select(func.count(User.id)))
    total = count_result.scalar()

    result = await db.execute(
        select(User).order_by(User.created_at.desc()).offset(offset).limit(page_size)
    )
    users = result.scalars().all()

    return UserListResponse(
        items=[UserResponse.model_validate(u) for u in users],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    body: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    """Create a new user. Admin only. Password defaults to Emcure@12345 if not provided."""
    # Check uniqueness
    existing = await db.execute(
        select(User).where((User.username == body.username) | (User.email == body.email))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username or email already exists")

    # Use provided password or default
    pwd = body.password if body.password else DEFAULT_PASSWORD
    password_hash = hash_password(pwd)

    user = User(
        username=body.username,
        email=body.email,
        role=body.role,
        password_hash=password_hash,
        employee_id=body.employee_id,
        created_by=current_user.id,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    await log_audit(db, "USER_CREATED", actor_id=current_user.id, actor_email=current_user.email,
                    entity_type="user", entity_id=user.id, metadata={"username": user.username})

    return UserResponse.model_validate(user)


@router.post("/import", response_model=list[UserResponse], status_code=status.HTTP_201_CREATED)
async def import_employees(
    body: ImportEmployeeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    """Import users from Emcure Employee API by comma-separated employee IDs.
    
    All imported users get role='user' and password='Emcure@12345'.
    Skips employees that are already imported.
    """
    raw_ids = [eid.strip() for eid in body.employee_ids.split(",") if eid.strip()]
    if not raw_ids:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No employee IDs provided")

    imported_users = []
    errors = []

    for emp_id in raw_ids:
        # Check if already exists
        existing = await db.execute(select(User).where(User.employee_id == emp_id))
        if existing.scalar_one_or_none():
            errors.append(f"{emp_id}: already imported")
            continue

        # Fetch from Emcure API
        emp_data = await fetch_employee_data(emp_id)
        if not emp_data:
            errors.append(f"{emp_id}: not found in Emcure system")
            continue

        fields = extract_user_fields(emp_data)

        # Check email uniqueness
        email = fields["email"] or f"{emp_id}@emcure.com"
        existing_email = await db.execute(select(User).where(User.email == email))
        if existing_email.scalar_one_or_none():
            email = f"{emp_id}@emcure.com"  # fallback email

        user = User(
            username=emp_id,
            email=email,
            role=body.role,
            password_hash=hash_password(DEFAULT_PASSWORD),
            employee_id=fields["employee_id"],
            first_name=fields["first_name"],
            middle_name=fields["middle_name"],
            last_name=fields["last_name"],
            designation=fields["designation"],
            department=fields["department"],
            division=fields["division"],
            business_unit=fields["business_unit"],
            office_location=fields["office_location"],
            employee_status=fields["employee_status"],
            direct_manager_name=fields["direct_manager_name"],
            direct_manager_email=fields["direct_manager_email"],
            created_by=current_user.id,
        )
        db.add(user)
        await db.flush()
        await db.refresh(user)

        await log_audit(db, "USER_CREATED", actor_id=current_user.id, actor_email=current_user.email,
                        entity_type="user", entity_id=user.id,
                        metadata={"username": user.username, "employee_id": emp_id, "source": "emcure_api"})

        imported_users.append(user)

    if not imported_users and errors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No users imported. Issues: {'; '.join(errors)}",
        )

    return [UserResponse.model_validate(u) for u in imported_users]


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    body: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    """Update a user. Admin only."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Check uniqueness if username/email changed
    if body.username and body.username != user.username:
        existing = await db.execute(select(User).where(User.username == body.username))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists")
        user.username = body.username

    if body.email and body.email != user.email:
        existing = await db.execute(select(User).where(User.email == body.email))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")
        user.email = body.email

    if body.role is not None:
        user.role = body.role
    if body.password:
        user.password_hash = hash_password(body.password)
    if body.employee_id is not None:
        user.employee_id = body.employee_id
    if body.first_name is not None:
        user.first_name = body.first_name
    if body.last_name is not None:
        user.last_name = body.last_name
    if body.designation is not None:
        user.designation = body.designation
    if body.department is not None:
        user.department = body.department
    if body.division is not None:
        user.division = body.division
    if body.office_location is not None:
        user.office_location = body.office_location
    if body.is_blocked is not None:
        if user_id == current_user.id and body.is_blocked:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot block yourself")
        user.is_blocked = body.is_blocked

    await db.flush()
    await db.refresh(user)

    await log_audit(db, "USER_UPDATED", actor_id=current_user.id, actor_email=current_user.email,
                    entity_type="user", entity_id=user.id, metadata={"username": user.username})

    return UserResponse.model_validate(user)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    """Get user details. Admin only."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserResponse.model_validate(user)


@router.patch("/{user_id}/block", response_model=UserResponse)
async def block_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    """Block a user. Admin only. Cannot block self."""
    if user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot block yourself")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.is_blocked = True
    await db.flush()
    await db.refresh(user)

    await log_audit(db, "USER_BLOCKED", actor_id=current_user.id, actor_email=current_user.email,
                    entity_type="user", entity_id=user.id, metadata={"username": user.username})

    return UserResponse.model_validate(user)


@router.patch("/{user_id}/unblock", response_model=UserResponse)
async def unblock_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    """Unblock a user. Admin only."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.is_blocked = False
    await db.flush()
    await db.refresh(user)

    await log_audit(db, "USER_UNBLOCKED", actor_id=current_user.id, actor_email=current_user.email,
                    entity_type="user", entity_id=user.id, metadata={"username": user.username})

    return UserResponse.model_validate(user)
