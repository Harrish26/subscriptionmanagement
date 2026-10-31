"""Recurring Billing Engine with Idempotency Unique Constraints."""
from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Tuple, Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError

from app.models.subscription import Subscription, SubscriptionStatus
from app.models.invoice import Invoice, InvoiceLine, InvoiceStatus
from app.models.plan import BillingInterval
from app.services.subscription_service import SubscriptionService
from app.schemas.simulator import BillingRunSummary

TWOPLACES = Decimal("0.01")

class BillingEngine:
    @staticmethod
    def _generate_invoice_number(db: Session) -> str:
        """Generates sequential invoice identifier (e.g. INV-2026-0001)."""
        year = date.today().year
        count = db.query(Invoice).count() + 1
        return f"INV-{year}-{count:04d}"

    @staticmethod
    def calculate_period_end(period_start: date, interval: BillingInterval) -> date:
        """Computes the ending date boundary for a given billing cadence."""
        return SubscriptionService.calculate_next_billing_date(period_start, interval)

    @staticmethod
    def calculate_due_date(issue_date: date, payment_terms: str) -> date:
        """Computes invoice due date from payment terms."""
        terms = (payment_terms or "Immediate").lower()
        if "15" in terms:
            return issue_date + timedelta(days=15)
        elif "30" in terms:
            return issue_date + timedelta(days=30)
        elif "60" in terms:
            return issue_date + timedelta(days=60)
        return issue_date  # Immediate

    @staticmethod
    def process_recurring_billing(
        db: Session, 
        target_date: Optional[date] = None
    ) -> Tuple[BillingRunSummary, List[Invoice]]:
        """
        Core Recurring Billing Run:
        1. Automatically identifies all ACTIVE subscriptions due on or before target_date.
        2. Evaluates expiration against plan auto-close policy.
        3. Enforces idempotency via unique constraints, preventing duplicate billing cycles.
        4. Generates invoices with customer details, itemized lines, and totals.
        5. Advances next_billing_date and increments billing cycles to prevent skipped billing.
        """
        eval_date = target_date or date.today()

        # Query all active subscriptions with next_billing_date due
        due_subscriptions = (
            db.query(Subscription)
            .options(
                joinedload(Subscription.plan),
                joinedload(Subscription.lines),
                joinedload(Subscription.customer)
            )
            .filter(
                Subscription.status == SubscriptionStatus.ACTIVE,
                Subscription.next_billing_date <= eval_date
            )
            .all()
        )

        invoices_created: List[Invoice] = []
        total_billed = Decimal("0.00")
        auto_closed_count = 0
        skipped_duplicates = 0

        for sub in due_subscriptions:
            # Check 1: Expiration & Auto-Close Rule
            if sub.expiry_date and sub.expiry_date < eval_date:
                if sub.plan and sub.plan.auto_close_on_expiry:
                    sub.status = SubscriptionStatus.CLOSED
                    auto_closed_count += 1
                    db.commit()
                    continue

            period_start = sub.next_billing_date
            period_end = BillingEngine.calculate_period_end(period_start, sub.plan.billing_interval)

            # Check 2: Idempotency Verification
            # Prevent double-billing if an invoice for this exact subscription and cycle already exists
            existing_invoice = (
                db.query(Invoice)
                .filter(
                    Invoice.subscription_id == sub.id,
                    Invoice.billing_period_start == period_start,
                    Invoice.billing_period_end == period_end
                )
                .first()
            )
            if existing_invoice:
                skipped_duplicates += 1
                # Advance billing date if stuck
                sub.next_billing_date = period_end
                db.commit()
                continue

            # Check 3: Generate Invoice
            inv_number = BillingEngine._generate_invoice_number(db)
            issue_date = eval_date
            due_date = BillingEngine.calculate_due_date(issue_date, sub.payment_terms)

            invoice = Invoice(
                invoice_number=inv_number,
                subscription_id=sub.id,
                customer_id=sub.customer_id,
                billing_period_start=period_start,
                billing_period_end=period_end,
                issue_date=issue_date,
                due_date=due_date,
                status=InvoiceStatus.CONFIRMED,
                subtotal=sub.subtotal,
                discount_total=sub.discount_total,
                tax_total=sub.tax_total,
                total_amount=sub.total_amount,
                amount_paid=Decimal("0.00"),
                balance_due=sub.total_amount,
                notes=f"Recurring billing cycle #{sub.current_billing_cycle + 1} ({sub.plan.billing_interval.value})"
            )
            db.add(invoice)
            db.flush()

            # Copy line items snapshot from subscription
            for s_line in sub.lines:
                inv_line = InvoiceLine(
                    invoice_id=invoice.id,
                    product_id=s_line.product_id,
                    variant_id=s_line.variant_id,
                    description=s_line.description or "Subscription Line Item",
                    quantity=s_line.quantity,
                    unit_price=s_line.unit_price,
                    discount_percent=s_line.discount_percent,
                    tax_rate=Decimal("0.00"),
                    line_total=s_line.line_total
                )
                db.add(inv_line)

            # Advance subscription to next billing cycle
            sub.current_billing_cycle += 1
            sub.next_billing_date = period_end

            try:
                db.commit()
                db.refresh(invoice)
                invoices_created.append(invoice)
                total_billed += invoice.total_amount
            except IntegrityError:
                db.rollback()
                skipped_duplicates += 1

        summary = BillingRunSummary(
            subscriptions_evaluated=len(due_subscriptions),
            invoices_generated=len(invoices_created),
            total_amount_billed=total_billed.quantize(TWOPLACES, rounding=ROUND_HALF_UP),
            auto_closed_subscriptions=auto_closed_count,
            skipped_duplicate_cycles=skipped_duplicates
        )

        return summary, invoices_created

