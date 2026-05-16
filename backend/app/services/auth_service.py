"""Authentication service: JWT creation, password hashing, token management."""

import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID

from jose import jwt
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.config import get_settings
from app.models.user import User, RefreshToken, PasswordResetToken

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(user: User) -> str:
    """Create a short-lived JWT access token."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    # Build display name
    name_parts = [user.first_name or "", user.last_name or ""]
    full_name = " ".join(p for p in name_parts if p).strip() or user.username
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "name": full_name,
        "role": user.role.value,
        "exp": expire,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")


def create_refresh_token_value() -> str:
    """Generate a cryptographically secure random refresh token."""
    return secrets.token_urlsafe(32)


async def store_refresh_token(db: AsyncSession, user_id: UUID, token_value: str) -> None:
    """Hash and store a refresh token in the database."""
    token_hash = pwd_context.hash(token_value)
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    rt = RefreshToken(
        user_id=user_id,
        token_hash=token_hash,
        expires_at=expires_at,
    )
    db.add(rt)
    await db.flush()


async def validate_refresh_token(db: AsyncSession, user_id: UUID, token_value: str) -> RefreshToken | None:
    """Find a valid (non-revoked, non-expired) refresh token for the user."""
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.user_id == user_id,
            RefreshToken.revoked == False,
            RefreshToken.expires_at > datetime.now(timezone.utc),
        )
    )
    tokens = result.scalars().all()
    for rt in tokens:
        if pwd_context.verify(token_value, rt.token_hash):
            return rt
    return None


async def revoke_refresh_token(db: AsyncSession, token_id: UUID) -> None:
    """Revoke a specific refresh token."""
    await db.execute(
        update(RefreshToken).where(RefreshToken.id == token_id).values(revoked=True)
    )


async def revoke_all_refresh_tokens(db: AsyncSession, user_id: UUID) -> None:
    """Revoke all refresh tokens for a user."""
    await db.execute(
        update(RefreshToken).where(
            RefreshToken.user_id == user_id,
            RefreshToken.revoked == False,
        ).values(revoked=True)
    )


def generate_password_reset_token() -> str:
    """Generate a URL-safe password reset token."""
    return secrets.token_urlsafe(32)


async def store_password_reset_token(db: AsyncSession, user_id: UUID, token_value: str) -> None:
    """Store a hashed password reset token."""
    token_hash = pwd_context.hash(token_value)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    prt = PasswordResetToken(
        user_id=user_id,
        token_hash=token_hash,
        expires_at=expires_at,
    )
    db.add(prt)
    await db.flush()


async def validate_password_reset_token(db: AsyncSession, token_value: str) -> PasswordResetToken | None:
    """Find a valid (unused, non-expired) password reset token."""
    result = await db.execute(
        select(PasswordResetToken).where(
            PasswordResetToken.used == False,
            PasswordResetToken.expires_at > datetime.now(timezone.utc),
        )
    )
    tokens = result.scalars().all()
    for prt in tokens:
        if pwd_context.verify(token_value, prt.token_hash):
            return prt
    return None
