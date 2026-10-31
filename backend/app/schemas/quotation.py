"""Pydantic schemas for Quotation Templates and Customer Quotations."""
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, Field

from app.models.quotation import QuotationStatus
from app.schemas.product import ProductRead, ProductVariantRead
from app.schemas.plan import PlanRead

# --- Quotation Template Line Schemas ---

class QuotationTemplateLineBase(BaseModel):
    product_id: int
    variant_id: Optional[int] = None
    quantity: int = Field(default=1, ge=1)
    unit_price: Optional[Decimal] = Field(None, ge=0, description="Override unit price; defaults to product + variant price")
    discount_percent: Decimal = Field(default=Decimal("0.00"), ge=0, le=100)

class QuotationTemplateLineCreate(QuotationTemplateLineBase):
    pass

class QuotationTemplateLineRead(QuotationTemplateLineBase):
    id: int
    template_id: int
    product: Optional[ProductRead] = None
    variant: Optional[ProductVariantRead] = None

    class Config:
        from_attributes = True

# --- Quotation Template Schemas ---

class QuotationTemplateBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    plan_id: int
    validity_days: int = Field(default=30, ge=1, description="Quote validity period in days")
    is_active: bool = True

class QuotationTemplateCreate(QuotationTemplateBase):
    lines: List[QuotationTemplateLineCreate] = []

class QuotationTemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    plan_id: Optional[int] = None
    validity_days: Optional[int] = Field(None, ge=1)
    is_active: Optional[bool] = None
    lines: Optional[List[QuotationTemplateLineCreate]] = None

class QuotationTemplateRead(QuotationTemplateBase):
    id: int
    created_at: datetime
    updated_at: datetime
    plan: Optional[PlanRead] = None
    lines: List[QuotationTemplateLineRead] = []

    class Config:
        from_attributes = True

# --- Customer Quotation Schemas ---

class QuotationLineBase(BaseModel):
    product_id: int
    variant_id: Optional[int] = None
    description: Optional[str] = None
    quantity: int = Field(default=1, ge=1)
    unit_price: Decimal = Field(..., ge=0)
    discount_percent: Decimal = Field(default=Decimal("0.00"), ge=0, le=100)

class QuotationLineCreate(QuotationLineBase):
    pass

class QuotationLineRead(QuotationLineBase):
    id: int
    quotation_id: int
    line_total: Decimal
    product: Optional[ProductRead] = None
    variant: Optional[ProductVariantRead] = None

    class Config:
        from_attributes = True

class QuotationBase(BaseModel):
    customer_id: int
    plan_id: int
    template_id: Optional[int] = None
    valid_until: date
    payment_terms: str = Field(default="Immediate", description="Immediate, Net 15, Net 30, Net 60")
    notes: Optional[str] = None

class QuotationCreate(QuotationBase):
    lines: List[QuotationLineCreate] = []

class QuotationFromTemplateRequest(BaseModel):
    """Instantiate a ready-to-send quotation from a predefined template."""
    customer_id: int
    template_id: int
    payment_terms: Optional[str] = "Immediate"
    notes: Optional[str] = None

class QuotationUpdate(BaseModel):
    status: Optional[QuotationStatus] = None
    payment_terms: Optional[str] = None
    valid_until: Optional[date] = None
    notes: Optional[str] = None

class CustomerBrief(BaseModel):
    id: int
    user_id: int
    company_name: Optional[str] = None
    billing_address: Optional[str] = None
    phone: Optional[str] = None

    class Config:
        from_attributes = True

class QuotationRead(QuotationBase):
    id: int
    quote_number: str
    status: QuotationStatus
    subtotal: Decimal
    discount_total: Decimal
    tax_total: Decimal
    total_amount: Decimal
    created_at: datetime
    updated_at: datetime
    customer: Optional[CustomerBrief] = None
    plan: Optional[PlanRead] = None
    lines: List[QuotationLineRead] = []

    class Config:
        from_attributes = True
