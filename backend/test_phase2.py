"""Automated Verification Suite for Phase 2: Catalog, Variants, Plans, and Quotations."""
import os
import sys
import time
from datetime import date, timedelta
from decimal import Decimal

backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.core.database import SessionLocal, Base, engine
import app.models  # Ensure all models are registered on Base
from app.models.user import User, UserRole, Customer
from app.models.plan import BillingInterval
from app.models.quotation import QuotationStatus
from app.schemas.product import ProductCreate, ProductVariantCreate, ProductUpdate
from app.schemas.plan import PlanCreate, PlanUpdate
from app.schemas.quotation import (
    QuotationTemplateCreate, 
    QuotationTemplateLineCreate, 
    QuotationCreate, 
    QuotationLineCreate, 
    QuotationFromTemplateRequest,
    QuotationUpdate
)
from app.services.product_service import ProductService
from app.services.plan_service import PlanService
from app.services.quotation_service import QuotationService
from app.api.v1.endpoints import products, plans, quotations
from fastapi import HTTPException

def run_phase2_verification():
    print("=== SubscriptNova Phase 2 Automated Verification Suite ===")
    
    # 1. Ensure all tables are created
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    ts = int(time.time() * 1000)
    try:
        # Fetch Admin user
        admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
        assert admin is not None, "Admin user must exist"

        # Create or fetch test customer
        cust_user = db.query(User).filter(User.email.like("customer.%")).first()
        if not cust_user or not cust_user.customer_profile:
            from app.schemas.user import UserCreate
            from app.services.user_service import UserService
            cust_user = UserService.create_customer_user(
                db, 
                UserCreate(
                    email=f"phase2_cust_{ts}@example.com",
                    full_name="Acme Corp",
                    password="Password123!",
                    company_name="Acme Corporation"
                )
            )
        customer = cust_user.customer_profile
        print(f"[SETUP] Operating with Admin ({admin.email}) and Customer ({customer.company_name}, ID: {customer.id})")

        # --------------------------------------------------------------------
        # Module 1 & 2: Product Catalog & Multi-Attribute Variants
        # --------------------------------------------------------------------
        print("\n--- Testing Module 1 & 2: Products & Multi-Attribute Variants ---")
        
        # Create product with base price
        prod_in = ProductCreate(
            name=f"Brightloop ERP Suite {ts}",
            product_type="software",
            sales_price=Decimal("1200.00"),
            cost_price=Decimal("350.00"),
            notes="Enterprise grade ERP solution"
        )
        product = ProductService.create_product(db, prod_in)
        assert product.id is not None
        assert isinstance(product.sales_price, Decimal)
        assert product.sales_price == Decimal("1200.00")
        print(f"[PASS] Product created: '{product.name}' (Base Price: ${product.sales_price})")

        # Add Odoo Variant with +560.00 surcharge (per Brightloop problem statement Scene 2)
        v1_in = ProductVariantCreate(
            variant_name="Brand: Odoo Edition",
            sku=f"ERP-ODOO-{ts}",
            attributes={"brand": "Odoo", "support": "Gold"},
            price_surcharge=Decimal("560.00"),
            is_active=True
        )
        v1 = ProductService.add_variant(db, product.id, v1_in)
        assert v1.price_surcharge == Decimal("560.00")
        assert v1.effective_price == Decimal("1760.00")  # 1200 + 560
        print(f"[PASS] Variant created: '{v1.variant_name}' (+${v1.price_surcharge} surcharge, Effective Price: ${v1.effective_price})")

        # Add Multi-Attribute Size/Tier Variant
        v2_in = ProductVariantCreate(
            variant_name="Scale: Enterprise 100-User Tier",
            sku=f"ERP-ENT100-{ts}",
            attributes={"seats": 100, "tier": "Enterprise"},
            price_surcharge=Decimal("2500.00"),
            is_active=True
        )
        v2 = ProductService.add_variant(db, product.id, v2_in)
        assert v2.effective_price == Decimal("3700.00")
        print(f"[PASS] Variant created: '{v2.variant_name}' (+${v2.price_surcharge} surcharge, Effective Price: ${v2.effective_price})")

        # --------------------------------------------------------------------
        # Module 3: Subscription Plans with Lifecycles
        # --------------------------------------------------------------------
        print("\n--- Testing Module 3: Subscription Plans & Lifecycle Policies ---")
        today = date.today()

        # Monthly Plan with Auto-Close
        monthly_plan_in = PlanCreate(
            name=f"Standard Monthly Plan {ts}",
            description="Billed monthly with auto-close",
            billing_interval=BillingInterval.MONTHLY,
            base_cost=Decimal("99.00"),
            min_quantity=1,
            available_from=today,
            available_to=today + timedelta(days=365),
            auto_close_on_expiry=True,
            allow_early_close=True,
            allow_pause=True,
            allow_renewal=False
        )
        monthly_plan = PlanService.create_plan(db, monthly_plan_in)
        assert monthly_plan.billing_interval == BillingInterval.MONTHLY
        assert monthly_plan.auto_close_on_expiry is True
        print(f"[PASS] Monthly Plan created: '{monthly_plan.name}' (${monthly_plan.base_cost}/mo, auto_close={monthly_plan.auto_close_on_expiry})")

        # Yearly Plan with Renewal allowed
        yearly_plan_in = PlanCreate(
            name=f"Enterprise Yearly Plan {ts}",
            description="Billed annually with early close and renewal",
            billing_interval=BillingInterval.YEARLY,
            base_cost=Decimal("990.00"),
            min_quantity=5,
            available_from=today,
            auto_close_on_expiry=False,
            allow_early_close=True,
            allow_pause=True,
            allow_renewal=True
        )
        yearly_plan = PlanService.create_plan(db, yearly_plan_in)
        assert yearly_plan.min_quantity == 5
        assert yearly_plan.allow_renewal is True
        print(f"[PASS] Yearly Plan created: '{yearly_plan.name}' (${yearly_plan.base_cost}/yr, min_qty={yearly_plan.min_quantity})")

        # Invalid Date Range Validation Check
        try:
            PlanService.create_plan(
                db, 
                PlanCreate(
                    name="Invalid Plan",
                    available_from=today,
                    available_to=today - timedelta(days=10),
                    base_cost=Decimal("10.00")
                )
            )
            assert False, "Should have rejected inverted date range"
        except HTTPException as e:
            assert e.status_code == 400
            print(f"[PASS] Date validation guard: Caught expected 400 on inverted dates ({e.detail})")

        # --------------------------------------------------------------------
        # Module 4: Quotation Templates & Quotation Engine
        # --------------------------------------------------------------------
        print("\n--- Testing Module 4: Quotation Templates & Quotation Engine ---")

        # Create Quotation Template with 15 days validity
        tmpl_in = QuotationTemplateCreate(
            name=f"Odoo ERP Standard Offer {ts}",
            description="Pre-packaged Odoo ERP quote for business software",
            plan_id=monthly_plan.id,
            validity_days=15,
            lines=[
                QuotationTemplateLineCreate(
                    product_id=product.id,
                    variant_id=v1.id,  # Odoo Edition (effective unit price 1760.00)
                    quantity=2,
                    discount_percent=Decimal("10.00")  # 10% discount
                )
            ]
        )
        template = QuotationService.create_template(db, tmpl_in)
        assert template.validity_days == 15
        assert len(template.lines) == 1
        print(f"[PASS] Quotation Template created: '{template.name}' (Validity: {template.validity_days} days, Lines: {len(template.lines)})")

        # Instantiate Customer Quotation from Template
        quote_from_tmpl_req = QuotationFromTemplateRequest(
            customer_id=customer.id,
            template_id=template.id,
            payment_terms="Net 30",
            notes="Special prospective client quote"
        )
        quote = QuotationService.create_quotation_from_template(db, quote_from_tmpl_req)
        assert quote.quote_number.startswith("QT-")
        assert quote.valid_until == today + timedelta(days=15)
        assert quote.payment_terms == "Net 30"
        
        # Verify strict Decimal financial arithmetic:
        # 2 units * $1760.00 = $3520.00 subtotal
        # 10% discount = $352.00
        # Total amount = $3168.00
        assert quote.subtotal == Decimal("3520.00"), f"Expected 3520.00, got {quote.subtotal}"
        assert quote.discount_total == Decimal("352.00"), f"Expected 352.00, got {quote.discount_total}"
        assert quote.total_amount == Decimal("3168.00"), f"Expected 3168.00, got {quote.total_amount}"
        print(f"[PASS] Quotation generated: {quote.quote_number} (Expires: {quote.valid_until})")
        print(f"       Subtotal: ${quote.subtotal} | Discount: -${quote.discount_total} | Total: ${quote.total_amount}")

        # Update Quotation Status
        updated_quote = QuotationService.update_quotation(
            db, 
            quote.id, 
            QuotationUpdate(status=QuotationStatus.SENT)
        )
        assert updated_quote.status == QuotationStatus.SENT
        print(f"[PASS] Quotation status transition: {QuotationStatus.DRAFT.value} -> {updated_quote.status.value}")

        # --------------------------------------------------------------------
        # RBAC Endpoint Permissions Check
        # --------------------------------------------------------------------
        print("\n--- Testing RBAC Endpoint Permissions ---")

        # Admin creating product via endpoint
        ep_prod = products.create_product(
            product_in=ProductCreate(name=f"Admin Endpoint Prod {ts}", sales_price=Decimal("150.00")),
            admin=admin,
            db=db
        )
        assert ep_prod.success is True
        print(f"[PASS] Admin endpoint execution: products.create_product -> 201 Created")

        # Customer accessing own quotation -> OK
        cust_view = quotations.get_quotation(quotation_id=quote.id, current_user=cust_user, db=db)
        assert cust_view.success is True
        print(f"[PASS] Customer endpoint execution: quotations.get_quotation (Own quote) -> 200 OK")

        # Customer accessing non-existent / forbidden quote
        other_user = User(id=99999, role=UserRole.CUSTOMER, email="unauth@example.com")
        try:
            quotations.get_quotation(quotation_id=quote.id, current_user=other_user, db=db)
            assert False, "Should have rejected foreign customer access"
        except HTTPException as e:
            assert e.status_code == 403
            print(f"[PASS] RBAC Guard: Foreign customer blocked from quote: 403 {e.detail}")

        print("\n[ALL PHASE 2 VERIFICATIONS PASSED] Products, Variants, Plans & Quotation Engine fully operational!")

    finally:
        db.close()

if __name__ == "__main__":
    run_phase2_verification()
