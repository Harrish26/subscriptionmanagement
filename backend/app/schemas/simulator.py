"""Pydantic schemas for the Time-Travel Billing Simulator."""
from datetime import date
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, Field

from app.schemas.invoice import InvoiceRead

class TimeTravelRequest(BaseModel):
    days: int = Field(default=30, ge=1, le=365, description="Number of days to advance simulated time (e.g. 1, 7, 30)")

class BillingRunSummary(BaseModel):
    subscriptions_evaluated: int
    invoices_generated: int
    total_amount_billed: Decimal
    auto_closed_subscriptions: int
    skipped_duplicate_cycles: int

class TimeTravelResponse(BaseModel):
    previous_simulated_date: date
    new_simulated_date: date
    days_advanced: int
    billing_summary: BillingRunSummary
    generated_invoices: List[InvoiceRead] = []

class SimulatorStatusResponse(BaseModel):
    real_world_date: date
    current_simulated_date: date
    days_offset: int
    active_subscriptions_due_count: int

