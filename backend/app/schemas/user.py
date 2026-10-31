"""User and Customer Pydantic schemas."""
from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, field_validator

from app.core.security import validate_password_strength
from app.models.user import UserRole

class CustomerProfileBase(BaseModel):
    company_name: Optional[str] = None
    billing_address: Optional[str] = None
    phone: Optional[str] = None
    tax_identifier: Optional[str] = None

class CustomerProfileCreate(CustomerProfileBase):
    pass

class CustomerProfileRead(CustomerProfileBase):
    id: int
    user_id: int
    credit_balance: Decimal
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRole = UserRole.CUSTOMER

class UserCreate(UserBase):
    password: str
    company_name: Optional[str] = None  # Optional quick profile creation for customer

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        is_valid, error_msg = validate_password_strength(v)
        if not is_valid:
            raise ValueError(error_msg)
        return v

class UserStaffCreate(BaseModel):
    """Admin-only payload to create internal staff members."""
    email: EmailStr
    full_name: str
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        is_valid, error_msg = validate_password_strength(v)
        if not is_valid:
            raise ValueError(error_msg)
        return v

class CustomerCreateByStaff(BaseModel):
    """Payload for staff/admin to onboard a new customer."""
    full_name: str
    email: EmailStr
    password: Optional[str] = "Customer@Brightloop2026!"
    company_name: Optional[str] = None
    billing_address: Optional[str] = None
    phone: Optional[str] = None
    tax_identifier: Optional[str] = None

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: Optional[str]) -> str:
        val = v or "Customer@Brightloop2026!"
        is_valid, error_msg = validate_password_strength(val)
        if not is_valid:
            raise ValueError(error_msg)
        return val

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    is_active: Optional[bool] = None

class UserRead(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    customer_profile: Optional[CustomerProfileRead] = None

    class Config:
        from_attributes = True

class CustomerEnrichedRead(BaseModel):
    customer_id: int
    user_id: int
    full_name: str
    email: str
    company_name: Optional[str] = None
    billing_address: Optional[str] = None
    phone: Optional[str] = None
    tax_identifier: Optional[str] = None
    credit_balance: Decimal = Decimal("0.00")
    active_subscriptions_count: int = 0
    total_subscriptions_count: int = 0
    total_invoices_count: int = 0
    overdue_invoices_count: int = 0
    total_spend: Decimal = Decimal("0.00")
    outstanding_balance: Decimal = Decimal("0.00")
    current_mrr: Decimal = Decimal("0.00")
    churn_probability_pct: float = 0.0
    churn_risk_tier: str = "Low"
    churn_risk_score: int = 0
    primary_churn_driver: Optional[str] = None
    created_at: datetime

class CustomerFullDetailRead(BaseModel):
    profile: CustomerEnrichedRead
    subscriptions: List[Dict[str, Any]] = []
    invoices: List[Dict[str, Any]] = []
    payments: List[Dict[str, Any]] = []
    risk_analysis: Optional[Dict[str, Any]] = None
