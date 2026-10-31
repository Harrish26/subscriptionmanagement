"""User management and authentication service."""
import secrets
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import List, Optional
from sqlalchemy.orm import Session

from app.core.security import get_password_hash, verify_password, validate_password_strength
from app.models.user import User, Customer, UserRole
from app.schemas.user import (
    UserCreate, 
    UserStaffCreate,
    CustomerCreateByStaff,
    CustomerEnrichedRead,
    CustomerFullDetailRead
)

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

    @staticmethod
    def create_customer_by_staff(db: Session, cust_in: CustomerCreateByStaff) -> Customer:
        """Staff/Admin creates a customer account and profile."""
        existing = db.query(User).filter(User.email == cust_in.email.lower().strip()).first()
        if existing:
            raise ValueError(f"User with email '{cust_in.email}' already exists.")

        hashed_password = get_password_hash(cust_in.password or "Customer@Brightloop2026!")
        db_user = User(
            email=cust_in.email.lower().strip(),
            hashed_password=hashed_password,
            full_name=cust_in.full_name.strip(),
            role=UserRole.CUSTOMER,
            is_active=True
        )
        db.add(db_user)
        db.flush()

        customer = Customer(
            user_id=db_user.id,
            company_name=cust_in.company_name or cust_in.full_name,
            billing_address=cust_in.billing_address,
            phone=cust_in.phone,
            tax_identifier=cust_in.tax_identifier,
            credit_balance=Decimal("0.00")
        )
        db.add(customer)
        db.commit()
        db.refresh(customer)
        return customer

    @staticmethod
    def list_customers_enriched(db: Session) -> List[CustomerEnrichedRead]:
        """Returns all customers enriched with live subscription counts, balances, spend, and ML churn scores."""
        from app.models.subscription import Subscription, SubscriptionStatus
        from app.models.invoice import Invoice, InvoiceStatus
        from app.models.plan import BillingInterval
        from app.services.ml_service import MLService

        customers = db.query(Customer).join(User).all()
        enriched_list = []

        for cust in customers:
            user = cust.user
            # Subscriptions
            subs = db.query(Subscription).filter(Subscription.customer_id == cust.id).all()
            active_subs = [s for s in subs if s.status == SubscriptionStatus.ACTIVE]
            
            # Invoices
            invs = db.query(Invoice).filter(Invoice.customer_id == cust.id).all()
            overdue_invs = [i for i in invs if i.status == InvoiceStatus.OVERDUE]
            outstanding = sum((i.balance_due for i in invs if i.status != InvoiceStatus.CANCELLED), Decimal("0.00"))
            total_spend = sum((i.amount_paid for i in invs), Decimal("0.00"))

            # Calculate current MRR
            cust_mrr = Decimal("0.00")
            for s in active_subs:
                sub_cadence = s.plan.billing_interval if s.plan else BillingInterval.MONTHLY
                sub_val = s.subtotal - s.discount_total
                if sub_cadence == BillingInterval.DAILY:
                    m_val = sub_val * Decimal("30")
                elif sub_cadence == BillingInterval.WEEKLY:
                    m_val = (sub_val / Decimal("7")) * Decimal("30")
                elif sub_cadence == BillingInterval.MONTHLY:
                    m_val = sub_val
                elif sub_cadence == BillingInterval.YEARLY:
                    m_val = sub_val / Decimal("12")
                else:
                    m_val = sub_val
                cust_mrr += m_val

            # Churn prediction
            try:
                pred = MLService.predict_customer_churn(cust.id, db)
                churn_prob = pred.churn_probability_pct
                churn_tier = pred.risk_tier
                churn_score = pred.risk_score
                primary_driver = pred.contributing_factors[0] if pred.contributing_factors else None
            except Exception:
                churn_prob = 10.0
                churn_tier = "Low"
                churn_score = 10
                primary_driver = "Healthy customer standing"

            enriched_list.append(CustomerEnrichedRead(
                customer_id=cust.id,
                user_id=cust.user_id,
                full_name=user.full_name if user else "Unknown Customer",
                email=user.email if user else "",
                company_name=cust.company_name,
                billing_address=cust.billing_address,
                phone=cust.phone,
                tax_identifier=cust.tax_identifier,
                credit_balance=cust.credit_balance,
                active_subscriptions_count=len(active_subs),
                total_subscriptions_count=len(subs),
                total_invoices_count=len(invs),
                overdue_invoices_count=len(overdue_invs),
                total_spend=total_spend,
                outstanding_balance=outstanding,
                current_mrr=cust_mrr,
                churn_probability_pct=churn_prob,
                churn_risk_tier=churn_tier,
                churn_risk_score=churn_score,
                primary_churn_driver=primary_driver,
                created_at=cust.created_at or datetime.utcnow()
            ))

        enriched_list.sort(key=lambda x: (x.churn_risk_score, x.outstanding_balance), reverse=True)
        return enriched_list

    @staticmethod
    def get_customer_full_detail(db: Session, customer_id: int) -> CustomerFullDetailRead:
        """Returns deep-dive customer profile with itemized subscriptions, invoices, and payments."""
        from app.models.subscription import Subscription
        from app.models.invoice import Invoice
        from app.models.payment import Payment
        from app.services.ml_service import MLService

        cust = db.query(Customer).filter(Customer.id == customer_id).first()
        if not cust:
            raise ValueError(f"Customer with ID {customer_id} not found.")

        enriched = [c for c in UserService.list_customers_enriched(db) if c.customer_id == customer_id]
        if not enriched:
            raise ValueError(f"Customer {customer_id} profile could not be loaded.")
        profile = enriched[0]

        subs = db.query(Subscription).filter(Subscription.customer_id == customer_id).order_by(Subscription.id.desc()).all()
        invs = db.query(Invoice).filter(Invoice.customer_id == customer_id).order_by(Invoice.id.desc()).all()
        pays = db.query(Payment).filter(Payment.customer_id == customer_id).order_by(Payment.id.desc()).all()

        subs_data = [{
            "id": s.id,
            "subscription_number": s.subscription_number,
            "plan_name": s.plan.name if s.plan else "Custom Plan",
            "status": s.status.value,
            "total_amount": float(s.total_amount),
            "start_date": str(s.start_date),
            "next_billing_date": str(s.next_billing_date),
            "expiry_date": str(s.expiry_date) if s.expiry_date else None,
            "billing_interval": s.plan.billing_interval.value if s.plan else "monthly"
        } for s in subs]

        invs_data = [{
            "id": i.id,
            "invoice_number": i.invoice_number,
            "issue_date": str(i.issue_date),
            "due_date": str(i.due_date),
            "total_amount": float(i.total_amount),
            "amount_paid": float(i.amount_paid),
            "balance_due": float(i.balance_due),
            "status": i.status.value
        } for i in invs]

        pays_data = [{
            "id": p.id,
            "payment_number": p.payment_number,
            "invoice_number": p.invoice.invoice_number if p.invoice else f"INV-{p.invoice_id}",
            "amount": float(p.amount),
            "payment_date": str(p.payment_date),
            "payment_method": p.payment_method.value,
            "transaction_reference": p.transaction_reference
        } for p in pays]

        try:
            pred = MLService.predict_customer_churn(customer_id, db)
            risk_dict = pred.model_dump()
        except Exception:
            risk_dict = None

        return CustomerFullDetailRead(
            profile=profile,
            subscriptions=subs_data,
            invoices=invs_data,
            payments=pays_data,
            risk_analysis=risk_dict
        )

