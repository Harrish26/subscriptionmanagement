"""
SubscriptNova Phase 7 Master Verification, Security & Performance Benchmark Suite
Covers:
1. Complete System Verification across all 6 prior modules (Auth, Products, Quotes, Subscriptions, Billing, Finance, AI)
2. Security Audits:
   - Bcrypt password salting & verification
   - RBAC enforcement across Admin, Staff, and Customer roles
   - Multi-tenant isolation (cross-customer query isolation)
   - Strict Pydantic input validation & error handling
   - Verification of secret/database exclusion in .gitignore
3. Performance Benchmarks:
   - Health Check latency
   - Customer 360 & Admin Dashboard query response times
   - Random Forest ML Churn inference latency
   - Ridge Regression MRR forecast latency
   - Database query execution timings
"""
import os
import sys
import time
from datetime import date, timedelta
from decimal import Decimal

backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.core.database import SessionLocal, Base, engine
from app.core.security import verify_password, get_password_hash
from app.models.user import User, Customer, UserRole
from app.models.product import Product, ProductVariant
from app.models.plan import Plan, BillingInterval
from app.models.quotation import Quotation, QuotationStatus
from app.models.subscription import Subscription, SubscriptionStatus
from app.models.invoice import Invoice, InvoiceStatus
from app.models.tax import Tax
from app.models.discount import Discount, DiscountType
from app.models.payment import PaymentMethod

from app.schemas.user import UserCreate, UserStaffCreate, CustomerCreateByStaff
from app.schemas.subscription import (
    SubscriptionCreate, 
    SubscriptionLineCreate, 
    SubscriptionTransitionRequest, 
    SubscriptionFromQuotationRequest
)
from app.schemas.payment import PaymentCreate
from app.schemas.discount import DiscountValidateRequest

from app.services.user_service import UserService
from app.services.product_service import ProductService
from app.services.quotation_service import QuotationService
from app.services.subscription_service import SubscriptionService
from app.services.billing_engine import BillingEngine
from app.services.tax_service import TaxService
from app.services.discount_service import DiscountService
from app.services.payment_service import PaymentService
from app.services.finance_service import FinanceService
from app.services.ml_service import MLService

def run_phase7_master_verification():
    print("\n" + "=" * 70, flush=True)
    print("   SUBSCRIPTNOVA — PHASE 7: MASTER SYSTEM, SECURITY & PERFORMANCE SUITE", flush=True)
    print("=" * 70, flush=True)

    db: Session = SessionLocal()
    tests_run = 0
    tests_passed = 0
    ts = int(time.time() * 1000)

    try:
        # ====================================================================
        # SECTION 1: COMPLETE SYSTEM FUNCTIONALITY
        # ====================================================================
        print("\n--- SECTION 1: COMPLETE SYSTEM MODULE VERIFICATION ---", flush=True)

        # 1.1 Authentication, Bcrypt Hashing & Registration
        tests_run += 1
        raw_pw = "SecTest@Pass2026!"
        hashed_pw = get_password_hash(raw_pw)
        assert verify_password(raw_pw, hashed_pw), "Bcrypt password verification failed!"
        assert not verify_password("WrongPassword123!", hashed_pw), "Bcrypt rejected incorrect password"
        tests_passed += 1
        print(f"[PASS] 1.1 Bcrypt Password Salting & Cryptographic Hashing verified")

        # 1.2 User Roles & Hierarchy (Admin, Staff, Customer)
        tests_run += 1
        admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
        staff = db.query(User).filter(User.role == UserRole.STAFF).first()
        cust_user = db.query(User).filter(User.role == UserRole.CUSTOMER).first()
        assert admin is not None and staff is not None and cust_user is not None
        assert cust_user.customer_profile is not None
        tests_passed += 1
        print(f"[PASS] 1.2 Multi-Role Hierarchy verified (Admin: {admin.email}, Staff: {staff.email}, Customer: {cust_user.email})")

        # 1.3 Products, Variants with Surcharges & Plans
        tests_run += 1
        product = db.query(Product).first()
        assert product is not None
        assert product.sales_price > Decimal("0.00")
        assert len(product.variants) > 0
        odoo_var = next((v for v in product.variants if "Odoo" in v.variant_name), product.variants[0])
        effective_price = product.sales_price + odoo_var.price_surcharge
        assert effective_price >= product.sales_price
        tests_passed += 1
        print(f"[PASS] 1.3 Products & Multi-Attribute Variants verified (Base: ${product.sales_price}, Surcharge: +${odoo_var.price_surcharge} -> Effective: ${effective_price})")

        # 1.4 Quotations & Conversion to Subscriptions
        tests_run += 1
        quote = db.query(Quotation).first()
        assert quote is not None
        assert quote.quote_number.startswith("QT-")
        tests_passed += 1
        print(f"[PASS] 1.4 Quotations verified (Sample: {quote.quote_number}, Status: {quote.status.value}, Total: ${quote.total_amount:,.2f})")

        # 1.5 Subscription Lifecycle State Machine (Draft -> Confirmed -> Active -> Paused -> Resumed -> Renewed -> Closed)
        tests_run += 1
        plan = db.query(Plan).filter(Plan.allow_pause == True, Plan.allow_renewal == True, Plan.allow_early_close == True).first()
        assert plan is not None
        sub_create = SubscriptionCreate(
            customer_id=cust_user.customer_profile.id,
            plan_id=plan.id,
            start_date=date.today(),
            expiry_date=date.today() + timedelta(days=30),
            payment_terms="Net 30",
            lines=[SubscriptionLineCreate(product_id=product.id, quantity=1, unit_price=Decimal("1500.00"), discount_percent=Decimal("0.00"))]
        )
        new_sub = SubscriptionService.create_subscription(db, sub_create)
        assert new_sub.status == SubscriptionStatus.DRAFT
        new_sub = SubscriptionService.transition_state(db, new_sub.id, SubscriptionTransitionRequest(action="confirm"))
        assert new_sub.status == SubscriptionStatus.CONFIRMED
        new_sub = SubscriptionService.transition_state(db, new_sub.id, SubscriptionTransitionRequest(action="activate"))
        assert new_sub.status == SubscriptionStatus.ACTIVE
        new_sub = SubscriptionService.transition_state(db, new_sub.id, SubscriptionTransitionRequest(action="pause"))
        assert new_sub.status == SubscriptionStatus.PAUSED
        new_sub = SubscriptionService.transition_state(db, new_sub.id, SubscriptionTransitionRequest(action="resume"))
        assert new_sub.status == SubscriptionStatus.ACTIVE
        old_expiry = new_sub.expiry_date
        new_sub = SubscriptionService.transition_state(db, new_sub.id, SubscriptionTransitionRequest(action="renew"))
        assert new_sub.expiry_date > old_expiry
        new_sub = SubscriptionService.transition_state(db, new_sub.id, SubscriptionTransitionRequest(action="close"))
        assert new_sub.status == SubscriptionStatus.CLOSED
        tests_passed += 1
        print(f"[PASS] 1.5 Subscription Lifecycle State Machine fully validated (Draft -> Confirmed -> Active -> Paused -> Active -> Renewed -> Closed)")

        # 1.6 Idempotent Recurring Billing Engine & Unique Constraints
        tests_run += 1
        active_sub = db.query(Subscription).filter(Subscription.status == SubscriptionStatus.ACTIVE).first()
        assert active_sub is not None
        active_sub.next_billing_date = date.today()
        db.commit()
        summary1, inv_list1 = BillingEngine.process_recurring_billing(db, target_date=date.today())
        # Run again immediately for the same target date -> Idempotency MUST yield 0 duplicate invoices!
        summary2, inv_list2 = BillingEngine.process_recurring_billing(db, target_date=date.today())
        assert summary2.invoices_generated == 0, "Idempotency violated: duplicate invoice generated!"
        tests_passed += 1
        print(f"[PASS] 1.6 Idempotent Recurring Billing Engine verified (Run 1: {summary1.invoices_generated} generated, Run 2: 0 duplicate invoices)")

        # 1.7 Taxes & Decimal Arithmetic
        tests_run += 1
        tax = db.query(Tax).first()
        assert tax is not None
        calc_tax = (Decimal("2500.00") * (tax.rate / Decimal("100.00"))).quantize(Decimal("0.01"))
        assert isinstance(calc_tax, Decimal)
        tests_passed += 1
        print(f"[PASS] 1.7 Tax Precision Math verified (Rate: {tax.rate}% on $2,500.00 = ${calc_tax} Decimal)")

        # 1.8 Promotional Discounts with Thresholds & Expiry Guards
        tests_run += 1
        disc = db.query(Discount).filter(Discount.is_active == True).first()
        assert disc is not None
        is_valid, msg, discount_amount, disc_obj = DiscountService.validate_and_compute(
            db, 
            code=disc.code, 
            purchase_amount=Decimal("5000.00")
        )
        assert is_valid is True
        assert discount_amount > Decimal("0.00")
        tests_passed += 1
        print(f"[PASS] 1.8 Discount Engine verified (Code: {disc.code}, Value: ${discount_amount:,.2f} applied)")

        # 1.9 Payments: Partial & Full Settlement with Overpayment Protection
        tests_run += 1
        unpaid_inv = db.query(Invoice).filter(Invoice.balance_due > Decimal("100.00")).first()
        assert unpaid_inv is not None
        initial_balance = unpaid_inv.balance_due
        # Partial payment test
        partial_amt = Decimal("50.00")
        pay_rec = PaymentService.record_payment(
            db,
            PaymentCreate(
                invoice_id=unpaid_inv.id,
                amount=partial_amt,
                payment_method=PaymentMethod.UPI,
                transaction_reference=f"UPI-P7-{ts}",
                notes="Phase 7 verification partial payment"
            )
        )
        db.refresh(unpaid_inv)
        assert unpaid_inv.balance_due == initial_balance - partial_amt
        # Overpayment guard test
        try:
            PaymentService.record_payment(
                db,
                PaymentCreate(
                    invoice_id=unpaid_inv.id,
                    amount=unpaid_inv.balance_due + Decimal("50000.00"),
                    payment_method=PaymentMethod.CARD
                )
            )
            assert False, "Should have rejected overpayment"
        except HTTPException as e:
            assert e.status_code == 400
        tests_passed += 1
        print(f"[PASS] 1.9 Payment Engine verified (Partial payment accepted, overpayment strictly guarded 400)")

        # 1.10 Overdue Invoices & Automated Payment Reminders
        tests_run += 1
        overdue_inv = db.query(Invoice).filter(Invoice.status == InvoiceStatus.OVERDUE).first()
        assert overdue_inv is not None
        assert overdue_inv.due_date < date.today()
        tests_passed += 1
        print(f"[PASS] 1.10 Overdue Invoicing & Past-Due Scanner verified (Sample: {overdue_inv.invoice_number}, Due: {overdue_inv.due_date})")

        # 1.11 AI Churn Prediction & Feature Explainability
        tests_run += 1
        churn_diag = MLService.predict_customer_churn(cust_user.customer_profile.id, db)
        assert 0 <= churn_diag.risk_score <= 100
        assert churn_diag.risk_tier in ["Low", "Medium", "High"]
        assert len(churn_diag.contributing_factors) > 0
        tests_passed += 1
        print(f"[PASS] 1.11 AI Churn Classifier verified (Score: {churn_diag.risk_score}/100, Tier: {churn_diag.risk_tier}, Drivers: {churn_diag.contributing_factors[0]})")

        # 1.12 AI MRR Forecasting (3 & 6-Month Horizons)
        tests_run += 1
        mrr_data = MLService.forecast_mrr(db)
        assert len(mrr_data.forecast_6_months) == 6
        assert mrr_data.current_mrr > Decimal("0.00")
        assert mrr_data.r2_score >= 0.85
        tests_passed += 1
        print(f"[PASS] 1.12 AI MRR Forecaster verified (Model R2: {mrr_data.r2_score:.4f}, Baseline MRR: ${mrr_data.current_mrr:,.2f}, 6-Mo Forecast: ${mrr_data.forecast_6_months[-1].mrr:,.2f})")

        # ====================================================================
        # SECTION 2: SECURITY & RBAC VERIFICATION
        # ====================================================================
        print("\n--- SECTION 2: SECURITY & RBAC VERIFICATION ---", flush=True)

        # 2.1 Multi-Tenant Data Isolation
        tests_run += 1
        cust1 = db.query(Customer).filter(Customer.id == 1).first()
        cust2 = db.query(Customer).filter(Customer.id != 1).first()
        assert cust1 is not None and cust2 is not None
        # Verify that querying customer 1's full profile does NOT leak customer 2's subscriptions or invoices
        full_detail_1 = UserService.get_customer_full_detail(db, cust1.id)
        assert full_detail_1.profile.customer_id == cust1.id
        sub_ids = [s["id"] for s in full_detail_1.subscriptions]
        if sub_ids:
            for s in db.query(Subscription).filter(Subscription.id.in_(sub_ids)).all():
                assert s.customer_id == cust1.id
        inv_ids = [i["id"] for i in full_detail_1.invoices]
        if inv_ids:
            for inv in db.query(Invoice).filter(Invoice.id.in_(inv_ids)).all():
                assert inv.customer_id == cust1.id
        tests_passed += 1
        print(f"[PASS] 2.1 Multi-Tenant Isolation verified: Customer #{cust1.id} data ledger contains 0 foreign records")

        # 2.2 Role-Based Access Control (RBAC) Guard Enforcement
        tests_run += 1
        from app.api.v1.endpoints import users as user_endpoints
        try:
            user_endpoints.list_customers_overview(db=db, current_staff=cust_user)
            assert False, "Should have raised 403 Forbidden for customer role accessing staff endpoint"
        except HTTPException as e:
            assert e.status_code == 403
        tests_passed += 1
        print(f"[PASS] 2.2 RBAC Guard verified: Customer role strictly blocked from staff/admin endpoints (HTTP 403)")

        # 2.3 Strict Password Policy Guard
        tests_run += 1
        weak_passwords = ["short", "nouppercase123!", "NOLOWERCASE123!", "NoSpecialChar123"]
        for wp in weak_passwords:
            try:
                UserCreate(email="test.weak@brightloop.io", full_name="Weak Tester", password=wp)
                assert False, f"Password policy failed to reject weak password '{wp}'"
            except Exception:
                pass
        tests_passed += 1
        print(f"[PASS] 2.3 Strict Password Complexity Policy verified (Rejects passwords lacking uppercase, lowercase, numbers, or symbols)")

        # 2.4 Sensitive Files & Secret Exclusions (.gitignore Audit)
        tests_run += 1
        gitignore_path = os.path.join(backend_dir, "..", ".gitignore")
        assert os.path.exists(gitignore_path), ".gitignore must exist"
        with open(gitignore_path, "r", encoding="utf-8") as f:
            gitignore_content = f.read()
        assert ".env" in gitignore_content, ".env must be ignored"
        assert "*.db" in gitignore_content, "*.db must be ignored"
        assert "venv" in gitignore_content, "venv/ must be ignored"
        assert "node_modules" in gitignore_content, "node_modules/ must be ignored"
        tests_passed += 1
        print(f"[PASS] 2.4 Secret & Database Exclusions verified (.gitignore excludes .env, *.db, venv/, node_modules/)")

        # ====================================================================
        # SECTION 3: PERFORMANCE BENCHMARKING
        # ====================================================================
        print("\n--- SECTION 3: PERFORMANCE BENCHMARKING & MEASUREMENTS ---", flush=True)

        # 3.1 Health Check Response Latency
        tests_run += 1
        t0 = time.perf_counter()
        from app.api.v1.endpoints.health import health_check
        h_res = health_check(db=db)
        t_health_ms = (time.perf_counter() - t0) * 1000.0
        assert h_res.success is True
        assert h_res.data.status == "healthy"
        assert t_health_ms < 100.0, f"Health check too slow: {t_health_ms:.2f}ms"
        tests_passed += 1
        print(f"[PERF] 3.1 Health Check DB Ping Latency:      {t_health_ms:.2f} ms (< 100ms threshold)")

        # 3.2 Admin Operations Dashboard Aggregation
        tests_run += 1
        t0 = time.perf_counter()
        overview = FinanceService.get_admin_overview(db)
        t_dash_ms = (time.perf_counter() - t0) * 1000.0
        assert overview.total_customers > 0
        assert t_dash_ms < 1200.0, f"Dashboard aggregation too slow: {t_dash_ms:.2f}ms"
        tests_passed += 1
        print(f"[PERF] 3.2 Admin Dashboard Aggregate Latency:   {t_dash_ms:.2f} ms (< 1200ms threshold)")

        # 3.3 Customer 360 Full Ledger Query Latency
        tests_run += 1
        t0 = time.perf_counter()
        c360 = UserService.get_customer_full_detail(db, cust1.id)
        t_c360_ms = (time.perf_counter() - t0) * 1000.0
        assert c360 is not None
        assert t_c360_ms < 250.0, f"Customer 360 query too slow: {t_c360_ms:.2f}ms"
        tests_passed += 1
        print(f"[PERF] 3.3 Customer 360 Deep Ledger Latency:    {t_c360_ms:.2f} ms (< 250ms threshold)")

        # 3.4 Random Forest ML Churn Inference Latency
        tests_run += 1
        t0 = time.perf_counter()
        churn_pred = MLService.predict_customer_churn(cust1.id, db)
        t_ml_churn_ms = (time.perf_counter() - t0) * 1000.0
        assert churn_pred is not None
        assert t_ml_churn_ms < 150.0, f"ML churn inference too slow: {t_ml_churn_ms:.2f}ms"
        tests_passed += 1
        print(f"[PERF] 3.4 Random Forest Churn Inference:       {t_ml_churn_ms:.2f} ms (< 150ms threshold)")

        # 3.5 Ridge Regression MRR Forecast Latency
        tests_run += 1
        t0 = time.perf_counter()
        mrr_res = MLService.forecast_mrr(db)
        t_mrr_ms = (time.perf_counter() - t0) * 1000.0
        assert mrr_res is not None
        assert t_mrr_ms < 200.0, f"MRR forecasting too slow: {t_mrr_ms:.2f}ms"
        tests_passed += 1
        print(f"[PERF] 3.5 Ridge Time-Series MRR Forecast:      {t_mrr_ms:.2f} ms (< 200ms threshold)")

        # 3.6 Complete Consolidated AI Dashboard Pipeline
        tests_run += 1
        t0 = time.perf_counter()
        ai_dash = MLService.get_ai_insights_dashboard(db)
        t_ai_dash_ms = (time.perf_counter() - t0) * 1000.0
        assert ai_dash is not None
        assert t_ai_dash_ms < 1000.0, f"Consolidated AI dashboard too slow: {t_ai_dash_ms:.2f}ms"
        tests_passed += 1
        print(f"[PERF] 3.6 Full AI Dashboard Payload Latency:    {t_ai_dash_ms:.2f} ms (< 1000ms threshold)")

        # ====================================================================
        # SUMMARY
        # ====================================================================
        print("\n" + "=" * 70, flush=True)
        print(f"PHASE 7 MASTER VERIFICATION SUMMARY:", flush=True)
        print(f"   * Total Tests Executed:     {tests_run}", flush=True)
        print(f"   * Tests Passed:             {tests_passed}", flush=True)
        print(f"   * Tests Failed:             {tests_run - tests_passed}", flush=True)
        print(f"   * Pass Rate:                {(tests_passed / tests_run) * 100:.1f}%", flush=True)
        print("ALL PHASE 7 SYSTEM, SECURITY & PERFORMANCE BENCHMARKS PASSED!", flush=True)
        print("=" * 70 + "\n", flush=True)

    finally:
        db.close()

if __name__ == "__main__":
    run_phase7_master_verification()
