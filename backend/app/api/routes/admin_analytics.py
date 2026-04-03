from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import require_role
from app.core.database import get_db
from app.models import User, UserRole
from app.schemas.admin_analytics import AdminAnalyticsReportOut, AdminOverviewOut
from app.services.admin_analytics import build_admin_overview, build_admin_report

router = APIRouter(prefix="/admin/analytics", tags=["admin-analytics"])


@router.get("/overview", response_model=AdminOverviewOut)
def get_admin_overview(
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
) -> AdminOverviewOut:
    return AdminOverviewOut(**build_admin_overview(db))


@router.get("/report", response_model=AdminAnalyticsReportOut)
def get_admin_report(
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
) -> AdminAnalyticsReportOut:
    return AdminAnalyticsReportOut(**build_admin_report(db))
