"""Subscription lifecycle management and State Machine service."""
from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status

from app.models.subscription import Subscription, SubscriptionLine, SubscriptionStatus
from app.models.product import Product, ProductVariant
from app.models.plan import Plan, BillingInterval
from app.models.quotation import Quotation, QuotationStatus
from app.models.user import Customer
from app.schemas.subscription import (
    SubscriptionCreate, 
    SubscriptionFromQuotationRequest, 
    SubscriptionTransitionRequest
)

TWOPLACES = Decimal("0.01")

class SubscriptionService:
    @staticmethod
    def calculate_next_billing_date(start_date: date, interval: BillingInterval) -> date:
        """Computes next billing due date based on plan interval."""
        if interval == BillingInterval.DAILY:
            return start_date + timedelta(days=1)
        elif interval == BillingInterval.WEEKLY:
            return start_date + timedelta(weeks=1)
        elif interval == BillingInterval.MONTHLY:
            # Safe 30-day billing cycle
            return start_date + timedelta(days=30)
        elif interval == BillingInterval.YEARLY:
            return start_date + timedelta(days=365)
        return start_date + timedelta(days=30)

    @staticmethod
    def _generate_subscription_number(db: Session) -> str:
        """Generates sequential subscription identifier (e.g. SUB-2026-0001)."""
        year = date.today().year
        count = db.query(Subscription).count() + 1
        return f"SUB-{year}-{count:04d}"

    @staticmethod
    def get_by_id(db: Session, subscription_id: int) -> Optional[Subscription]:
        return (
            db.query(Subscription)
            .options(
                joinedload(Subscription.customer),
                joinedload(Subscription.plan),
                joinedload(Subscription.lines).joinedload(SubscriptionLine.product),
                joinedload(Subscription.lines).joinedload(SubscriptionLine.variant),
                joinedload(Subscription.invoices)
            )
            .filter(Subscription.id == subscription_id)
            .first()
        )

    @staticmethod
    def list_subscriptions(
        db: Session, 
        customer_id: Optional[int] = None, 
        status_filter: Optional[SubscriptionStatus] = None
    ) -> List[Subscription]:
        query = db.query(Subscription).options(
            joinedload(Subscription.customer),
            joinedload(Subscription.plan),
            joinedload(Subscription.lines).joinedload(SubscriptionLine.product),
            joinedload(Subscription.lines).joinedload(SubscriptionLine.variant)
        )
        if customer_id:
            query = query.filter(Subscription.customer_id == customer_id)
        if status_filter:
            query = query.filter(Subscription.status == status_filter)
        return query.order_by(Subscription.id.desc()).all()

    @staticmethod
    def create_subscription(db: Session, sub_in: SubscriptionCreate) -> Subscription:
        customer = db.query(Customer).filter(Customer.id == sub_in.customer_id).first()
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found.")

        plan = db.query(Plan).filter(Plan.id == sub_in.plan_id).first()
        if not plan:
            raise HTTPException(status_code=404, detail="Plan not found.")

        sub_number = SubscriptionService._generate_subscription_number(db)
        next_billing = SubscriptionService.calculate_next_billing_date(sub_in.start_date, plan.billing_interval)

        subtotal = Decimal("0.00")
        discount_total = Decimal("0.00")
        lines_to_add = []

        for line_in in sub_in.lines:
            product = db.query(Product).filter(Product.id == line_in.product_id).first()
            if not product:
                raise HTTPException(status_code=404, detail=f"Product {line_in.product_id} not found.")

            raw_line = Decimal(line_in.quantity) * line_in.unit_price
            line_disc = (raw_line * (line_in.discount_percent / Decimal("100.00"))).quantize(TWOPLACES, rounding=ROUND_HALF_UP)
            line_total = (raw_line - line_disc).quantize(TWOPLACES, rounding=ROUND_HALF_UP)

            subtotal += raw_line
            discount_total += line_disc

            s_line = SubscriptionLine(
                product_id=line_in.product_id,
                variant_id=line_in.variant_id,
                description=line_in.description or product.name,
                quantity=line_in.quantity,
                unit_price=line_in.unit_price,
                discount_percent=line_in.discount_percent,
                line_total=line_total
            )
            lines_to_add.append(s_line)

        subtotal = subtotal.quantize(TWOPLACES, rounding=ROUND_HALF_UP)
        discount_total = discount_total.quantize(TWOPLACES, rounding=ROUND_HALF_UP)
        
        tax_total = Decimal("0.00")
        if getattr(sub_in, "tax_rate", None) and sub_in.tax_rate > Decimal("0.00"):
            net_base = max(Decimal("0.00"), subtotal - discount_total)
            tax_total = (net_base * sub_in.tax_rate / Decimal("100.00")).quantize(TWOPLACES, rounding=ROUND_HALF_UP)

        total_amount = ((subtotal - discount_total) + tax_total).quantize(TWOPLACES, rounding=ROUND_HALF_UP)

        subscription = Subscription(
            subscription_number=sub_number,
            customer_id=sub_in.customer_id,
            plan_id=sub_in.plan_id,
            status=SubscriptionStatus.DRAFT,
            start_date=sub_in.start_date,
            expiry_date=sub_in.expiry_date,
            next_billing_date=next_billing,
            payment_terms=sub_in.payment_terms,
            subtotal=subtotal,
            discount_total=discount_total,
            tax_total=tax_total,
            total_amount=total_amount,
            notes=sub_in.notes
        )
        db.add(subscription)
        db.flush()

        for line in lines_to_add:
            line.subscription_id = subscription.id
            db.add(line)

        db.commit()
        return SubscriptionService.get_by_id(db, subscription.id)

    @staticmethod
    def create_from_quotation(
        db: Session, 
        req: SubscriptionFromQuotationRequest
    ) -> Subscription:
        """
        Converts an approved quotation into an active subscription.
        Moves quotation to CONFIRMED and launches subscription contract.
        """
        quote = (
            db.query(Quotation)
            .options(joinedload(Quotation.lines))
            .filter(Quotation.id == req.quotation_id)
            .first()
        )
        if not quote:
            raise HTTPException(status_code=404, detail="Quotation not found.")

        plan = db.query(Plan).filter(Plan.id == quote.plan_id).first()
        if not plan:
            raise HTTPException(status_code=404, detail="Plan attached to quote not found.")

        start_date = req.start_date or date.today()
        expiry_date = req.expiry_date
        next_billing = SubscriptionService.calculate_next_billing_date(start_date, plan.billing_interval)
        sub_number = SubscriptionService._generate_subscription_number(db)

        subscription = Subscription(
            subscription_number=sub_number,
            customer_id=quote.customer_id,
            plan_id=quote.plan_id,
            quotation_id=quote.id,
            status=SubscriptionStatus.ACTIVE,  # Auto-activate upon quote conversion
            start_date=start_date,
            expiry_date=expiry_date,
            next_billing_date=next_billing,
            current_billing_cycle=0,
            payment_terms=quote.payment_terms,
            subtotal=quote.subtotal,
            discount_total=quote.discount_total,
            tax_total=quote.tax_total,
            total_amount=quote.total_amount,
            notes=req.notes or f"Created from Quotation {quote.quote_number}"
        )
        db.add(subscription)
        db.flush()

        for q_line in quote.lines:
            s_line = SubscriptionLine(
                subscription_id=subscription.id,
                product_id=q_line.product_id,
                variant_id=q_line.variant_id,
                description=q_line.description,
                quantity=q_line.quantity,
                unit_price=q_line.unit_price,
                discount_percent=q_line.discount_percent,
                line_total=q_line.line_total
            )
            db.add(s_line)

        # Update quotation state to confirmed
        quote.status = QuotationStatus.CONFIRMED

        db.commit()
        return SubscriptionService.get_by_id(db, subscription.id)

    @staticmethod
    def transition_state(
        db: Session, 
        subscription_id: int, 
        transition: SubscriptionTransitionRequest
    ) -> Subscription:
        """
        Enforces strict subscription state machine transitions governed by plan rules:
        Draft -> Quotation -> Confirmed -> Active -> Closed
        Supports pause, resume, early closure, and renewal rules.
        """
        sub = db.query(Subscription).filter(Subscription.id == subscription_id).first()
        if not sub:
            raise HTTPException(status_code=404, detail="Subscription not found.")

        plan = db.query(Plan).filter(Plan.id == sub.plan_id).first()
        action = transition.action.lower().strip()
        current = sub.status

        # 1. Action: Confirm
        if action == "confirm":
            if current not in (SubscriptionStatus.DRAFT, SubscriptionStatus.QUOTATION):
                raise HTTPException(
                    status_code=400, 
                    detail=f"Cannot confirm subscription currently in state '{current.value}'."
                )
            sub.status = SubscriptionStatus.CONFIRMED

        # 2. Action: Activate
        elif action == "activate":
            if current not in (SubscriptionStatus.CONFIRMED, SubscriptionStatus.DRAFT):
                raise HTTPException(
                    status_code=400, 
                    detail=f"Cannot activate subscription currently in state '{current.value}'."
                )
            sub.status = SubscriptionStatus.ACTIVE

        # 3. Action: Pause
        elif action == "pause":
            if current != SubscriptionStatus.ACTIVE:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Only active subscriptions can be paused (current: '{current.value}')."
                )
            if not plan.allow_pause:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Plan '{plan.name}' policy disallows pausing."
                )
            sub.status = SubscriptionStatus.PAUSED

        # 4. Action: Resume
        elif action == "resume":
            if current != SubscriptionStatus.PAUSED:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Subscription is not paused (current: '{current.value}')."
                )
            sub.status = SubscriptionStatus.ACTIVE

        # 5. Action: Close (Early closure or termination)
        elif action == "close":
            if current == SubscriptionStatus.CLOSED:
                raise HTTPException(status_code=400, detail="Subscription is already closed.")
            
            # Check early closure permission if subscription has not reached expiry
            is_early = (sub.expiry_date and date.today() < sub.expiry_date)
            if is_early and not plan.allow_early_close:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Plan '{plan.name}' does not permit early closure."
                )
            sub.status = SubscriptionStatus.CLOSED

        # 6. Action: Renew
        elif action == "renew":
            if not plan.allow_renewal:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Plan '{plan.name}' policy disallows renewal."
                )
            # Extend expiry date and advance billing
            extension_days = 365 if plan.billing_interval == BillingInterval.YEARLY else 30
            if sub.expiry_date:
                sub.expiry_date = sub.expiry_date + timedelta(days=extension_days)
            else:
                sub.expiry_date = date.today() + timedelta(days=extension_days)
            
            sub.status = SubscriptionStatus.ACTIVE
            sub.next_billing_date = SubscriptionService.calculate_next_billing_date(date.today(), plan.billing_interval)

        else:
            raise HTTPException(status_code=400, detail=f"Unknown transition action '{action}'.")

        if transition.notes:
            sub.notes = f"{sub.notes or ''}\n[{date.today()}] State transition: {action} ({transition.notes})"

        db.commit()
        return SubscriptionService.get_by_id(db, sub.id)

