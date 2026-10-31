"""Configurable Discount Rule database model."""
import enum
from decimal import Decimal
from sqlalchemy import (
    Column, 
    String, 
    Boolean, 
    Enum, 
    Numeric, 
    Integer, 
    Date,
    ForeignKey
)
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.base import TimeStampedBase

class DiscountType(str, enum.Enum):
    PERCENTAGE = "percentage"
    FIXED = "fixed"

class DiscountScope(str, enum.Enum):
    ALL = "all"
    SUBSCRIPTION = "subscription"
    PRODUCT = "product"

class Discount(Base, TimeStampedBase):
    """
    Discount codes and promotional rules.
    Supports percentage or fixed amounts, minimum purchase thresholds,
    start/expiry dates, usage limits, and product or subscription scope.
    """
    __tablename__ = "discounts"

    code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    discount_type = Column(
        Enum(DiscountType), 
        default=DiscountType.PERCENTAGE, 
        nullable=False
    )
    # Fixed amount or percentage (e.g. 15.00 for 15% or $15.00 off)
    value = Column(Numeric(12, 2, asdecimal=True), nullable=False)
    
    # Validation constraints
    min_purchase_amount = Column(Numeric(12, 2, asdecimal=True), default=Decimal("0.00"), nullable=False)
    start_date = Column(Date, nullable=True)
    expiry_date = Column(Date, nullable=True)
    max_uses = Column(Integer, nullable=True)  # None = unlimited
    used_count = Column(Integer, default=0, nullable=False)

    scope = Column(
        Enum(DiscountScope), 
        default=DiscountScope.ALL, 
        nullable=False
    )
    product_id = Column(
        Integer, 
        ForeignKey("products.id", ondelete="SET NULL"), 
        nullable=True
    )
    
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    product = relationship("Product")

    def __repr__(self):
        return f"<Discount {self.code} type={self.discount_type.value} value={self.value}>"

