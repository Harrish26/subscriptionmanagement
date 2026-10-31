"""Pydantic schemas for Discounts."""
from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field, model_validator

from app.models.discount import DiscountType, DiscountScope

class DiscountBase(BaseModel):
    code: str = Field(..., min_length=2, max_length=50, description="Unique promo code, e.g. SAVE20")
    name: str = Field(..., max_length=255)
    discount_type: DiscountType = Field(default=DiscountType.PERCENTAGE)
    value: Decimal = Field(..., gt=Decimal("0.00"), description="Percentage (e.g. 20.00) or Fixed Amount (e.g. 50.00)")
    min_purchase_amount: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"))
    start_date: Optional[date] = None
    expiry_date: Optional[date] = None
    max_uses: Optional[int] = Field(None, ge=1)
    scope: DiscountScope = Field(default=DiscountScope.ALL)
    product_id: Optional[int] = None
    is_active: bool = Field(default=True)

    @model_validator(mode="after")
    def validate_dates_and_values(self):
        if self.start_date and self.expiry_date and self.expiry_date < self.start_date:
            raise ValueError("Discount expiry date cannot precede start date.")
        if self.discount_type == DiscountType.PERCENTAGE and self.value > Decimal("100.00"):
            raise ValueError("Percentage discount value cannot exceed 100%.")
        return self

class DiscountCreate(DiscountBase):
    pass

class DiscountUpdate(BaseModel):
    name: Optional[str] = None
    value: Optional[Decimal] = None
    min_purchase_amount: Optional[Decimal] = None
    start_date: Optional[date] = None
    expiry_date: Optional[date] = None
    max_uses: Optional[int] = None
    scope: Optional[DiscountScope] = None
    product_id: Optional[int] = None
    is_active: Optional[bool] = None

class DiscountRead(DiscountBase):
    id: int
    used_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class DiscountValidateRequest(BaseModel):
    code: str
    purchase_amount: Decimal = Field(..., ge=Decimal("0.00"))
    product_id: Optional[int] = None
    is_subscription: bool = True

class DiscountValidateResponse(BaseModel):
    valid: bool
    message: str
    discount_amount: Decimal = Decimal("0.00")
    discount: Optional[DiscountRead] = None
