"""Quotation Template and Quotation Offer database models."""
import enum
from decimal import Decimal
from sqlalchemy import (
    Column, 
    String, 
    Boolean, 
    Enum, 
    ForeignKey, 
    Numeric, 
    Integer, 
    Date
)
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.base import TimeStampedBase

class QuotationStatus(str, enum.Enum):
    DRAFT = "draft"
    SENT = "sent"
    CONFIRMED = "confirmed"
    REJECTED = "rejected"
    EXPIRED = "expired"

class QuotationTemplate(Base, TimeStampedBase):
    """
    Standardized quotation blueprint containing predefined plan and product lines.
    Allows sales reps to construct customer proposals in seconds.
    """
    __tablename__ = "quotation_templates"

    name = Column(String(255), nullable=False, index=True)
    description = Column(String(500), nullable=True)
    plan_id = Column(
        Integer, 
        ForeignKey("plans.id", ondelete="RESTRICT"), 
        nullable=False
    )
    # Stays valid for a set number of days (e.g. 15, 30 days)
    validity_days = Column(Integer, default=30, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    plan = relationship("Plan")
    lines = relationship(
        "QuotationTemplateLine", 
        back_populates="template", 
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<QuotationTemplate id={self.id} name='{self.name}' validity={self.validity_days}d>"

class QuotationTemplateLine(Base, TimeStampedBase):
    """Line item within a quotation template."""
    __tablename__ = "quotation_template_lines"

    template_id = Column(
        Integer, 
        ForeignKey("quotation_templates.id", ondelete="CASCADE"), 
        nullable=False, 
        index=True
    )
    product_id = Column(
        Integer, 
        ForeignKey("products.id", ondelete="CASCADE"), 
        nullable=False
    )
    variant_id = Column(
        Integer, 
        ForeignKey("product_variants.id", ondelete="SET NULL"), 
        nullable=True
    )
    quantity = Column(Integer, default=1, nullable=False)
    
    # Custom unit price override, or defaults to product + variant price
    unit_price = Column(Numeric(12, 2, asdecimal=True), nullable=True)
    discount_percent = Column(Numeric(5, 2, asdecimal=True), default=Decimal("0.00"), nullable=False)

    # Relationships
    template = relationship("QuotationTemplate", back_populates="lines")
    product = relationship("Product")
    variant = relationship("ProductVariant")

class Quotation(Base, TimeStampedBase):
    """
    Customer-specific quotation offer with calculated totals and lifecycle tracking.
    Can be derived from a template or generated custom by sales reps.
    """
    __tablename__ = "quotations"

    quote_number = Column(String(50), unique=True, index=True, nullable=False)
    customer_id = Column(
        Integer, 
        ForeignKey("customers.id", ondelete="CASCADE"), 
        nullable=False, 
        index=True
    )
    plan_id = Column(
        Integer, 
        ForeignKey("plans.id", ondelete="RESTRICT"), 
        nullable=False
    )
    template_id = Column(
        Integer, 
        ForeignKey("quotation_templates.id", ondelete="SET NULL"), 
        nullable=True
    )
    status = Column(
        Enum(QuotationStatus), 
        default=QuotationStatus.DRAFT, 
        nullable=False, 
        index=True
    )
    valid_until = Column(Date, nullable=False)
    payment_terms = Column(String(50), default="Immediate", nullable=False)
    
    # Financial summary stored strictly as Decimal (Numeric 12, 2)
    subtotal = Column(Numeric(12, 2, asdecimal=True), default=Decimal("0.00"), nullable=False)
    discount_total = Column(Numeric(12, 2, asdecimal=True), default=Decimal("0.00"), nullable=False)
    tax_total = Column(Numeric(12, 2, asdecimal=True), default=Decimal("0.00"), nullable=False)
    total_amount = Column(Numeric(12, 2, asdecimal=True), default=Decimal("0.00"), nullable=False)
    
    notes = Column(String(1000), nullable=True)

    # Relationships
    customer = relationship("Customer")
    plan = relationship("Plan")
    template = relationship("QuotationTemplate")
    lines = relationship(
        "QuotationLine", 
        back_populates="quotation", 
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Quotation {self.quote_number} customer={self.customer_id} total={self.total_amount}>"

class QuotationLine(Base, TimeStampedBase):
    """Detailed itemized line within a customer quotation."""
    __tablename__ = "quotation_lines"

    quotation_id = Column(
        Integer, 
        ForeignKey("quotations.id", ondelete="CASCADE"), 
        nullable=False, 
        index=True
    )
    product_id = Column(
        Integer, 
        ForeignKey("products.id", ondelete="CASCADE"), 
        nullable=False
    )
    variant_id = Column(
        Integer, 
        ForeignKey("product_variants.id", ondelete="SET NULL"), 
        nullable=True
    )
    description = Column(String(255), nullable=True)
    quantity = Column(Integer, default=1, nullable=False)
    
    unit_price = Column(Numeric(12, 2, asdecimal=True), nullable=False)
    discount_percent = Column(Numeric(5, 2, asdecimal=True), default=Decimal("0.00"), nullable=False)
    line_total = Column(Numeric(12, 2, asdecimal=True), nullable=False)

    # Relationships
    quotation = relationship("Quotation", back_populates="lines")
    product = relationship("Product")
    variant = relationship("ProductVariant")

