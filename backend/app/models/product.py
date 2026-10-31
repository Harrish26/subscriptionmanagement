"""Product and Multi-Attribute Variant database models."""
from decimal import Decimal
from typing import Dict, Any, Optional
from sqlalchemy import (
    Column, 
    String, 
    Boolean, 
    ForeignKey, 
    Numeric, 
    Integer, 
    JSON
)
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.base import TimeStampedBase

class Product(Base, TimeStampedBase):
    """Product entity for subscription software, add-ons, or variants."""
    __tablename__ = "products"

    name = Column(String(255), nullable=False, index=True)
    product_type = Column(String(50), default="software", nullable=False)  # software, service, addon, hardware
    sales_price = Column(Numeric(12, 2, asdecimal=True), nullable=False)
    cost_price = Column(Numeric(12, 2, asdecimal=True), default=Decimal("0.00"), nullable=False)
    notes = Column(String(1000), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    variants = relationship("ProductVariant", back_populates="product", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Product id={self.id} name='{self.name}' price={self.sales_price}>"

class ProductVariant(Base, TimeStampedBase):
    """
    Multi-attribute product variant with dynamic surcharge pricing.
    Supports attribute combinations such as Brand (e.g. Odoo +560), Size, Tier, etc.
    """
    __tablename__ = "product_variants"

    product_id = Column(
        Integer, 
        ForeignKey("products.id", ondelete="CASCADE"), 
        nullable=False, 
        index=True
    )
    variant_name = Column(String(255), nullable=False)  # e.g., 'Brand: Odoo' or 'Tier: Enterprise'
    sku = Column(String(100), nullable=True)
    
    # Flexible multi-attribute combination dictionary (e.g. {"brand": "Odoo", "size": "Large"})
    attributes = Column(JSON, nullable=True)

    # Surcharge amount strictly in Decimal (e.g., +560.00)
    price_surcharge = Column(
        Numeric(12, 2, asdecimal=True), 
        default=Decimal("0.00"), 
        nullable=False
    )
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    product = relationship("Product", back_populates="variants")

    @property
    def effective_price(self) -> Decimal:
        """Computes base product price + variant surcharge."""
        if self.product:
            return self.product.sales_price + self.price_surcharge
        return self.price_surcharge

    def __repr__(self):
        return f"<ProductVariant id={self.id} name='{self.variant_name}' surcharge={self.price_surcharge}>"
