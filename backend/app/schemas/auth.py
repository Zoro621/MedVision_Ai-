from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models import UserRole


class AuthUser(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    email: EmailStr
    full_name: str = Field(alias="fullName")
    role: UserRole
    avatar_initials: str = Field(alias="avatarInitials")
    training_level: str | None = Field(default=None, alias="trainingLevel")
    radiology_focus: list[str] | None = Field(default=None, alias="radiologyFocus")
    institution_type: str | None = Field(default=None, alias="institutionType")
    created_at: datetime = Field(alias="createdAt")


class RegisterRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    full_name: str = Field(min_length=2, max_length=255, alias="fullName")
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    institution_type: str = Field(min_length=2, max_length=255, alias="institutionType")
    training_level: str = Field(min_length=2, max_length=255, alias="trainingLevel")
    radiology_focus: list[str] = Field(min_length=1, max_length=10, alias="radiologyFocus")
    referral_source: str | None = Field(default=None, max_length=255, alias="referralSource")


class LoginRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: UserRole
    totp_code: str | None = Field(
        default=None,
        min_length=6,
        max_length=6,
        alias="totpCode",
    )


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class AuthResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    user: AuthUser
    access_token: str = Field(alias="accessToken")


class MessageResponse(BaseModel):
    message: str


class ErrorDetail(BaseModel):
    message: str
    remaining_attempts: int | None = None
    locked_until: datetime | None = None
