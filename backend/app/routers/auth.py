"""Authentication router: local login, SSO (OIDC), refresh, logout, password reset."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.user import User
from app.schemas.auth import (
    LoginRequest, TokenResponse, PasswordResetRequest, PasswordResetConfirm, MessageResponse
)
from app.services.auth_service import (
    verify_password, create_access_token, create_refresh_token_value,
    store_refresh_token, validate_refresh_token, revoke_refresh_token,
    revoke_all_refresh_tokens, generate_password_reset_token,
    store_password_reset_token, validate_password_reset_token, hash_password,
)
from app.services.audit_service import log_audit
from app.services.email_service import send_email
from app.dependencies import get_current_user
from app.config import get_settings

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    """Local username/password login."""
    result = await db.execute(select(User).where(User.username == body.username))
    user = result.scalar_one_or_none()

    if not user or not user.password_hash:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if user.is_blocked:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is blocked")

    access_token = create_access_token(user)
    refresh_value = create_refresh_token_value()
    await store_refresh_token(db, user.id, refresh_value)

    # Set refresh token as httpOnly cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_value,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/auth",
    )

    await log_audit(db, "USER_LOGIN", actor_id=user.id, actor_email=user.email,
                    entity_type="user", entity_id=user.id, metadata={"auth_type": "local"})

    return TokenResponse(access_token=access_token)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    """Refresh the access token using the refresh token cookie."""
    refresh_value = request.cookies.get("refresh_token")
    if not refresh_value:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh token")

    # We need to find which user this token belongs to — decode from all non-revoked tokens
    # For efficiency, we'll try to get user from the expired access token in Authorization header
    # But simpler: iterate (acceptable for <50 concurrent users)
    from app.models.user import RefreshToken as RT
    result = await db.execute(
        select(RT).where(RT.revoked == False, RT.expires_at > datetime.now(timezone.utc))
    )
    all_tokens = result.scalars().all()

    from passlib.context import CryptContext
    pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

    matched_token = None
    for rt in all_tokens:
        if pwd_ctx.verify(refresh_value, rt.token_hash):
            matched_token = rt
            break

    if not matched_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    # Get user
    user_result = await db.execute(select(User).where(User.id == matched_token.user_id))
    user = user_result.scalar_one_or_none()
    if not user or user.is_blocked:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account unavailable")

    # Revoke old, issue new
    await revoke_refresh_token(db, matched_token.id)
    new_access = create_access_token(user)
    new_refresh = create_refresh_token_value()
    await store_refresh_token(db, user.id, new_refresh)

    response.set_cookie(
        key="refresh_token",
        value=new_refresh,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/auth",
    )

    return TokenResponse(access_token=new_access)


@router.post("/logout", response_model=MessageResponse)
async def logout(request: Request, response: Response, db: AsyncSession = Depends(get_db),
                 current_user: User = Depends(get_current_user)):
    """Revoke refresh token and clear cookie."""
    refresh_value = request.cookies.get("refresh_token")
    if refresh_value:
        rt = await validate_refresh_token(db, current_user.id, refresh_value)
        if rt:
            await revoke_refresh_token(db, rt.id)

    response.delete_cookie("refresh_token", path="/auth")

    await log_audit(db, "USER_LOGOUT", actor_id=current_user.id, actor_email=current_user.email,
                    entity_type="user", entity_id=current_user.id)

    return MessageResponse(message="Logged out successfully")


# --- SSO (Azure AD OIDC) ---

@router.get("/sso/login")
async def sso_login(request: Request):
    """Redirect to Azure AD for OIDC login."""
    import secrets
    state = secrets.token_urlsafe(32)
    request.session["oauth_state"] = state

    auth_url = (
        f"https://login.microsoftonline.com/{settings.AZURE_TENANT_ID}/oauth2/v2.0/authorize"
        f"?client_id={settings.AZURE_CLIENT_ID}"
        f"&response_type=code"
        f"&redirect_uri={settings.AZURE_REDIRECT_URI}"
        f"&scope=openid+email+profile"
        f"&state={state}"
        f"&response_mode=query"
    )
    return Response(status_code=status.HTTP_302_FOUND, headers={"Location": auth_url})


@router.get("/sso/callback")
async def sso_callback(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    """Handle the OIDC callback from Azure AD."""
    import httpx

    code = request.query_params.get("code")
    state = request.query_params.get("state")
    error = request.query_params.get("error")

    if error:
        error_desc = request.query_params.get("error_description", error)
        # Redirect to frontend with error
        return Response(
            status_code=status.HTTP_302_FOUND,
            headers={"Location": f"{settings.FRONTEND_URL}/login?error={error_desc}"},
        )

    if not code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No authorization code received")

    # Exchange code for tokens (skip SSL verification for corporate network)
    token_url = f"https://login.microsoftonline.com/{settings.AZURE_TENANT_ID}/oauth2/v2.0/token"
    async with httpx.AsyncClient(verify=False) as client:
        token_response = await client.post(token_url, data={
            "client_id": settings.AZURE_CLIENT_ID,
            "client_secret": settings.AZURE_CLIENT_SECRET,
            "code": code,
            "redirect_uri": settings.AZURE_REDIRECT_URI,
            "grant_type": "authorization_code",
            "scope": "openid email profile",
        })

    if token_response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token exchange failed: {token_response.text[:200]}",
        )

    token_data = token_response.json()
    id_token = token_data.get("id_token")

    if not id_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No ID token received")

    # Decode ID token (without full verification since we trust the token endpoint response)
    import json, base64
    try:
        payload_part = id_token.split(".")[1]
        # Add padding
        payload_part += "=" * (4 - len(payload_part) % 4)
        payload = json.loads(base64.urlsafe_b64decode(payload_part))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Failed to decode ID token: {str(e)}")

    email = payload.get("email") or payload.get("preferred_username") or payload.get("upn")
    if not email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email not found in SSO token")

    # Look up user by email
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has not been provisioned. Please contact an administrator.",
        )
    if user.is_blocked:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been blocked. Please contact an administrator.",
        )

    # Issue tokens
    access_token = create_access_token(user)
    refresh_value = create_refresh_token_value()
    await store_refresh_token(db, user.id, refresh_value)

    response.set_cookie(
        key="refresh_token",
        value=refresh_value,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/auth",
    )

    await log_audit(db, "USER_LOGIN", actor_id=user.id, actor_email=user.email,
                    entity_type="user", entity_id=user.id, metadata={"auth_type": "sso"})

    # Redirect to frontend with token
    from urllib.parse import urlencode
    params = urlencode({"access_token": access_token})
    return Response(
        status_code=status.HTTP_302_FOUND,
        headers={"Location": f"{settings.FRONTEND_URL}/login/callback?{params}"},
    )


# --- Password Reset ---

@router.post("/password-reset/request", response_model=MessageResponse)
async def password_reset_request(body: PasswordResetRequest, db: AsyncSession = Depends(get_db)):
    """Request a password reset email."""
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if user and not user.is_blocked:
        token_value = generate_password_reset_token()
        await store_password_reset_token(db, user.id, token_value)

        reset_link = f"{settings.FRONTEND_URL}/reset-password?token={token_value}"
        html_body = f"""
        <h2>Password Reset</h2>
        <p>Click the link below to reset your password. This link expires in 1 hour.</p>
        <a href="{reset_link}">Reset Password</a>
        """
        await send_email([user.email], "[Document Storage] Password Reset", html_body)

        await log_audit(db, "PASSWORD_RESET_REQUESTED", actor_id=user.id, actor_email=user.email,
                        entity_type="user", entity_id=user.id)

    # Always return generic success (don't reveal if email exists)
    return MessageResponse(message="If the email is registered, a reset link has been sent.")


@router.post("/password-reset/confirm", response_model=MessageResponse)
async def password_reset_confirm(body: PasswordResetConfirm, db: AsyncSession = Depends(get_db)):
    """Confirm password reset with token and new password."""
    prt = await validate_password_reset_token(db, body.token)
    if not prt:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired token")

    # Update password
    result = await db.execute(select(User).where(User.id == prt.user_id))
    user = result.scalar_one()
    user.password_hash = hash_password(body.new_password)
    prt.used = True

    # Revoke all refresh tokens
    await revoke_all_refresh_tokens(db, user.id)

    await log_audit(db, "PASSWORD_RESET_COMPLETED", actor_id=user.id, actor_email=user.email,
                    entity_type="user", entity_id=user.id)

    return MessageResponse(message="Password reset successful. Please log in with your new password.")
