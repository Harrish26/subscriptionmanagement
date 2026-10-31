"""User and Customer database models."""
import enum
from decimal import Decimal
from sqlalchemy import (
    Column, 
    String, 
    Boolean, 
    Enum, 
    ForeignKey, 
    Numeric, 
    DateTime, 
    Integer
)
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.models.base import TimeStampedBase

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    STAFF = "staff"
    CUSTOMER = "customer"

class User(Base, TimeStampedBase):
    """User account entity with role-based access levels."""
    __tablename__ = "users"

    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.CUSTOMER, nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Password reset support
    reset_token = Column(String(255), nullable=True, index=True)
    reset_token_expiry = Column(DateTime, nullable=True)

    # Relationships
    customer_profile = relationship("Customer", back_populates="user", uselist=False, cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User id={self.id} email='{self.email}' role='{self.role.value}'>"

class Customer(Base, TimeStampedBase):
    """Customer profile entity linked to a User account."""
    __tablename__ = "customers"

    user_id = Column(
        Integer, 
        ForeignKey("users.id", ondelete="CASCADE"), 
        unique=True, 
        nullable=False, 
        index=True
    )
    company_name = Column(String(255), nullable=True)
    billing_address = Column(String(500), nullable=True)
    phone = Column(String(50), nullable=True)
    tax_identifier = Column(String(100), nullable=True)

    # Financial balance stored strictly as Decimal (Numeric 12, 2)
    credit_balance = Column(
        Numeric(12, 2, asdecimal=True), 
        default=Decimal("0.00"), 
        nullable=False
    )

    # Relationships
    user = relationship("User", back_populates="customer_profile")

    def __repr__(self):
        return f"<Customer id={self.id} user_id={self.user_id} company='{self.company_name}'>"

