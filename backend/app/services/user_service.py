"""User management and authentication service."""
import secrets
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import List, Optional
from sqlalchemy.orm import Session

from app.core.security import get_password_hash, verify_password, validate_password_strength
from app.models.user import User, Customer, UserRole
from app.schemas.user import UserCreate, UserStaffCreate

class UserService:
    @staticmethod
    def get_by_id(db: Session, user_id: int) -> Optional[User]:
        return db.query(User).filter(User.id == user_id).first()

    @staticmethod
    def get_by_email(db: Session, email: str) -> Optional[User]:
        return db.query(User).filter(User.email == email.lower().strip()).first()

    @staticmethod
    def create_customer_user(db: Session, user_in: UserCreate) -> User:
        """Creates a new customer user and initializes their Customer profile."""
        hashed_password = get_password_hash(user_in.password)
        db_user = User(
            email=user_in.email.lower().strip(),
            hashed_password=hashed_password,
            full_name=user_in.full_name.strip(),
            role=UserRole.CUSTOMER,
            is_active=True
        )
        db.add(db_user)
        db.flush()  # Obtain db_user.id

        # Create customer profile with initial Decimal zero balance
        customer = Customer(
            user_id=db_user.id,
            company_name=user_in.company_name or user_in.full_name,
            credit_balance=Decimal("0.00")
        )
        db.add(customer)
        db.commit()
        db.refresh(db_user)
        return db_user

    @staticmethod
    def create_staff_user(db: Session, staff_in: UserStaffCreate) -> User:
        """Admin-only: Creates an internal staff member."""
        hashed_password = get_password_hash(staff_in.password)
        db_user = User(
            email=staff_in.email.lower().strip(),
            hashed_password=hashed_password,
            full_name=staff_in.full_name.strip(),
            role=UserRole.STAFF,
            is_active=True
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user

    @staticmethod
    def create_admin_user_if_missing(
        db: Session, 
        email: str, 
        password: str, 
        full_name: str = "System Administrator"
    ) -> User:
        """Bootstraps the initial administrator if none exists."""
        existing = db.query(User).filter(User.email == email.lower().strip()).first()
        if existing:
            return existing
        hashed_password = get_password_hash(password)
        admin = User(
            email=email.lower().strip(),
            hashed_password=hashed_password,
            full_name=full_name,
            role=UserRole.ADMIN,
            is_active=True
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        return admin

    @staticmethod
    def authenticate(db: Session, email: str, password: str) -> Optional[User]:
        user = UserService.get_by_email(db, email=email)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user

    @staticmethod
    def generate_password_reset_token(db: Session, email: str) -> Optional[str]:
        user = UserService.get_by_email(db, email)
        if not user:
            return None
        token = secrets.token_urlsafe(32)
        user.reset_token = token
        user.reset_token_expiry = datetime.now(timezone.utc) + timedelta(hours=1)
        db.commit()
        return token

    @staticmethod
    def reset_password_with_token(db: Session, token: str, new_password: str) -> tuple[bool, str]:
        is_valid, error = validate_password_strength(new_password)
        if not is_valid:
            return False, error or "Invalid password"

        user = db.query(User).filter(User.reset_token == token).first()
        if not user:
            return False, "Invalid or expired reset token."
        
        now = datetime.now(timezone.utc)
        # Handle naive vs aware datetime for sqlite
        expiry = user.reset_token_expiry
        if expiry and expiry.tzinfo is None:
            expiry = expiry.replace(tzinfo=timezone.utc)

        if not expiry or expiry < now:
            return False, "Reset token has expired."

        user.hashed_password = get_password_hash(new_password)
        user.reset_token = None
        user.reset_token_expiry = None
        db.commit()
        return True, "Password reset successfully."

    @staticmethod
    def list_users(db: Session, role: Optional[UserRole] = None) -> List[User]:
        query = db.query(User)
        if role:
            query = query.filter(User.role == role)
        return query.order_by(User.id.asc()).all()

