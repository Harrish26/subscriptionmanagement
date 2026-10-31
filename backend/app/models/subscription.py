"""Subscription and Subscription Line database models."""
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

class SubscriptionStatus(str, enum.Enum):
    DRAFT = "draft"
    QUOTATION = "quotation"
    CONFIRMED = "confirmed"
    ACTIVE = "active"
    PAUSED = "paused"
    CLOSED = "closed"

class Subscription(Base, TimeStampedBase):
    """
    Recurring Subscription contract.
    Maintains strict lifecycle states, billing schedules, and links to customer and plan.
    """
    __tablename__ = "subscriptions"

    subscription_number = Column(String(50), unique=True, index=True, nullable=False)
    customer_id = Column(
        Integer, 
        ForeignKey("customers.id", ondelete="CASCADE"), 
        nullable=False, 
        index=True
    )
    plan_id = Column(
        Integer, 
        ForeignKey("plans.id", ondelete="RESTRICT"), 
        nullable=False,
        index=True
    )
    quotation_id = Column(
        Integer, 
        ForeignKey("quotations.id", ondelete="SET NULL"), 
        nullable=True
    )
    status = Column(
        Enum(SubscriptionStatus), 
        default=SubscriptionStatus.DRAFT, 
        nullable=False, 
        index=True
    )
    start_date = Column(Date, nullable=False)
    expiry_date = Column(Date, nullable=True)
    next_billing_date = Column(Date, nullable=False, index=True)
    current_billing_cycle = Column(Integer, default=0, nullable=False)
    payment_terms = Column(String(50), default="Immediate", nullable=False)

    # Financial recurring amount strictly in Decimal (Numeric 12, 2)
    subtotal = Column(Numeric(12, 2, asdecimal=True), default=Decimal("0.00"), nullable=False)
    discount_total = Column(Numeric(12, 2, asdecimal=True), default=Decimal("0.00"), nullable=False)
    tax_total = Column(Numeric(12, 2, asdecimal=True), default=Decimal("0.00"), nullable=False)
    total_amount = Column(Numeric(12, 2, asdecimal=True), default=Decimal("0.00"), nullable=False)

    notes = Column(String(1000), nullable=True)

    # Relationships
    customer = relationship("Customer")
    plan = relationship("Plan")
    quotation = relationship("Quotation")
    lines = relationship(
        "SubscriptionLine", 
        back_populates="subscription", 
        cascade="all, delete-orphan"
    )
    invoices = relationship(
        "Invoice", 
        back_populates="subscription", 
        cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Subscription {self.subscription_number} status={self.status.value} next_due={self.next_billing_date}>"

class SubscriptionLine(Base, TimeStampedBase):
    """Itemized recurring product line within a subscription."""
    __tablename__ = "subscription_lines"

    subscription_id = Column(
        Integer, 
        ForeignKey("subscriptions.id", ondelete="CASCADE"), 
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
    subscription = relationship("Subscription", back_populates="lines")
    product = relationship("Product")
    variant = relationship("ProductVariant")

