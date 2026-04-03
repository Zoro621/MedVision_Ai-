from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import require_role
from app.core.database import get_db
from app.models import User, UserRole
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

router = APIRouter(prefix="/admin", tags=["admin-operations"])


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
