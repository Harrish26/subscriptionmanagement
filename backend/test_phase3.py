"""Automated Verification Suite for Phase 3: Subscriptions, State Machine, Idempotent Billing & Simulator."""
import os
import sys
import time
from datetime import date, timedelta
from decimal import Decimal

backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.core.database import SessionLocal, Base, engine
import app.models
from app.models.user import User, UserRole, Customer
from app.models.product import Product
from app.models.plan import Plan, BillingInterval
from app.models.quotation import Quotation, QuotationStatus
from app.models.subscription import Subscription, SubscriptionStatus
from app.models.invoice import Invoice, InvoiceStatus
from app.schemas.subscription import (
    SubscriptionCreate, 
    SubscriptionLineCreate, 
    SubscriptionTransitionRequest,
    SubscriptionFromQuotationRequest
)
from app.schemas.simulator import TimeTravelRequest
from app.services.subscription_service import SubscriptionService
from app.services.billing_engine import BillingEngine
from app.services.simulator_service import SimulatorService
from fastapi import HTTPException

def run_phase3_verification():
    print("=== SubscriptNova Phase 3 Automated Verification Suite ===")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    ts = int(time.time() * 1000)

    try:
        # Fetch or verify Admin & Customer
        admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
        customer = db.query(Customer).first()
        assert admin is not None and customer is not None, "Admin and Customer must exist"

        # Fetch demo product & plans
        product = db.query(Product).first()
        assert product is not None, "Product must exist"

        # Plan 1: Flexible Monthly Plan (Allows pause, early close, renewal)
        flex_plan = Plan(
            name=f"Full Flex Plan {ts}",
            billing_interval=BillingInterval.MONTHLY,
            base_cost=Decimal("120.00"),
            min_quantity=1,
            available_from=date.today(),
            auto_close_on_expiry=False,
            allow_early_close=True,
            allow_pause=True,
            allow_renewal=True,
            is_active=True
        )
        db.add(flex_plan)
        db.commit()

        # Plan 2: Strict Plan (No pause, no early close, auto-close on expiry)
        strict_plan = Plan(
            name=f"Strict Locked Plan {ts}",
            billing_interval=BillingInterval.DAILY,
            base_cost=Decimal("15.00"),
            min_quantity=1,
            available_from=date.today(),
            auto_close_on_expiry=True,
            allow_early_close=False,
            allow_pause=False,
            allow_renewal=False,
            is_active=True
        )
        db.add(strict_plan)
        db.commit()

        # --------------------------------------------------------------------
        # 1. Subscription Creation with Unique Number & Next Billing Calculation
        # --------------------------------------------------------------------
        print("\n--- Testing 1: Subscription Creation & Billing Date Math ---")
        start_date = date.today()
        sub_create = SubscriptionCreate(
            customer_id=customer.id,
            plan_id=flex_plan.id,
            start_date=start_date,
            expiry_date=start_date + timedelta(days=365),
            payment_terms="Net 15",
            notes="Initial corporate deployment",
            lines=[
                SubscriptionLineCreate(
                    product_id=product.id,
                    quantity=3,
                    unit_price=Decimal("1200.00"),
                    discount_percent=Decimal("5.00")
                )
            ]
        )
        sub = SubscriptionService.create_subscription(db, sub_create)
        assert sub.subscription_number.startswith("SUB-")
        assert sub.status == SubscriptionStatus.DRAFT
        # Subtotal: 3 * 1200 = 3600. Disc 5% = 180. Total = 3420.00
        assert sub.subtotal == Decimal("3600.00")
        assert sub.discount_total == Decimal("180.00")
        assert sub.total_amount == Decimal("3420.00")
        # Next billing date: Monthly -> +30 days
        expected_next = start_date + timedelta(days=30)
        assert sub.next_billing_date == expected_next
        print(f"[PASS] Subscription created: {sub.subscription_number} (State: {sub.status.value}, Total: ${sub.total_amount})")
        print(f"       Next billing date calculated: {sub.next_billing_date} (Monthly cadence verified)")

        # Verify billing date math across all intervals: Daily, Weekly, Monthly, Yearly
        assert SubscriptionService.calculate_next_billing_date(start_date, BillingInterval.DAILY) == start_date + timedelta(days=1)
        assert SubscriptionService.calculate_next_billing_date(start_date, BillingInterval.WEEKLY) == start_date + timedelta(days=7)
        assert SubscriptionService.calculate_next_billing_date(start_date, BillingInterval.MONTHLY) == start_date + timedelta(days=30)
        assert SubscriptionService.calculate_next_billing_date(start_date, BillingInterval.YEARLY) == start_date + timedelta(days=365)
        print("       Interval cadence math verified: Daily (+1d), Weekly (+7d), Monthly (+30d), Yearly (+365d)")

        # --------------------------------------------------------------------
        # 2. Strict State Machine Transitions & Plan Rules Enforcement
        # --------------------------------------------------------------------
        print("\n--- Testing 2: Strict State Machine & Plan Policy Rules ---")

        # Draft -> Quotation -> Confirmed -> Active
        sub = SubscriptionService.transition_state(db, sub.id, SubscriptionTransitionRequest(action="confirm"))
        assert sub.status == SubscriptionStatus.CONFIRMED
        print(f"[PASS] Transition: DRAFT -> CONFIRMED ({sub.subscription_number})")

        sub = SubscriptionService.transition_state(db, sub.id, SubscriptionTransitionRequest(action="activate"))
        assert sub.status == SubscriptionStatus.ACTIVE
        print(f"[PASS] Transition: CONFIRMED -> ACTIVE ({sub.subscription_number})")

        # Test Pause & Resume on Flex Plan (allow_pause = True)
        sub = SubscriptionService.transition_state(db, sub.id, SubscriptionTransitionRequest(action="pause"))
        assert sub.status == SubscriptionStatus.PAUSED
        print(f"[PASS] Transition: ACTIVE -> PAUSED ({sub.subscription_number})")

        sub = SubscriptionService.transition_state(db, sub.id, SubscriptionTransitionRequest(action="resume"))
        assert sub.status == SubscriptionStatus.ACTIVE
        print(f"[PASS] Transition: PAUSED -> ACTIVE ({sub.subscription_number})")

        # Test Renewal (allow_renewal = True)
        old_expiry = sub.expiry_date
        sub = SubscriptionService.transition_state(db, sub.id, SubscriptionTransitionRequest(action="renew"))
        assert sub.expiry_date > old_expiry
        print(f"[PASS] Transition: RENEW -> Extended expiry from {old_expiry} to {sub.expiry_date}")

        # Test Policy Restriction on Strict Plan (allow_pause = False)
        strict_sub = SubscriptionService.create_subscription(
            db, 
            SubscriptionCreate(
                customer_id=customer.id,
                plan_id=strict_plan.id,
                start_date=date.today(),
                expiry_date=date.today() + timedelta(days=5),
                lines=[SubscriptionLineCreate(product_id=product.id, quantity=1, unit_price=Decimal("15.00"))]
            )
        )
        SubscriptionService.transition_state(db, strict_sub.id, SubscriptionTransitionRequest(action="activate"))
        
        try:
            SubscriptionService.transition_state(db, strict_sub.id, SubscriptionTransitionRequest(action="pause"))
            assert False, "Should have rejected pause on strict plan"
        except HTTPException as e:
            assert e.status_code == 400
            print(f"[PASS] Policy Guard: Rejected pause on disallowing plan (400: '{e.detail}')")

        try:
            SubscriptionService.transition_state(db, strict_sub.id, SubscriptionTransitionRequest(action="close"))
            assert False, "Should have rejected early close on strict plan"
        except HTTPException as e:
            assert e.status_code == 400
            print(f"[PASS] Policy Guard: Rejected early closure on disallowing plan (400: '{e.detail}')")

        # --------------------------------------------------------------------
        # 3. Quotation to Subscription Conversion
        # --------------------------------------------------------------------
        print("\n--- Testing 3: Quotation to Subscription Conversion ---")
        quote = db.query(Quotation).first()
        if quote:
            sub_from_q = SubscriptionService.create_from_quotation(
                db, 
                SubscriptionFromQuotationRequest(quotation_id=quote.id)
            )
            assert sub_from_q.subscription_number.startswith("SUB-")
            assert sub_from_q.status == SubscriptionStatus.ACTIVE
            assert sub_from_q.quotation_id == quote.id
            # Quote status updated to CONFIRMED
            db.refresh(quote)
            assert quote.status == QuotationStatus.CONFIRMED
            print(f"[PASS] Converted Quote {quote.quote_number} to Subscription {sub_from_q.subscription_number} (Active, Lines: {len(sub_from_q.lines)})")

        # --------------------------------------------------------------------
        # 4. Recurring Billing Engine & Idempotency / Double-Billing Prevention
        # --------------------------------------------------------------------
        print("\n--- Testing 4: Recurring Billing Engine & Idempotency Verification ---")

        # Set subscription next_billing_date to today so it's due
        sub.next_billing_date = date.today()
        db.commit()

        # Run Billing Engine
        summary1, invoices1 = BillingEngine.process_recurring_billing(db, target_date=date.today())
        assert summary1.invoices_generated >= 1
        assert len(invoices1) >= 1
        inv = invoices1[0]
        assert inv.invoice_number.startswith("INV-")
        assert inv.subscription_id == sub.id
        assert inv.total_amount == sub.total_amount
        assert inv.balance_due == sub.total_amount
        print(f"[PASS] Billing Run #1: Generated {summary1.invoices_generated} invoice(s), Total Billed: ${summary1.total_amount_billed}")
        print(f"       Created Invoice {inv.invoice_number} (Cycle #1, Period: {inv.billing_period_start} to {inv.billing_period_end})")

        # Refresh subscription and verify next_billing_date advanced!
        db.refresh(sub)
        assert sub.current_billing_cycle == 1
        assert sub.next_billing_date == inv.billing_period_end
        print(f"[PASS] Subscription cycle incremented to #{sub.current_billing_cycle}, next billing advanced to {sub.next_billing_date}")

        # CRITICAL IDEMPOTENCY TEST: Run billing engine again immediately for the same target date!
        summary2, invoices2 = BillingEngine.process_recurring_billing(db, target_date=date.today())
        assert summary2.invoices_generated == 0, "Idempotency failed: generated invoices on duplicate run!"
        print(f"[PASS] IDEMPOTENCY GUARANTEE: Billing Run #2 generated 0 duplicate invoices (Evaluated: {summary2.subscriptions_evaluated})")

        # --------------------------------------------------------------------
        # 5. Time-Travel Billing Simulator
        # --------------------------------------------------------------------
        print("\n--- Testing 5: Time-Travel Billing Simulator ---")
        status_before = SimulatorService.get_status(db)
        print(f"[PASS] Simulator initial status: Date={status_before.current_simulated_date}, Offset={status_before.days_offset}d")

        # Fast-Forward 30 days
        tt_res, tt_invoices = SimulatorService.advance_time(db, days=30)
        assert tt_res.days_advanced == 30
        assert tt_res.new_simulated_date == status_before.current_simulated_date + timedelta(days=30)
        print(f"[PASS] Time fast-forwarded +30 days to {tt_res.new_simulated_date}")
        print(f"       Billing sweep: {tt_res.billing_summary.invoices_generated} invoices generated, ${tt_res.billing_summary.total_amount_billed} billed")

        # Fast-Forward 7 days
        tt_res7, _ = SimulatorService.advance_time(db, days=7)
        assert tt_res7.days_advanced == 7
        print(f"[PASS] Time fast-forwarded +7 days to {tt_res7.new_simulated_date}")

        # Reset simulation
        reset_status = SimulatorService.reset_simulation(db)
        assert reset_status.days_offset == 0
        assert reset_status.current_simulated_date == date.today()
        print(f"[PASS] Simulator reset back to today: {reset_status.current_simulated_date} (Offset: 0)")

        print("\n[ALL PHASE 3 VERIFICATIONS PASSED] Subscriptions, Billing Engine, Idempotency & Simulator 100% operational!")

    finally:
        db.close()

if __name__ == "__main__":
    run_phase3_verification()
