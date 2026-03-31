from collections import defaultdict, deque
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import (
    ACCESS_COOKIE_NAME,
    REFRESH_COOKIE_NAME,
    ROLE_COOKIE_NAME,
    build_avatar_initials,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    hash_token,
    utc_now,
    verify_password,
    verify_totp_code,
)
from app.models import AuditLog, Session as AuthSession, User, UserRole
from app.schemas.auth import (
    AuthResponse,
    AuthUser,
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    RegisterRequest,
)

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES = 15
RATE_LIMIT_ATTEMPTS = 10
RATE_LIMIT_WINDOW_SECONDS = 60
rate_limiter: dict[str, deque] = defaultdict(deque)


def serialize_user(user: User) -> AuthUser:
    return AuthUser.model_validate(user)


def write_audit_log(
    db: Session,
    *,
    action: str,
    target_type: str,
    target_id: str | None = None,
    actor_user_id: str | None = None,
    metadata: dict | None = None,
) -> None:
    db.add(
        AuditLog(
            actor_user_id=actor_user_id,
            action=action,
            target_type=target_type,
            target_id=target_id,
            metadata_json=metadata,
        )
    )


def set_auth_cookies(
    response: Response,
    *,
    access_token: str,
    refresh_token: str,
    role: UserRole,
    access_max_age: int,
    refresh_max_age: int,
) -> None:
    cookie_kwargs = {
        "httponly": True,
        "secure": settings.cookie_secure,
        "samesite": "lax",
        "path": "/",
    }
    if settings.cookie_domain:
        cookie_kwargs["domain"] = settings.cookie_domain

    response.set_cookie(
        ACCESS_COOKIE_NAME,
        access_token,
        max_age=access_max_age,
        **cookie_kwargs,
    )
    response.set_cookie(
        REFRESH_COOKIE_NAME,
        refresh_token,
        max_age=refresh_max_age,
        **cookie_kwargs,
    )
    response.set_cookie(
        ROLE_COOKIE_NAME,
        role.value,
        max_age=refresh_max_age,
        **cookie_kwargs,
    )


def clear_auth_cookies(response: Response) -> None:
    cookie_kwargs = {"path": "/"}
    if settings.cookie_domain:
        cookie_kwargs["domain"] = settings.cookie_domain

    response.delete_cookie(ACCESS_COOKIE_NAME, **cookie_kwargs)
    response.delete_cookie(REFRESH_COOKIE_NAME, **cookie_kwargs)
    response.delete_cookie(ROLE_COOKIE_NAME, **cookie_kwargs)


def enforce_rate_limit(key: str) -> None:
    now = utc_now()
    attempts = rate_limiter[key]
    while attempts and (now - attempts[0]).total_seconds() > RATE_LIMIT_WINDOW_SECONDS:
        attempts.popleft()
    if len(attempts) >= RATE_LIMIT_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many authentication attempts. Please try again shortly.",
        )


def record_rate_limit_attempt(key: str) -> None:
    rate_limiter[key].append(utc_now())


def register_failed_attempt(db: Session, user: User, *, reason: str) -> None:
    user.failed_login_attempts += 1
    remaining_attempts = max(MAX_FAILED_ATTEMPTS - user.failed_login_attempts, 0)
    locked_until = None
    if user.failed_login_attempts >= MAX_FAILED_ATTEMPTS:
        locked_until = utc_now() + timedelta(minutes=LOCKOUT_MINUTES)
        user.locked_until = locked_until

    write_audit_log(
        db,
        actor_user_id=user.id,
        action="auth.login.failed",
        target_type="user",
        target_id=user.id,
        metadata={"reason": reason, "remaining_attempts": remaining_attempts},
    )
    db.commit()

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail={
            "message": "Invalid credentials or authentication code.",
            "remainingAttempts": remaining_attempts,
            "lockedUntil": locked_until.isoformat() if locked_until else None,
        },
    )


def create_session_tokens(
    *,
    user: User,
    db: Session,
    request: Request,
) -> tuple[str, str, int, int]:
    session = AuthSession(
        user_id=user.id,
        refresh_token_hash="pending",
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
        expires_at=utc_now() + timedelta(days=settings.refresh_token_expire_days),
    )
    db.add(session)
    db.flush()

    access_token, access_expires_at = create_access_token(
        subject=user.id,
        role=user.role.value,
        session_id=session.id,
    )
    refresh_token, refresh_expires_at = create_refresh_token(
        subject=user.id,
        role=user.role.value,
        session_id=session.id,
    )

    session.refresh_token_hash = hash_token(refresh_token)
    session.expires_at = refresh_expires_at

    access_max_age = int((access_expires_at - utc_now()).total_seconds())
    refresh_max_age = int((refresh_expires_at - utc_now()).total_seconds())
    return access_token, refresh_token, access_max_age, refresh_max_age


@router.post("/register", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def register_user(payload: RegisterRequest, db: Session = Depends(get_db)) -> MessageResponse:
    existing_user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    user = User(
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        role=UserRole.STUDENT,
        institution_type=payload.institution_type,
        training_level=payload.training_level,
        radiology_focus=payload.radiology_focus,
        referral_source=payload.referral_source,
        avatar_initials=build_avatar_initials(payload.full_name),
    )
    db.add(user)
    db.flush()
    write_audit_log(
        db,
        actor_user_id=user.id,
        action="auth.register",
        target_type="user",
        target_id=user.id,
        metadata={"role": user.role.value},
    )
    db.commit()
    return MessageResponse(message="Account created successfully.")


@router.post("/login", response_model=AuthResponse)
def login_user(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> AuthResponse:
    rate_key = f"{payload.email.lower()}:{request.client.host if request.client else 'unknown'}"
    enforce_rate_limit(rate_key)

    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if user is None or user.role != payload.role or not user.is_active:
        record_rate_limit_attempt(rate_key)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials or authentication code.",
        )

    if user.locked_until and user.locked_until > utc_now():
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail={
                "message": "Account temporarily locked.",
                "lockedUntil": user.locked_until.isoformat(),
            },
        )

    if not verify_password(payload.password, user.password_hash):
        record_rate_limit_attempt(rate_key)
        register_failed_attempt(db, user, reason="password")

    if user.role == UserRole.ADMIN:
        if not user.totp_enabled or not user.totp_secret or not payload.totp_code:
            record_rate_limit_attempt(rate_key)
            register_failed_attempt(db, user, reason="totp_required")
        if not verify_totp_code(user.totp_secret, payload.totp_code):
            record_rate_limit_attempt(rate_key)
            register_failed_attempt(db, user, reason="totp_invalid")

    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login_at = utc_now()

    access_token, refresh_token, access_max_age, refresh_max_age = create_session_tokens(
        user=user,
        db=db,
        request=request,
    )
    write_audit_log(
        db,
        actor_user_id=user.id,
        action="auth.login.success",
        target_type="user",
        target_id=user.id,
        metadata={"role": user.role.value},
    )
    db.commit()

    set_auth_cookies(
        response,
        access_token=access_token,
        refresh_token=refresh_token,
        role=user.role,
        access_max_age=access_max_age,
        refresh_max_age=refresh_max_age,
    )
    return AuthResponse(user=serialize_user(user), access_token=access_token)


@router.get("/me", response_model=AuthUser)
def get_me(user: User = Depends(get_current_user)) -> AuthUser:
    return serialize_user(user)


@router.post("/refresh", response_model=AuthResponse)
def refresh_session(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> AuthResponse:
    token = request.cookies.get(REFRESH_COOKIE_NAME)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing",
        )

    try:
        payload = decode_token(token)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        ) from exc

    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    session = db.get(AuthSession, payload.get("sid"))
    user = db.get(User, payload.get("sub"))
    if (
        session is None
        or user is None
        or session.revoked_at is not None
        or session.expires_at <= utc_now()
        or session.refresh_token_hash != hash_token(token)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token expired",
        )

    access_token, refresh_token, access_max_age, refresh_max_age = create_session_tokens(
        user=user,
        db=db,
        request=request,
    )
    session.revoked_at = utc_now()
    write_audit_log(
        db,
        actor_user_id=user.id,
        action="auth.refresh",
        target_type="session",
        target_id=session.id,
    )
    db.commit()

    set_auth_cookies(
        response,
        access_token=access_token,
        refresh_token=refresh_token,
        role=user.role,
        access_max_age=access_max_age,
        refresh_max_age=refresh_max_age,
    )
    return AuthResponse(user=serialize_user(user), access_token=access_token)


@router.post("/logout", response_model=MessageResponse)
def logout_user(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> MessageResponse:
    actor_user_id: str | None = None
    refresh_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if refresh_token:
        try:
            payload = decode_token(refresh_token)
            session = db.get(AuthSession, payload.get("sid"))
            actor_user_id = payload.get("sub")
            if session is not None and session.revoked_at is None:
                session.revoked_at = utc_now()
                write_audit_log(
                    db,
                    actor_user_id=actor_user_id,
                    action="auth.logout",
                    target_type="session",
                    target_id=session.id,
                )
                db.commit()
        except ValueError:
            pass

    clear_auth_cookies(response)
    return MessageResponse(message="Logged out successfully.")


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db),
) -> MessageResponse:
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if user is not None:
        write_audit_log(
            db,
            actor_user_id=user.id,
            action="auth.password_reset.requested",
            target_type="user",
            target_id=user.id,
        )
        db.commit()

    return MessageResponse(
        message="If that email exists, a password reset link will be sent."
    )
