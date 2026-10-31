"""Pydantic schemas for Products and Multi-Attribute Variants."""
from datetime import datetime
from decimal import Decimal
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

# --- Product Variant Schemas ---

class ProductVariantBase(BaseModel):
    variant_name: str = Field(..., min_length=1, max_length=255, description="e.g. 'Brand: Odoo' or 'Enterprise Tier'")
    sku: Optional[str] = None
    attributes: Optional[Dict[str, Any]] = None  # e.g. {"brand": "Odoo", "size": "Pro"}
    price_surcharge: Decimal = Field(default=Decimal("0.00"), description="Additional surcharge added to product sales price")
    is_active: bool = True

class ProductVariantCreate(ProductVariantBase):
    pass

class ProductVariantUpdate(BaseModel):
    variant_name: Optional[str] = None
    sku: Optional[str] = None
    attributes: Optional[Dict[str, Any]] = None
    price_surcharge: Optional[Decimal] = None
    is_active: Optional[bool] = None

class ProductVariantRead(ProductVariantBase):
    id: int
    product_id: int
    effective_price: Optional[Decimal] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- Product Schemas ---

class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    product_type: str = Field(default="software", description="software, service, addon, hardware")
    sales_price: Decimal = Field(..., ge=0, description="Base recurring or one-time sales price")
    cost_price: Decimal = Field(default=Decimal("0.00"), ge=0, description="Internal cost of goods sold")
    notes: Optional[str] = None
    is_active: bool = True

class ProductCreate(ProductBase):
    variants: Optional[List[ProductVariantCreate]] = None

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    product_type: Optional[str] = None
    sales_price: Optional[Decimal] = Field(None, ge=0)
    cost_price: Optional[Decimal] = Field(None, ge=0)
    notes: Optional[str] = None
    is_active: Optional[bool] = None

class ProductRead(ProductBase):
    id: int
    created_at: datetime
    updated_at: datetime
    variants: List[ProductVariantRead] = []

    class Config:
        from_attributes = True
