"""Automated Verification Suite for Phase 4: Tax, Discounts, Invoicing & Payment Management."""
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
from app.models.subscription import Subscription, SubscriptionStatus
from app.models.invoice import Invoice, InvoiceStatus
from app.models.tax import Tax
from app.models.discount import Discount, DiscountType, DiscountScope
from app.models.payment import Payment, PaymentMethod, PaymentReminder

from app.schemas.tax import TaxCreate
from app.schemas.discount import DiscountCreate
from app.schemas.payment import PaymentCreate, PaymentReminderCreate
from app.schemas.subscription import SubscriptionCreate, SubscriptionLineCreate

from app.services.tax_service import TaxService
from app.services.discount_service import DiscountService
from app.services.payment_service import PaymentService
from app.services.finance_service import FinanceService
from app.services.subscription_service import SubscriptionService
from app.services.billing_engine import BillingEngine
from fastapi import HTTPException

def run_phase4_verification():
    print("=== SubscriptNova Phase 4 Automated Verification Suite ===")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    ts = int(time.time() * 1000)

    try:
        admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
        customer = db.query(Customer).first()
        assert admin is not None and customer is not None, "Admin and Customer must exist"
        product = db.query(Product).first()
        assert product is not None, "Product must exist"

        # --------------------------------------------------------------------
        # 1. Tax Management
        # --------------------------------------------------------------------
        print("\n--- Testing 1: Tax Management & Precision Math ---")
        tax_gst = TaxService.create_tax(
            db, 
            TaxCreate(name=f"GST 18% {ts}", rate=Decimal("18.00"), description="Indian GST 18%", is_default=True)
        )
        assert tax_gst.rate == Decimal("18.00")
        assert tax_gst.is_default == True
        print(f"[PASS] Tax created: '{tax_gst.name}' (Rate: {tax_gst.rate}%, Default: {tax_gst.is_default})")

        # Test calculation
        computed_tax = TaxService.calculate_tax(amount=Decimal("1500.00"), rate=tax_gst.rate)
        # 1500 * 18% = 270.00
        assert computed_tax == Decimal("270.00")
        print(f"[PASS] Decimal Tax Math: $1500.00 @ 18.00% = ${computed_tax}")

        # --------------------------------------------------------------------
        # 2. Discount Management (Fixed, Percentage, Thresholds, Expiry, Limits)
        # --------------------------------------------------------------------
        print("\n--- Testing 2: Discount Management & Rule Validation ---")
        
        # 2a. Percentage discount with minimum purchase threshold
        disc_pct = DiscountService.create_discount(
            db,
            DiscountCreate(
                code=f"SAVE20_{ts}",
                name="20% Off Enterprise Promo",
                discount_type=DiscountType.PERCENTAGE,
                value=Decimal("20.00"),
                min_purchase_amount=Decimal("1000.00"),
                start_date=date.today() - timedelta(days=5),
                expiry_date=date.today() + timedelta(days=30),
                max_uses=5,
                scope=DiscountScope.ALL
            )
        )
        assert disc_pct.value == Decimal("20.00")
        print(f"[PASS] Percentage discount created: code='{disc_pct.code}' (20% off, min $1000, max uses: 5)")

        # Validate with valid purchase amount ($2000 >= $1000)
        valid, msg, amt, _ = DiscountService.validate_and_compute(db, disc_pct.code, purchase_amount=Decimal("2000.00"))
        assert valid == True
        assert amt == Decimal("400.00")  # 20% of 2000 = 400
        print(f"[PASS] Discount validated: $2000.00 purchase -> discount: ${amt}")

        # Validate with purchase amount below threshold ($500 < $1000)
        valid, msg, amt, _ = DiscountService.validate_and_compute(db, disc_pct.code, purchase_amount=Decimal("500.00"))
        assert valid == False
        print(f"[PASS] Minimum Threshold Guard: Caught expected rejection: '{msg}'")

        # 2b. Fixed amount discount with expired date
        disc_exp = DiscountService.create_discount(
            db,
            DiscountCreate(
                code=f"EXPIRED_{ts}",
                name="Expired Black Friday Deal",
                discount_type=DiscountType.FIXED,
                value=Decimal("150.00"),
                min_purchase_amount=Decimal("100.00"),
                start_date=date.today() - timedelta(days=20),
                expiry_date=date.today() - timedelta(days=1),  # Expired yesterday
                scope=DiscountScope.ALL
            )
        )
        valid, msg, _, _ = DiscountService.validate_and_compute(db, disc_exp.code, purchase_amount=Decimal("500.00"))
        assert valid == False
        print(f"[PASS] Expiry Guard: Caught expected rejection on expired code: '{msg}'")

        # --------------------------------------------------------------------
        # 3. Invoicing with Taxes, Discounts & Status Lifecycle
        # --------------------------------------------------------------------
        print("\n--- Testing 3: Invoicing with Taxes & Outstanding Balances ---")
        
        # Create an active subscription due for billing
        plan = db.query(Plan).filter(Plan.is_active == True).first()
        start_date = date.today()
        sub = SubscriptionService.create_subscription(
            db,
            SubscriptionCreate(
                customer_id=customer.id,
                plan_id=plan.id,
                start_date=start_date,
                expiry_date=start_date + timedelta(days=365),
                payment_terms="Net 15",
                tax_rate=Decimal("18.00"),
                lines=[
                    SubscriptionLineCreate(
                        product_id=product.id,
                        quantity=2,
                        unit_price=Decimal("1000.00"),
                        discount_percent=Decimal("10.00")
                    )
                ]
            )
        )
        SubscriptionService.transition_state(db, sub.id, type("Req", (), {"action": "activate", "notes": "Activating for Phase 4"})())
        sub.next_billing_date = date.today()
        db.commit()

        # Run Billing Engine - invoice will incorporate GST 18%
        summary, invoices = BillingEngine.process_recurring_billing(db, target_date=date.today())
        assert len(invoices) >= 1
        inv = invoices[0]
        # subtotal: 2000. Disc: 200. Net: 1800. Tax @ 18% = 324.00. Total = 2124.00
        assert inv.subtotal == Decimal("2000.00")
        assert inv.discount_total == Decimal("200.00")
        assert inv.tax_total == Decimal("324.00")
        assert inv.total_amount == Decimal("2124.00")
        assert inv.balance_due == Decimal("2124.00")
        assert inv.amount_paid == Decimal("0.00")
        assert inv.status == InvoiceStatus.UNPAID
        print(f"[PASS] Invoice generated: {inv.invoice_number}")
        print(f"       Subtotal: ${inv.subtotal} | Disc: -${inv.discount_total} | Tax: +${inv.tax_total} | Total: ${inv.total_amount}")
        print(f"       Status: {inv.status.value} | Outstanding Balance: ${inv.balance_due}")

        # --------------------------------------------------------------------
        # 4. Payment Management: Partial & Full Settlement, UPI/Card/Bank
        # --------------------------------------------------------------------
        print("\n--- Testing 4: Payment Management (Partial & Full Payments) ---")

        # 4a. Partial payment via UPI: $1000.00 of $2124.00
        p1 = PaymentService.record_payment(
            db,
            PaymentCreate(
                invoice_id=inv.id,
                amount=Decimal("1000.00"),
                payment_method=PaymentMethod.UPI,
                transaction_reference=f"UPI-REF-{ts}",
                notes="Initial advance payment via Google Pay"
            )
        )
        assert p1.payment_number.startswith("PAY-")
        assert p1.amount == Decimal("1000.00")
        assert p1.payment_method == PaymentMethod.UPI

        # Verify invoice state after partial payment
        db.refresh(inv)
        assert inv.amount_paid == Decimal("1000.00")
        assert inv.balance_due == Decimal("1124.00")
        assert inv.status == InvoiceStatus.PARTIALLY_PAID
        print(f"[PASS] Partial Payment #1: {p1.payment_number} (${p1.amount} via {p1.payment_method.value})")
        print(f"       Invoice {inv.invoice_number} transitioned to: '{inv.status.value}' (Balance: ${inv.balance_due})")

        # 4b. Overpayment guard: attempt to pay $1500 when balance is $1124
        try:
            PaymentService.record_payment(
                db,
                PaymentCreate(
                    invoice_id=inv.id,
                    amount=Decimal("1500.00"),
                    payment_method=PaymentMethod.CARD
                )
            )
            assert False, "Should reject payment exceeding balance due"
        except HTTPException as e:
            assert e.status_code == 400
            print(f"[PASS] Overpayment Guard: Rejected overpayment (400: '{e.detail}')")

        # 4c. Second payment: Final settlement of remaining $1124.00 via Bank Transfer
        p2 = PaymentService.record_payment(
            db,
            PaymentCreate(
                invoice_id=inv.id,
                amount=Decimal("1124.00"),
                payment_method=PaymentMethod.BANK_TRANSFER,
                transaction_reference=f"NEFT-{ts}",
                notes="Final settlement via wire transfer"
            )
        )
        db.refresh(inv)
        assert inv.amount_paid == Decimal("2124.00")
        assert inv.balance_due == Decimal("0.00")
        assert inv.status == InvoiceStatus.PAID
        print(f"[PASS] Final Settlement Payment #2: {p2.payment_number} (${p2.amount} via {p2.payment_method.value})")
        print(f"       Invoice {inv.invoice_number} transitioned to: '{inv.status.value}' (Balance: ${inv.balance_due})")

        # --------------------------------------------------------------------
        # 5. Overdue Payment Management & Reminder System
        # --------------------------------------------------------------------
        print("\n--- Testing 5: Overdue Invoices & Payment Reminders ---")
        
        # Create an unpaid invoice with a past due date
        overdue_inv = Invoice(
            invoice_number=f"INV-{date.today().year}-OD-{ts}",
            subscription_id=sub.id,
            customer_id=customer.id,
            billing_period_start=date.today() - timedelta(days=45),
            billing_period_end=date.today() - timedelta(days=15),
            issue_date=date.today() - timedelta(days=45),
            due_date=date.today() - timedelta(days=15),  # Due 15 days ago
            status=InvoiceStatus.UNPAID,
            subtotal=Decimal("500.00"),
            discount_total=Decimal("0.00"),
            tax_total=Decimal("0.00"),
            total_amount=Decimal("500.00"),
            amount_paid=Decimal("0.00"),
            balance_due=Decimal("500.00")
        )
        db.add(overdue_inv)
        db.commit()

        # Scan for overdue invoices
        flagged = PaymentService.scan_and_update_overdue(db, as_of_date=date.today())
        db.refresh(overdue_inv)
        assert overdue_inv.status == InvoiceStatus.OVERDUE
        print(f"[PASS] Overdue Scanner: Detected and updated invoice {overdue_inv.invoice_number} to OVERDUE")

        # Send Payment Reminder
        reminder = PaymentService.send_payment_reminder(
            db,
            PaymentReminderCreate(
                invoice_id=overdue_inv.id,
                reminder_channel="email",
                message="Your subscription payment of $500.00 is overdue."
            ),
            sent_by_user_id=admin.id
        )
        assert reminder.invoice_id == overdue_inv.id
        assert reminder.amount_due == Decimal("500.00")
        print(f"[PASS] Payment Reminder Logged: Channel={reminder.reminder_channel}, AmountDue=${reminder.amount_due}")

        # --------------------------------------------------------------------
        # 6. Finance Dashboard & Analytics
        # --------------------------------------------------------------------
        print("\n--- Testing 6: Finance Dashboard & KPI Aggregation ---")
        dash = FinanceService.get_dashboard_summary(db)
        assert dash.total_invoiced_amount > Decimal("0.00")
        assert dash.total_collected_amount > Decimal("0.00")
        assert dash.total_outstanding_amount > Decimal("0.00")
        assert dash.overdue_invoices_count >= 1
        assert len(dash.recent_payments) >= 1
        assert len(dash.recent_invoices) >= 1
        print(f"[PASS] Finance Dashboard KPI Aggregations:")
        print(f"       Total Invoiced: ${dash.total_invoiced_amount}")
        print(f"       Total Collected: ${dash.total_collected_amount}")
        print(f"       Outstanding Receivables: ${dash.total_outstanding_amount}")
        print(f"       Overdue Invoices: {dash.overdue_invoices_count} (${dash.overdue_amount})")
        print(f"       Payment Methods: {dash.payment_methods_breakdown}")

        print("\n[ALL PHASE 4 VERIFICATIONS PASSED] Tax, Discounts, Invoicing & Payments 100% operational!")

    finally:
        db.close()

if __name__ == "__main__":
    run_phase4_verification()
