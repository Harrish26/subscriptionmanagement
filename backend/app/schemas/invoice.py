"""Pydantic schemas for Invoices and Billing Runs."""
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, Field

from app.models.invoice import InvoiceStatus
from app.schemas.quotation import CustomerBrief

class InvoiceLineRead(BaseModel):
    id: int
    invoice_id: int
    product_id: Optional[int] = None
    variant_id: Optional[int] = None
    description: str
    quantity: int
    unit_price: Decimal
    discount_percent: Decimal
    tax_rate: Decimal
    line_total: Decimal

    class Config:
        from_attributes = True

class InvoiceStatusUpdate(BaseModel):
    status: InvoiceStatus
    notes: Optional[str] = None

class InvoiceRead(BaseModel):
    id: int
    invoice_number: str
    subscription_id: int
    subscription_number: Optional[str] = None
    customer_id: int
    billing_period_start: date
    billing_period_end: date
    issue_date: date
    due_date: date
    status: InvoiceStatus
    subtotal: Decimal
    discount_total: Decimal
    tax_total: Decimal
    total_amount: Decimal
    amount_paid: Decimal
    balance_due: Decimal
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    customer: Optional[CustomerBrief] = None
    lines: List[InvoiceLineRead] = []

    class Config:
        from_attributes = True

