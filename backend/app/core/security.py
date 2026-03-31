import hashlib
import uuid
from datetime import UTC, datetime, timedelta

from jose import JWTError, jwt
from passlib.context import CryptContext
import pyotp

from app.core.config import get_settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
settings = get_settings()

ACCESS_COOKIE_NAME = "medvision_token"
REFRESH_COOKIE_NAME = "medvision_refresh_token"
ROLE_COOKIE_NAME = "medvision_role"


def utc_now() -> datetime:
    return datetime.now(UTC)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_access_token(*, subject: str, role: str, session_id: str) -> tuple[str, datetime]:
    expires_at = utc_now() + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {
        "sub": subject,
        "role": role,
        "sid": session_id,
        "type": "access",
        "exp": expires_at,
        "jti": str(uuid.uuid4()),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm="HS256"), expires_at


def create_refresh_token(
    *, subject: str, role: str, session_id: str
) -> tuple[str, datetime]:
    expires_at = utc_now() + timedelta(days=settings.refresh_token_expire_days)
    payload = {
        "sub": subject,
        "role": role,
        "sid": session_id,
        "type": "refresh",
        "exp": expires_at,
        "jti": str(uuid.uuid4()),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm="HS256"), expires_at


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.jwt_secret_key, algorithms=["HS256"])
    except JWTError as exc:
        raise ValueError("Invalid token") from exc


def verify_totp_code(secret: str, code: str) -> bool:
    return pyotp.TOTP(secret).verify(code, valid_window=1)


def build_avatar_initials(full_name: str) -> str:
    parts = [part[0] for part in full_name.strip().split() if part]
    if not parts:
        return "MV"
    return "".join(parts[:2]).upper()
