"""Payments and Reminders API Endpoints."""
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_admin, require_staff, get_current_user
from app.models.user import User, UserRole
from app.schemas.common import ApiResponse
from app.schemas.payment import (
    PaymentCreate, 
    PaymentRead, 
    PaymentReminderCreate, 
    PaymentReminderRead
)
from app.services.payment_service import PaymentService

router = APIRouter()

@router.get("/", response_model=ApiResponse[List[PaymentRead]], summary="List Payments")
def list_payments(
    invoice_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Staff/Admin: View all payments.
    Customers: View only payments made by their customer profile.
    """
    customer_id = None
    if current_user.role == UserRole.CUSTOMER:
        if not current_user.customer_profile:
            return ApiResponse(success=True, message="No customer profile attached.", data=[])
        customer_id = current_user.customer_profile.id

    payments = PaymentService.list_payments(db, customer_id=customer_id, invoice_id=invoice_id)
    return ApiResponse(
        success=True,
        message="Payments retrieved successfully.",
        data=[PaymentRead.model_validate(p) for p in payments]
    )

@router.post("/", response_model=ApiResponse[PaymentRead], status_code=status.HTTP_201_CREATED, summary="Record Payment")
def record_payment(
    payment_in: PaymentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Record payment against an invoice (full or partial).
    Supports UPI, Cash, Card, and Bank Transfer.
    Automatically updates invoice amount_paid, balance_due, and transitions status (PAID / PARTIALLY_PAID).
    """
    payment = PaymentService.record_payment(db, payment_in, user_id=current_user.id)
    return ApiResponse(
        success=True,
        message=f"Payment {payment.payment_number} for ${payment.amount} recorded successfully.",
        data=PaymentRead.model_validate(payment)
    )

@router.get("/{payment_id}", response_model=ApiResponse[PaymentRead], summary="Get Payment Details")
def get_payment(
    payment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    payment = PaymentService.get_by_id(db, payment_id)
    if current_user.role == UserRole.CUSTOMER:
        if not current_user.customer_profile or payment.customer_id != current_user.customer_profile.id:
            from fastapi import HTTPException
            raise HTTPException(status_code=403, detail="Forbidden.")
    return ApiResponse(
        success=True,
        message="Payment details retrieved.",
        data=PaymentRead.model_validate(payment)
    )

# --- Overdue Payment Reminders ---

@router.post("/reminders", response_model=ApiResponse[PaymentReminderRead], summary="Send Overdue Payment Reminder")
def send_payment_reminder(
    reminder_in: PaymentReminderCreate,
    current_staff: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """Staff/Admin: Send and log an overdue payment reminder to customer."""
    reminder = PaymentService.send_payment_reminder(db, reminder_in, sent_by_user_id=current_staff.id)
    return ApiResponse(
        success=True,
        message=f"Reminder sent for invoice #{reminder.invoice_id} ({reminder.amount_due} due).",
        data=PaymentReminderRead.model_validate(reminder)
    )

@router.get("/reminders/list", response_model=ApiResponse[List[PaymentReminderRead]], summary="List Payment Reminders")
def list_reminders(
    invoice_id: Optional[int] = Query(None),
    current_staff: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    reminders = PaymentService.list_reminders(db, invoice_id=invoice_id)
    return ApiResponse(
        success=True,
        message="Payment reminders retrieved.",
        data=[PaymentReminderRead.model_validate(r) for r in reminders]
    )

