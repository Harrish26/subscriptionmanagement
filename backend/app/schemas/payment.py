"""Pydantic schemas for Payments and Reminders."""
from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, Field

from app.models.payment import PaymentMethod
from app.schemas.quotation import CustomerBrief

class PaymentCreate(BaseModel):
    invoice_id: int = Field(..., description="Target invoice ID")
    amount: Decimal = Field(..., gt=Decimal("0.00"), description="Payment amount in Decimal")
    payment_method: PaymentMethod = Field(default=PaymentMethod.UPI)
    payment_date: Optional[date] = None  # defaults to today
    transaction_reference: Optional[str] = Field(None, max_length=100, description="UTR, Txn ID, or check number")
    notes: Optional[str] = Field(None, max_length=500)

class PaymentRead(BaseModel):
    id: int
    payment_number: str
    invoice_id: int
    customer_id: int
    amount: Decimal
    payment_date: date
    payment_method: PaymentMethod
    transaction_reference: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    customer: Optional[CustomerBrief] = None

    class Config:
        from_attributes = True

class PaymentReminderCreate(BaseModel):
    invoice_id: int
    reminder_channel: str = Field(default="email")
    message: Optional[str] = None

class PaymentReminderRead(BaseModel):
    id: int
    invoice_id: int
    customer_id: int
    reminder_channel: str
    reminder_date: datetime
    due_date: date
    amount_due: Decimal
    message: Optional[str] = None
    sent_by_user_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True
