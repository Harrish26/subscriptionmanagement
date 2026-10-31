"""Invoices and Billing Ledger endpoints."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_db, require_admin, require_staff, get_current_user
from app.models.user import User, UserRole
from app.models.invoice import Invoice, InvoiceStatus
from app.schemas.common import ApiResponse
from app.schemas.invoice import InvoiceRead, InvoiceStatusUpdate

router = APIRouter()

@router.get("/", response_model=ApiResponse[List[InvoiceRead]], summary="List Invoices")
def list_invoices(
    status_filter: Optional[InvoiceStatus] = Query(None, alias="status"),
    subscription_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Staff & Admin see all invoices across all clients.
    Customers see strictly their own invoices.
    """
    query = db.query(Invoice).options(
        joinedload(Invoice.customer),
        joinedload(Invoice.subscription),
        joinedload(Invoice.lines),
        joinedload(Invoice.payments)
    )

    if current_user.role == UserRole.CUSTOMER:
        if not current_user.customer_profile:
            return ApiResponse(success=True, message="No customer profile attached.", data=[])
        query = query.filter(Invoice.customer_id == current_user.customer_profile.id)

    if subscription_id:
        query = query.filter(Invoice.subscription_id == subscription_id)
    if status_filter:
        query = query.filter(Invoice.status == status_filter)

    invoices = query.order_by(Invoice.id.desc()).all()
    return ApiResponse(
        success=True,
        message="Invoices retrieved successfully.",
        data=[InvoiceRead.model_validate(inv) for inv in invoices]
    )

@router.get("/{invoice_id}", response_model=ApiResponse[InvoiceRead], summary="Get Invoice Details")
def get_invoice(
    invoice_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    invoice = (
        db.query(Invoice)
        .options(
            joinedload(Invoice.customer),
            joinedload(Invoice.subscription),
            joinedload(Invoice.lines),
            joinedload(Invoice.payments)
        )
        .filter(Invoice.id == invoice_id)
        .first()
    )
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found.")

    if current_user.role == UserRole.CUSTOMER:
        if not current_user.customer_profile or invoice.customer_id != current_user.customer_profile.id:
            raise HTTPException(status_code=403, detail="Access to other customers' invoices is forbidden.")

    return ApiResponse(
        success=True,
        message="Invoice details retrieved.",
        data=InvoiceRead.model_validate(invoice)
    )

@router.put("/{invoice_id}/status", response_model=ApiResponse[InvoiceRead], summary="Update Invoice Status")
def update_invoice_status(
    invoice_id: int,
    status_in: InvoiceStatusUpdate,
    current_staff: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """Staff & Admin: Update invoice status (e.g. mark as confirmed, paid, or cancelled)."""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found.")

    invoice.status = status_in.status
    if status_in.status == InvoiceStatus.PAID:
        invoice.amount_paid = invoice.total_amount
        invoice.balance_due = 0

    if status_in.notes:
        invoice.notes = f"{invoice.notes or ''}\nStatus update: {status_in.notes}"

    db.commit()
    db.refresh(invoice)
    return ApiResponse(
        success=True,
        message=f"Invoice {invoice.invoice_number} status updated to '{invoice.status.value}'.",
        data=InvoiceRead.model_validate(invoice)
    )

