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

class ActivityEvent(BaseModel):
    id: str
    type: str  # "invoice" | "payment" | "subscription"
    title: str
    description: str
    amount: Optional[Decimal] = None
    status: Optional[str] = None
    timestamp: date

class AdminDashboardOverview(BaseModel):
    as_of_date: date
    total_customers: int
    active_subscriptions: int
    total_products: int
    current_mrr: Decimal
    total_invoiced_amount: Decimal
    total_collected_amount: Decimal
    total_outstanding_amount: Decimal
    overdue_invoices_count: int
    overdue_amount: Decimal
    portfolio_churn_rate_pct: float
    high_risk_customers_count: int
    recent_activity: List[ActivityEvent] = []
