"""User and Customer Pydantic schemas."""
from datetime import datetime
from decimal import Decimal
from typing import Optional
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

