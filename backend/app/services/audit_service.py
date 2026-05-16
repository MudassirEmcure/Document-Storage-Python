"""Audit logging service — writes immutable audit entries."""

from typing import Optional, Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog


async def log_audit(
    db: AsyncSession,
    action: str,
    actor_id: Optional[UUID] = None,
    actor_email: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[UUID] = None,
    metadata: Optional[dict[str, Any]] = None,
) -> None:
    """Insert an audit log entry. This is append-only."""
    entry = AuditLog(
        actor_id=actor_id,
        actor_email=actor_email,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        metadata_=metadata,
    )
    db.add(entry)
    await db.flush()
