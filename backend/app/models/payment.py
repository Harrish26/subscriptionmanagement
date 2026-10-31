"""Payment and Payment Reminder database models."""
import enum
from datetime import datetime
from decimal import Decimal
from sqlalchemy import (
    Column, 
    String, 
    Enum, 
    Numeric, 
    Integer, 
    Date,
    DateTime,
    ForeignKey
)
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.base import TimeStampedBase

class PaymentMethod(str, enum.Enum):
    UPI = "upi"
    CASH = "cash"
    CARD = "card"
    BANK_TRANSFER = "bank_transfer"

class Payment(Base, TimeStampedBase):
    """
    Payment transaction record linked to an invoice.
    Supports partial and full payments, calculates balances, and records payment methods.
    """
    __tablename__ = "payments"

    payment_number = Column(String(50), unique=True, index=True, nullable=False)
    invoice_id = Column(
        Integer, 
        ForeignKey("invoices.id", ondelete="CASCADE"), 
        nullable=False, 
        index=True
    )
    customer_id = Column(
        Integer, 
        ForeignKey("customers.id", ondelete="CASCADE"), 
        nullable=False, 
        index=True
    )
    
    amount = Column(Numeric(12, 2, asdecimal=True), nullable=False)
    payment_date = Column(Date, nullable=False)
    payment_method = Column(
        Enum(PaymentMethod), 
        default=PaymentMethod.UPI, 
        nullable=False
    )
    transaction_reference = Column(String(100), nullable=True)  # UPI Ref, Bank UTR, Card Auth Code
    notes = Column(String(500), nullable=True)

    # Relationships
    invoice = relationship("Invoice", back_populates="payments")
    customer = relationship("Customer")

    def __repr__(self):
        return f"<Payment {self.payment_number} inv={self.invoice_id} amt=${self.amount} method={self.payment_method.value}>"

class PaymentReminder(Base, TimeStampedBase):
    """Audit log for automated and manual payment reminders sent for overdue invoices."""
    __tablename__ = "payment_reminders"

    invoice_id = Column(
        Integer, 
        ForeignKey("invoices.id", ondelete="CASCADE"), 
        nullable=False, 
        index=True
    )
    customer_id = Column(
        Integer, 
        ForeignKey("customers.id", ondelete="CASCADE"), 
        nullable=False, 
        index=True
    )
    
    reminder_channel = Column(String(50), default="email", nullable=False)  # email, sms, portal
    reminder_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    due_date = Column(Date, nullable=False)
    amount_due = Column(Numeric(12, 2, asdecimal=True), nullable=False)
    message = Column(String(1000), nullable=True)
    sent_by_user_id = Column(
        Integer, 
        ForeignKey("users.id", ondelete="SET NULL"), 
        nullable=True
    )

    # Relationships
    invoice = relationship("Invoice", back_populates="reminders")
    customer = relationship("Customer")
    sent_by = relationship("User")

    def __repr__(self):
        return f"<PaymentReminder inv={self.invoice_id} amt_due=${self.amount_due} at={self.reminder_date}>"

