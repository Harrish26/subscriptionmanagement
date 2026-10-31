"""Configurable Tax Rate database model."""
from decimal import Decimal
from sqlalchemy import (
    Column, 
    String, 
    Boolean, 
    Numeric
)
from app.core.database import Base
from app.models.base import TimeStampedBase

class Tax(Base, TimeStampedBase):
    """
    Configurable tax rates (e.g. GST 18%, VAT 5%, State Sales Tax 8.25%).
    Supports active/inactive toggles and default system tax assignment.
    """
    __tablename__ = "taxes"

    name = Column(String(100), unique=True, index=True, nullable=False)
    rate = Column(Numeric(5, 2, asdecimal=True), nullable=False)  # e.g. 18.00 for 18%
    description = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_default = Column(Boolean, default=False, nullable=False)

    def __repr__(self):
        return f"<Tax {self.name} rate={self.rate}% active={self.is_active}>"

