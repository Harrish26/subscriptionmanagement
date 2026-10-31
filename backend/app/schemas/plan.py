"""Pydantic schemas for Subscription Plans."""
from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field

from app.models.plan import BillingInterval

class PlanBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    billing_interval: BillingInterval = BillingInterval.MONTHLY
    base_cost: Decimal = Field(default=Decimal("0.00"), ge=0, description="Recurring base plan fee")
    min_quantity: int = Field(default=1, ge=1, description="Minimum purchase/seat quantity")
    available_from: date
    available_to: Optional[date] = None

    # Lifecycle & Termination Rules
    auto_close_on_expiry: bool = Field(default=False, description="Automatically close subscription upon expiration")
    allow_early_close: bool = Field(default=True, description="Allow subscription to be terminated before end date")
    allow_pause: bool = Field(default=True, description="Allow customer/staff to pause subscription")
    allow_renewal: bool = Field(default=True, description="Allow subscription renewal upon expiration")
    
    is_active: bool = True

class PlanCreate(PlanBase):
    pass

class PlanUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    billing_interval: Optional[BillingInterval] = None
    base_cost: Optional[Decimal] = Field(None, ge=0)
    min_quantity: Optional[int] = Field(None, ge=1)
    available_from: Optional[date] = None
    available_to: Optional[date] = None
    auto_close_on_expiry: Optional[bool] = None
    allow_early_close: Optional[bool] = None
    allow_pause: Optional[bool] = None
    allow_renewal: Optional[bool] = None
    is_active: Optional[bool] = None

class PlanRead(PlanBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

