"""Pydantic schemas for Tax Rates."""
from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field

class TaxBase(BaseModel):
    name: str = Field(..., max_length=100, description="e.g. GST 18%, VAT 5%")
    rate: Decimal = Field(..., ge=Decimal("0.00"), le=Decimal("100.00"), description="Tax rate percentage")
    description: Optional[str] = Field(None, max_length=255)
    is_active: bool = Field(default=True)
    is_default: bool = Field(default=False)

class TaxCreate(TaxBase):
    pass

class TaxUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    rate: Optional[Decimal] = Field(None, ge=Decimal("0.00"), le=Decimal("100.00"))
    description: Optional[str] = None
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None

class TaxRead(TaxBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

