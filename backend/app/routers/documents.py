"""Documents router: upload, list, search, download, soft-delete."""

from datetime import datetime, timezone
from uuid import UUID
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.user import User, UserRole
from app.models.document import Document
from app.schemas.document import DocumentResponse, DocumentListResponse
from app.dependencies import require_role, get_current_user
from app.services.audit_service import log_audit
from app.services.email_service import send_document_uploaded_email, send_document_deleted_email

router = APIRouter(prefix="/documents", tags=["documents"])


def _get_uploader_name(user) -> str:
    """Get full name from user object, fallback to email."""
    if user:
        parts = [user.first_name or "", user.last_name or ""]
        full_name = " ".join(p for p in parts if p).strip()
        return full_name if full_name else user.email
    return ""

MAX_FILE_SIZE = 100 * 1024 * 1024  # 100 MB


@router.get("/hierarchy")
async def get_document_hierarchy(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get hierarchical view: Company → Banks → Facilities with document counts."""
    from app.models.masters import Company, Bank, Facility

    # Get all non-deleted documents with their relationships
    result = await db.execute(
        select(Document).where(Document.is_deleted == False)
    )
    documents = result.scalars().all()

    # Build hierarchy: company_id -> bank_id -> facility_id -> [docs]
    hierarchy = {}
    for doc in documents:
        comp_id = str(doc.company_id)
        bank_id = str(doc.bank_id)
        fac_id = str(doc.facility_id)

        if comp_id not in hierarchy:
            hierarchy[comp_id] = {
                "id": comp_id,
                "name": doc.company.name if doc.company else "Unknown",
                "code": doc.company.code if doc.company else "",
                "banks": {},
                "doc_count": 0,
            }
        hierarchy[comp_id]["doc_count"] += 1

        banks = hierarchy[comp_id]["banks"]
        if bank_id not in banks:
            banks[bank_id] = {
                "id": bank_id,
                "name": doc.bank.name if doc.bank else "Unknown",
                "code": doc.bank.code if doc.bank else "",
                "facilities": {},
                "doc_count": 0,
            }
        banks[bank_id]["doc_count"] += 1

        facilities = banks[bank_id]["facilities"]
        if fac_id not in facilities:
            facilities[fac_id] = {
                "id": fac_id,
                "name": doc.facility.name if doc.facility else "Unknown",
                "code": doc.facility.code if doc.facility else "",
                "doc_count": 0,
            }
        facilities[fac_id]["doc_count"] += 1

    # Convert to list format
    result_list = []
    for comp in hierarchy.values():
        comp_entry = {**comp, "banks": []}
        for bank in comp["banks"].values():
            bank_entry = {**bank, "facilities": []}
            for fac in bank["facilities"].values():
                bank_entry["facilities"].append(fac)
            comp_entry["banks"].append(bank_entry)
        result_list.append(comp_entry)

    return result_list


@router.get("", response_model=DocumentListResponse)
async def list_documents(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all non-deleted documents, sorted by uploaded_at ASC."""
    offset = (page - 1) * page_size

    count_result = await db.execute(
        select(func.count(Document.id)).where(Document.is_deleted == False)
    )
    total = count_result.scalar()

    result = await db.execute(
        select(Document)
        .where(Document.is_deleted == False)
        .order_by(Document.uploaded_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    documents = result.scalars().all()

    items = []
    for doc in documents:
        items.append(DocumentResponse(
            id=doc.id,
            document_name=doc.document_name,
            company_id=doc.company_id,
            bank_id=doc.bank_id,
            facility_id=doc.facility_id,
            company_name=doc.company.name if doc.company else None,
            bank_name=doc.bank.name if doc.bank else None,
            facility_name=doc.facility.name if doc.facility else None,
            expiry_date=doc.expiry_date,
            file_name=doc.file_name,
            mime_type=doc.mime_type,
            file_size_bytes=doc.file_size_bytes,
            uploaded_by=doc.uploaded_by,
            uploader_name=_get_uploader_name(doc.uploader),
            uploader_email=doc.uploader.email if doc.uploader else None,
            uploaded_at=doc.uploaded_at,
        ))

    return DocumentListResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/search", response_model=DocumentListResponse)
async def search_documents(
    q: str = Query(..., min_length=1),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Search documents by name (case-insensitive ILIKE). Excludes soft-deleted."""
    offset = (page - 1) * page_size
    search_pattern = f"%{q}%"

    count_result = await db.execute(
        select(func.count(Document.id)).where(
            Document.is_deleted == False,
            Document.document_name.ilike(search_pattern),
        )
    )
    total = count_result.scalar()

    result = await db.execute(
        select(Document)
        .where(Document.is_deleted == False, Document.document_name.ilike(search_pattern))
        .order_by(Document.uploaded_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    documents = result.scalars().all()

    items = []
    for doc in documents:
        items.append(DocumentResponse(
            id=doc.id,
            document_name=doc.document_name,
            company_id=doc.company_id,
            bank_id=doc.bank_id,
            facility_id=doc.facility_id,
            company_name=doc.company.name if doc.company else None,
            bank_name=doc.bank.name if doc.bank else None,
            facility_name=doc.facility.name if doc.facility else None,
            expiry_date=doc.expiry_date,
            file_name=doc.file_name,
            mime_type=doc.mime_type,
            file_size_bytes=doc.file_size_bytes,
            uploaded_by=doc.uploaded_by,
            uploader_name=_get_uploader_name(doc.uploader),
            uploader_email=doc.uploader.email if doc.uploader else None,
            uploaded_at=doc.uploaded_at,
        ))

    return DocumentListResponse(items=items, total=total, page=page, page_size=page_size)


@router.post("", response_model=list[DocumentResponse], status_code=status.HTTP_201_CREATED)
async def upload_documents(
    request: Request,
    company_id: UUID = Form(...),
    bank_id: UUID = Form(...),
    facility_id: UUID = Form(...),
    files: list[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin, UserRole.user)),
):
    """Upload one or more documents. Each file can have its own expiry date.
    
    expiry_dates is sent as repeated form fields — one per file, in the same order.
    If only one expiry_date is provided, it applies to all files.
    """
    from datetime import date as date_type
    import os

    # Get expiry_dates from form (can be single value or list)
    form_data = await request.form()
    expiry_dates_raw = form_data.getlist("expiry_dates")
    
    # Fallback: also check for single "expiry_date" field for backward compatibility
    if not expiry_dates_raw:
        single_expiry = form_data.get("expiry_date")
        if single_expiry:
            expiry_dates_raw = [single_expiry] * len(files)

    if not expiry_dates_raw:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="expiry_dates required")

    # If fewer expiry dates than files, repeat the last one
    while len(expiry_dates_raw) < len(files):
        expiry_dates_raw.append(expiry_dates_raw[-1])

    # Parse all expiry dates
    parsed_expiry_dates = []
    for i, ed in enumerate(expiry_dates_raw[:len(files)]):
        try:
            parsed_expiry_dates.append(date_type.fromisoformat(str(ed)))
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid expiry_date for file {i+1}. Use YYYY-MM-DD.")

    uploaded_docs = []

    for i, file in enumerate(files):
        file_data = await file.read()
        file_size = len(file_data)

        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File '{file.filename}' exceeds 100 MB limit",
            )

        # Auto-capture document name from filename (without extension)
        original_filename = file.filename or "unknown"
        document_name = os.path.splitext(original_filename)[0]

        doc = Document(
            document_name=document_name,
            company_id=company_id,
            bank_id=bank_id,
            facility_id=facility_id,
            expiry_date=parsed_expiry_dates[i],
            file_data=file_data,
            file_name=original_filename,
            mime_type=file.content_type or "application/octet-stream",
            file_size_bytes=file_size,
            uploaded_by=current_user.id,
        )
        db.add(doc)
        await db.flush()
        await db.refresh(doc)

        await log_audit(db, "DOCUMENT_UPLOADED", actor_id=current_user.id, actor_email=current_user.email,
                        entity_type="document", entity_id=doc.id, metadata={"document_name": doc.document_name})

        uploaded_docs.append(doc)

    # Send email notification for all uploaded docs (non-blocking)
    try:
        admin_result = await db.execute(
            select(User).where(User.role == UserRole.admin, User.is_blocked == False)
        )
        admins = admin_result.scalars().all()
        recipients = list(set([a.email for a in admins] + [current_user.email]))

        for doc in uploaded_docs:
            await send_document_uploaded_email(
                to_emails=recipients,
                document_name=doc.document_name,
                company_name=doc.company.name if doc.company else "N/A",
                bank_name=doc.bank.name if doc.bank else "N/A",
                facility_name=doc.facility.name if doc.facility else "N/A",
                expiry_date=str(doc.expiry_date),
                uploaded_by=current_user.email,
                uploaded_at=str(doc.uploaded_at),
            )
    except Exception:
        pass  # Email failure should not block upload

    return [
        DocumentResponse(
            id=doc.id,
            document_name=doc.document_name,
            company_id=doc.company_id,
            bank_id=doc.bank_id,
            facility_id=doc.facility_id,
            company_name=doc.company.name if doc.company else None,
            bank_name=doc.bank.name if doc.bank else None,
            facility_name=doc.facility.name if doc.facility else None,
            expiry_date=doc.expiry_date,
            file_name=doc.file_name,
            mime_type=doc.mime_type,
            file_size_bytes=doc.file_size_bytes,
            uploaded_by=doc.uploaded_by,
            uploader_name=_get_uploader_name(current_user),
            uploader_email=current_user.email,
            uploaded_at=doc.uploaded_at,
        )
        for doc in uploaded_docs
    ]


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get document metadata."""
    result = await db.execute(
        select(Document).where(Document.id == document_id, Document.is_deleted == False)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    return DocumentResponse(
        id=doc.id,
        document_name=doc.document_name,
        company_id=doc.company_id,
        bank_id=doc.bank_id,
        facility_id=doc.facility_id,
        company_name=doc.company.name if doc.company else None,
        bank_name=doc.bank.name if doc.bank else None,
        facility_name=doc.facility.name if doc.facility else None,
        expiry_date=doc.expiry_date,
        file_name=doc.file_name,
        mime_type=doc.mime_type,
        file_size_bytes=doc.file_size_bytes,
        uploaded_by=doc.uploaded_by,
        uploader_name=_get_uploader_name(doc.uploader),
        uploader_email=doc.uploader.email if doc.uploader else None,
        uploaded_at=doc.uploaded_at,
    )


@router.get("/{document_id}/download")
async def download_document(
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Download document file. Force-download (Content-Disposition: attachment)."""
    result = await db.execute(
        select(Document).where(Document.id == document_id, Document.is_deleted == False)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    await log_audit(db, "DOCUMENT_DOWNLOADED", actor_id=current_user.id, actor_email=current_user.email,
                    entity_type="document", entity_id=doc.id, metadata={"document_name": doc.document_name})

    return StreamingResponse(
        BytesIO(doc.file_data),
        media_type=doc.mime_type,
        headers={"Content-Disposition": f'attachment; filename="{doc.file_name}"'},
    )


@router.get("/{document_id}/preview")
async def preview_document(
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Preview document file inline in the browser (Content-Disposition: inline)."""
    result = await db.execute(
        select(Document).where(Document.id == document_id, Document.is_deleted == False)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    return StreamingResponse(
        BytesIO(doc.file_data),
        media_type=doc.mime_type,
        headers={"Content-Disposition": f'inline; filename="{doc.file_name}"'},
    )


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def soft_delete_document(
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Soft-delete a document. Admin: any doc. User: own docs only. Viewer: forbidden."""
    if current_user.role == UserRole.viewer:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    result = await db.execute(
        select(Document).where(Document.id == document_id, Document.is_deleted == False)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    # User can only delete own documents
    if current_user.role == UserRole.user and doc.uploaded_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Can only delete your own documents")

    doc.is_deleted = True
    doc.deleted_by = current_user.id
    doc.deleted_at = datetime.now(timezone.utc)
    await db.flush()

    await log_audit(db, "DOCUMENT_SOFT_DELETED", actor_id=current_user.id, actor_email=current_user.email,
                    entity_type="document", entity_id=doc.id, metadata={"document_name": doc.document_name})

    # Send deletion email
    try:
        admin_result = await db.execute(
            select(User).where(User.role == UserRole.admin, User.is_blocked == False)
        )
        admins = admin_result.scalars().all()
        uploader_result = await db.execute(select(User).where(User.id == doc.uploaded_by))
        uploader = uploader_result.scalar_one_or_none()
        uploader_email = uploader.email if uploader else None

        recipients = list(set([a.email for a in admins] + ([uploader_email] if uploader_email else [])))

        await send_document_deleted_email(
            to_emails=recipients,
            document_name=doc.document_name,
            company_name=doc.company.name if doc.company else "N/A",
            bank_name=doc.bank.name if doc.bank else "N/A",
            facility_name=doc.facility.name if doc.facility else "N/A",
            deleted_by=current_user.email,
            deleted_at=str(doc.deleted_at),
        )
    except Exception:
        pass
