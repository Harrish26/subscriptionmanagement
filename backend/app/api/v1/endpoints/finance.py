"""Finance Dashboard and Revenue Analytics API Endpoints."""
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_staff
from app.models.user import User, UserRole
from app.schemas.common import ApiResponse
from app.schemas.finance import FinanceDashboardSummary, AdminDashboardOverview
from app.services.finance_service import FinanceService
from app.services.payment_service import PaymentService

router = APIRouter()

@router.get("/dashboard", response_model=ApiResponse[FinanceDashboardSummary], summary="Finance Dashboard Summary")
def get_finance_dashboard(
    current_staff: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """
    Staff/Admin: Financial dashboard aggregating total invoiced, total collected payments,
    outstanding receivables, overdue invoices, and recent transaction logs.
    """
    summary = FinanceService.get_dashboard_summary(db)
    return ApiResponse(
        success=True,
        message="Finance dashboard summary retrieved.",
        data=summary
    )

@router.get("/admin-overview", response_model=ApiResponse[AdminDashboardOverview], summary="Admin High-Level Operations Overview")
def get_admin_operations_overview(
    current_staff: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """
    Staff/Admin: High-level operations overview for Admin Dashboard:
    total customers, active subscriptions, total products, MRR, total invoices,
    collected payments, outstanding payments, overdue invoices, and churn prediction summary.
    """
    if current_staff.role not in (UserRole.ADMIN, UserRole.STAFF):
        raise HTTPException(status_code=403, detail="Staff role required for admin overview.")
    overview = FinanceService.get_admin_overview(db)
    return ApiResponse(
        success=True,
        message="Admin overview metrics loaded successfully.",
        data=overview
    )

@router.post("/scan-overdue", response_model=ApiResponse[dict], summary="Scan & Update Overdue Invoices")
def scan_overdue_invoices(
    current_staff: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """Staff/Admin: Trigger automated scan to flag past-due unpaid invoices as OVERDUE."""
    overdue_list = PaymentService.scan_and_update_overdue(db)
    return ApiResponse(
        success=True,
        message=f"Scan complete. {len(overdue_list)} invoice(s) marked as OVERDUE.",
        data={"overdue_invoices_updated": len(overdue_list)}
    )

