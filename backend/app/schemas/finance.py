"""Pydantic schemas for Finance Dashboard & Revenue Summary."""
from datetime import date
from decimal import Decimal
from typing import Dict, List, Optional
from pydantic import BaseModel

from app.schemas.payment import PaymentRead
from app.schemas.invoice import InvoiceRead

class FinanceDashboardSummary(BaseModel):
    as_of_date: date
    total_invoiced_amount: Decimal
    total_collected_amount: Decimal
    total_outstanding_amount: Decimal
    overdue_invoices_count: int
    overdue_amount: Decimal
    invoices_by_status: Dict[str, int]
    payment_methods_breakdown: Dict[str, Decimal]
    recent_payments: List[PaymentRead] = []
    recent_invoices: List[InvoiceRead] = []
