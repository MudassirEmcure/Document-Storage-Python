"""Audit log router (Admin only, read-only)."""

import csv
import io
from datetime import date
from uuid import UUID
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.user import User, UserRole
from app.models.audit import AuditLog
from app.schemas.audit import AuditLogResponse, AuditLogListResponse
from app.dependencies import require_role

router = APIRouter(prefix="/audit-logs", tags=["audit"])


@router.get("", response_model=AuditLogListResponse)
async def list_audit_logs(
    actor_id: Optional[UUID] = None,
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    """List audit logs with filters. Admin only."""
    offset = (page - 1) * page_size
    query = select(AuditLog)
    count_query = select(func.count(AuditLog.id))

    if actor_id:
        query = query.where(AuditLog.actor_id == actor_id)
        count_query = count_query.where(AuditLog.actor_id == actor_id)
    if action:
        query = query.where(AuditLog.action == action)
        count_query = count_query.where(AuditLog.action == action)
    if entity_type:
        query = query.where(AuditLog.entity_type == entity_type)
        count_query = count_query.where(AuditLog.entity_type == entity_type)
    if date_from:
        query = query.where(func.date(AuditLog.created_at) >= date_from)
        count_query = count_query.where(func.date(AuditLog.created_at) >= date_from)
    if date_to:
        query = query.where(func.date(AuditLog.created_at) <= date_to)
        count_query = count_query.where(func.date(AuditLog.created_at) <= date_to)

    total_result = await db.execute(count_query)
    total = total_result.scalar()

    result = await db.execute(
        query.order_by(AuditLog.created_at.desc()).offset(offset).limit(page_size)
    )
    logs = result.scalars().all()

    items = [AuditLogResponse.model_validate(log) for log in logs]
    return AuditLogListResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/export")
async def export_audit_logs(
    actor_id: Optional[UUID] = None,
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    """Export filtered audit logs as CSV. Admin only."""
    query = select(AuditLog)

    if actor_id:
        query = query.where(AuditLog.actor_id == actor_id)
    if action:
        query = query.where(AuditLog.action == action)
    if entity_type:
        query = query.where(AuditLog.entity_type == entity_type)
    if date_from:
        query = query.where(func.date(AuditLog.created_at) >= date_from)
    if date_to:
        query = query.where(func.date(AuditLog.created_at) <= date_to)

    result = await db.execute(query.order_by(AuditLog.created_at.desc()))
    logs = result.scalars().all()

    # Build CSV
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Actor ID", "Actor Email", "Action", "Entity Type", "Entity ID", "Metadata", "Created At"])

    for log in logs:
        writer.writerow([
            str(log.id),
            str(log.actor_id) if log.actor_id else "",
            log.actor_email or "",
            log.action,
            log.entity_type or "",
            str(log.entity_id) if log.entity_id else "",
            str(log.metadata_) if log.metadata_ else "",
            str(log.created_at),
        ])

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="audit_logs.csv"'},
    )
