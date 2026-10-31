"""Subscription Plan database models."""
import enum
from decimal import Decimal
from sqlalchemy import (
    Column, 
    String, 
    Boolean, 
    Enum, 
    Numeric, 
    Integer, 
    Date
)

from app.core.database import Base
from app.models.base import TimeStampedBase

class BillingInterval(str, enum.Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    YEARLY = "yearly"

class Plan(Base, TimeStampedBase):
    """
    Subscription pricing and cadence plan.
    Governs billing frequency, minimum quantities, availability dates, and lifecycle rules.
    """
    __tablename__ = "plans"

    name = Column(String(255), nullable=False, index=True)
    description = Column(String(500), nullable=True)
    billing_interval = Column(
        Enum(BillingInterval), 
        default=BillingInterval.MONTHLY, 
        nullable=False
    )
    
    # Financial recurring cost stored strictly as Decimal (Numeric 12, 2)
    base_cost = Column(
        Numeric(12, 2, asdecimal=True), 
        default=Decimal("0.00"), 
        nullable=False
    )
    min_quantity = Column(Integer, default=1, nullable=False)
    
    available_from = Column(Date, nullable=False)
    available_to = Column(Date, nullable=True)

    # Lifecycle & Termination Rules (Brightloop Scene 2)
    auto_close_on_expiry = Column(Boolean, default=False, nullable=False)  # Close on own when ends
    allow_early_close = Column(Boolean, default=True, nullable=False)      # Can be closed early
    allow_pause = Column(Boolean, default=True, nullable=False)            # Can be paused
    allow_renewal = Column(Boolean, default=True, nullable=False)          # Can be renewed
    
    is_active = Column(Boolean, default=True, nullable=False)

    def __repr__(self):
        return f"<Plan id={self.id} name='{self.name}' interval={self.billing_interval.value} cost={self.base_cost}>"

