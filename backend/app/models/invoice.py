"""Invoice and Invoice Line database models with Idempotency Unique Constraints."""
import enum
from decimal import Decimal
from sqlalchemy import (
    Column, 
    String, 
    Enum, 
    ForeignKey, 
    Numeric, 
    Integer, 
    Date,
    UniqueConstraint
)
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.base import TimeStampedBase

class InvoiceStatus(str, enum.Enum):
    DRAFT = "draft"
    CONFIRMED = "confirmed"  # legacy alias for unpaid
    UNPAID = "unpaid"
    PARTIALLY_PAID = "partially_paid"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"

class Invoice(Base, TimeStampedBase):
    """
    Generated billing cycle invoice.
    Enforces idempotency using unique constraint on (subscription_id, billing_period_start, billing_period_end)
    guaranteeing no subscription can ever be billed twice for the same billing window.
    """
    __tablename__ = "invoices"

    invoice_number = Column(String(50), unique=True, index=True, nullable=False)
    subscription_id = Column(
        Integer, 
        ForeignKey("subscriptions.id", ondelete="CASCADE"), 
        nullable=False, 
        index=True
    )
    customer_id = Column(
        Integer, 
        ForeignKey("customers.id", ondelete="CASCADE"), 
        nullable=False, 
        index=True
    )
    
    # Billing cycle window
    billing_period_start = Column(Date, nullable=False)
    billing_period_end = Column(Date, nullable=False)
    issue_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False)

    status = Column(
        Enum(InvoiceStatus), 
        default=InvoiceStatus.CONFIRMED, 
        nullable=False, 
        index=True
    )

    # Financial breakdown strictly in Decimal (Numeric 12, 2)
    subtotal = Column(Numeric(12, 2, asdecimal=True), default=Decimal("0.00"), nullable=False)
    discount_total = Column(Numeric(12, 2, asdecimal=True), default=Decimal("0.00"), nullable=False)
    tax_total = Column(Numeric(12, 2, asdecimal=True), default=Decimal("0.00"), nullable=False)
    total_amount = Column(Numeric(12, 2, asdecimal=True), default=Decimal("0.00"), nullable=False)
    amount_paid = Column(Numeric(12, 2, asdecimal=True), default=Decimal("0.00"), nullable=False)
    balance_due = Column(Numeric(12, 2, asdecimal=True), default=Decimal("0.00"), nullable=False)

    notes = Column(String(1000), nullable=True)

    # CRITICAL IDEMPOTENCY KEY: Zero duplicate invoices for the same subscription period
    __table_args__ = (
        UniqueConstraint(
            "subscription_id", 
            "billing_period_start", 
            "billing_period_end", 
            name="uq_subscription_billing_period"
        ),
    )

    # Relationships
    subscription = relationship("Subscription", back_populates="invoices")
    customer = relationship("Customer")
    lines = relationship(
        "InvoiceLine", 
        back_populates="invoice", 
        cascade="all, delete-orphan"
    )
    payments = relationship(
        "Payment", 
        back_populates="invoice", 
        cascade="all, delete-orphan",
        order_by="Payment.id.desc()"
    )
    reminders = relationship(
        "PaymentReminder", 
        back_populates="invoice", 
        cascade="all, delete-orphan",
        order_by="PaymentReminder.id.desc()"
    )

    @property
    def subscription_number(self):
        return self.subscription.subscription_number if self.subscription else None

    def __repr__(self):
        return f"<Invoice {self.invoice_number} sub={self.subscription_id} total=${self.total_amount} status={self.status.value}>"

class InvoiceLine(Base, TimeStampedBase):
    """Detailed itemized line on a generated invoice."""
    __tablename__ = "invoice_lines"

    invoice_id = Column(
        Integer, 
        ForeignKey("invoices.id", ondelete="CASCADE"), 
        nullable=False, 
        index=True
    )
    product_id = Column(
        Integer, 
        ForeignKey("products.id", ondelete="SET NULL"), 
        nullable=True
    )
    variant_id = Column(
        Integer, 
        ForeignKey("product_variants.id", ondelete="SET NULL"), 
        nullable=True
    )
    description = Column(String(255), nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
    
    unit_price = Column(Numeric(12, 2, asdecimal=True), nullable=False)
    discount_percent = Column(Numeric(5, 2, asdecimal=True), default=Decimal("0.00"), nullable=False)
    tax_rate = Column(Numeric(5, 2, asdecimal=True), default=Decimal("0.00"), nullable=False)
    line_total = Column(Numeric(12, 2, asdecimal=True), nullable=False)

    # Relationships
    invoice = relationship("Invoice", back_populates="lines")
    product = relationship("Product")
    variant = relationship("ProductVariant")

