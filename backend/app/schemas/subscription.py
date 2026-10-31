"""Pydantic schemas for Subscriptions and State Transitions."""
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, Field

from app.models.subscription import SubscriptionStatus
from app.schemas.product import ProductRead, ProductVariantRead
from app.schemas.plan import PlanRead
from app.schemas.quotation import CustomerBrief

# --- Subscription Line Schemas ---

class SubscriptionLineBase(BaseModel):
    product_id: int
    variant_id: Optional[int] = None
    description: Optional[str] = None
    quantity: int = Field(default=1, ge=1)
    unit_price: Decimal = Field(..., ge=0)
    discount_percent: Decimal = Field(default=Decimal("0.00"), ge=0, le=100)

class SubscriptionLineCreate(SubscriptionLineBase):
    pass

class SubscriptionLineRead(SubscriptionLineBase):
    id: int
    subscription_id: int
    line_total: Decimal
    product: Optional[ProductRead] = None
    variant: Optional[ProductVariantRead] = None

    class Config:
        from_attributes = True

# --- Subscription Schemas ---

class SubscriptionBase(BaseModel):
    customer_id: int
    plan_id: int
    start_date: date
    expiry_date: Optional[date] = None
    payment_terms: str = Field(default="Immediate")
    notes: Optional[str] = None

class SubscriptionCreate(SubscriptionBase):
    lines: List[SubscriptionLineCreate] = []

class SubscriptionFromQuotationRequest(BaseModel):
    """Convert an approved/confirmed quotation into an active recurring subscription."""
    quotation_id: int
    start_date: Optional[date] = None
    expiry_date: Optional[date] = None
    notes: Optional[str] = None

class SubscriptionTransitionRequest(BaseModel):
    """Request to transition subscription state."""
    action: str = Field(..., description="confirm, activate, pause, resume, close, renew")
    notes: Optional[str] = None

class SubscriptionRead(SubscriptionBase):
    id: int
    subscription_number: str
    quotation_id: Optional[int] = None
    status: SubscriptionStatus
    next_billing_date: date
    current_billing_cycle: int
    subtotal: Decimal
    discount_total: Decimal
    tax_total: Decimal
    total_amount: Decimal
    created_at: datetime
    updated_at: datetime
    customer: Optional[CustomerBrief] = None
    plan: Optional[PlanRead] = None
    lines: List[SubscriptionLineRead] = []

    class Config:
        from_attributes = True

