"""
Admin Operations routes — Phase 7 complete.

Existing:
  GET /admin/students
  GET /admin/students/{id}
  GET /admin/audit-logs
  GET /admin/system

New (wired to frontend /admin/operations/* prefix):
  GET  /admin/operations/students                    — paginated list
  POST /admin/operations/students/{id}/suspend
  POST /admin/operations/students/{id}/reset-password
  GET  /admin/operations/audit-log                   — paginated audit log
"""
from __future__ import annotations

import secrets
import string
from datetime import timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import require_role
from app.core.database import get_db
from app.core.security import hash_password
from app.models import AuditLog, User, UserRole, UserStreak
from app.schemas.admin_operations import (
    AdminStudentDetailOut,
    AdminStudentRowOut,
    AdminSystemStatusOut,
    AuditLogItemOut,
)
from app.services.admin_operations import (
    build_admin_system_status,
    get_admin_student_detail,
    list_admin_audit_logs,
    list_admin_students,
)
from app.services.audit_log import write_audit_log

router = APIRouter(prefix="/admin", tags=["admin-operations"])


# ──────────────────────────────────────────────────────────────────────────────
# Legacy endpoints (keep for existing consumers)
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/students", response_model=list[AdminStudentRowOut])
def get_admin_students(
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
) -> list[AdminStudentRowOut]:
    return [AdminStudentRowOut(**item) for item in list_admin_students(db)]


@router.get("/students/{student_id}", response_model=AdminStudentDetailOut)
def get_admin_student(
    student_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
) -> AdminStudentDetailOut:
    return AdminStudentDetailOut(**get_admin_student_detail(db, student_id))


@router.get("/audit-logs", response_model=list[AuditLogItemOut])
def get_admin_audit_logs(
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
) -> list[AuditLogItemOut]:
    return [AuditLogItemOut(**item) for item in list_admin_audit_logs(db)]


@router.get("/system", response_model=AdminSystemStatusOut)
def get_admin_system_status(
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
) -> AdminSystemStatusOut:
    return AdminSystemStatusOut(**build_admin_system_status(db))


# ──────────────────────────────────────────────────────────────────────────────
# New operations endpoints (frontend calls /admin/operations/*)
# ──────────────────────────────────────────────────────────────────────────────

class StudentRow(BaseModel):
    id: str
    name: str
    email: str
    role: str
    status: str
    level: int
    xp: int
    streak: int
    avgScore: float
    risk: str


class StudentsResponse(BaseModel):
    students: list[StudentRow]
    total: int


@router.get("/operations/students", response_model=StudentsResponse)
def list_students_paginated(
    page: int = 1,
    page_size: int = 20,
    search: str = "",
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
) -> StudentsResponse:
    query = select(User).where(User.role == UserRole.STUDENT)
    if search:
        like = f"%{search}%"
        query = query.where(
            User.full_name.ilike(like) | User.email.ilike(like)
        )

    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    users = db.scalars(
        query.order_by(User.full_name).offset((page - 1) * page_size).limit(page_size)
    ).all()

    streaks: dict[str, UserStreak] = {}
    if users:
        streak_rows = db.scalars(
            select(UserStreak).where(UserStreak.user_id.in_([u.id for u in users]))
        ).all()
        streaks = {s.user_id: s for s in streak_rows}

    rows: list[StudentRow] = []
    for u in users:
        streak = streaks.get(u.id)
        status_val = "active" if u.is_active else "suspended"
        rows.append(StudentRow(
            id=u.id,
            name=u.full_name or "",
            email=u.email,
            role=u.role.value if hasattr(u.role, "value") else str(u.role),
            status=status_val,
            level=streak.level if streak else 1,
            xp=streak.xp if streak else 0,
            streak=streak.streak_days if streak else 0,
            avgScore=0.0,
            risk="on-track",
        ))

    return StudentsResponse(students=rows, total=total)


class SuspendResult(BaseModel):
    success: bool
    message: str


@router.post("/operations/students/{student_id}/suspend", response_model=SuspendResult)
def suspend_student(
    student_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role(UserRole.ADMIN)),
) -> SuspendResult:
    user = db.get(User, student_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Student not found.")
    if user.role == UserRole.ADMIN:
        raise HTTPException(status_code=400, detail="Cannot suspend admin accounts.")
    user.is_active = False
    _write_audit(db=db, admin=admin, action="user.suspend", target_user_id=user.id)
    db.commit()
    return SuspendResult(success=True, message=f"Account {user.email} suspended.")


class ResetPasswordResult(BaseModel):
    temporaryPassword: str


@router.post("/operations/students/{student_id}/reset-password", response_model=ResetPasswordResult)
def reset_student_password(
    student_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role(UserRole.ADMIN)),
) -> ResetPasswordResult:
    user = db.get(User, student_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Student not found.")
    if user.role == UserRole.ADMIN:
        raise HTTPException(status_code=400, detail="Cannot reset admin passwords here.")
    alphabet = string.ascii_letters + string.digits
    temp = "".join(secrets.choice(alphabet) for _ in range(12))
    user.password_hash = hash_password(temp)
    _write_audit(db=db, admin=admin, action="user.reset_password", target_user_id=user.id)
    db.commit()
    return ResetPasswordResult(temporaryPassword=temp)


class AuditLogEntryOut(BaseModel):
    id: str
    userId: str
    userEmail: str
    action: str
    resource: str
    metadata: dict | None
    createdAt: str


class AuditLogPage(BaseModel):
    items: list[AuditLogEntryOut]
    total: int
    page: int
    pageSize: int


@router.get("/operations/audit-log", response_model=AuditLogPage)
def get_audit_log_paginated(
    page: int = 1,
    page_size: int = 15,
    user_id: str | None = None,
    action: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
) -> AuditLogPage:
    query = select(AuditLog)
    if user_id:
        query = query.where(AuditLog.actor_user_id == user_id)
    if action:
        query = query.where(AuditLog.action == action)

    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    rows  = db.scalars(
        query.order_by(AuditLog.created_at.desc())
             .offset((page - 1) * page_size)
             .limit(page_size)
    ).all()

    emails: dict[str, str] = {}
    if rows:
        actor_ids = list({r.actor_user_id for r in rows if r.actor_user_id})
        if actor_ids:
            users = db.scalars(select(User).where(User.id.in_(actor_ids))).all()
            emails = {u.id: u.email for u in users}

    items = [
        AuditLogEntryOut(
            id=r.id,
            userId=r.actor_user_id or "",
            userEmail=emails.get(r.actor_user_id or "", "system"),
            action=r.action or "",
            resource=f"{r.target_type}:{r.target_id}" if r.target_type else "",
            metadata=r.metadata_json,
            createdAt=(
                r.created_at.replace(tzinfo=timezone.utc).isoformat()
                if r.created_at else ""
            ),
        )
        for r in rows
    ]
    return AuditLogPage(items=items, total=total, page=page, pageSize=page_size)


def _write_audit(
    *, db: Session, admin: User, action: str, target_user_id: str
) -> None:
    write_audit_log(
        db,
        actor_user_id=admin.id,
        action=action,
        target_type="user",
        target_id=target_user_id,
        metadata=None,
    )
