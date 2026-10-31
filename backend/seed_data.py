"""Database seeder for Brightloop Software demo data."""
import os
import sys
from datetime import date, timedelta
from decimal import Decimal

backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.core.database import SessionLocal, Base, engine
import app.models
from app.models.user import User, UserRole, Customer
from app.models.product import Product, ProductVariant
from app.models.plan import Plan, BillingInterval
from app.models.quotation import QuotationTemplate, QuotationTemplateLine, QuotationStatus
from app.services.user_service import UserService
from app.services.quotation_service import QuotationService
from app.schemas.quotation import QuotationFromTemplateRequest

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        print("[SEED] Starting Brightloop Software data population...")

        # 1. Admin & Staff Users
        admin = UserService.create_admin_user_if_missing(
            db, 
            "admin@brightloop.io", 
            "Admin@Brightloop2026!", 
            "Brightloop Administrator"
        )

        from app.schemas.user import UserStaffCreate, UserCreate
        staff = db.query(User).filter(User.email == "sarah.sales@brightloop.io").first()
        if not staff:
            staff = UserService.create_staff_user(
                db, 
                UserStaffCreate(
                    email="sarah.sales@brightloop.io",
                    full_name="Sarah Jenkins (Senior Sales Rep)",
                    password="StaffPassword2026!"
                )
            )

        # 2. Sample Customers
        customers_data = [
            ("Apex Logistics Corp", "apex.billing@apexlogistics.com", "45 Industrial Parkway, Chicago IL", "+1-312-555-0199"),
            ("Nova Retailers Ltd", "contact@novaretail.com", "88 Market St, San Francisco CA", "+1-415-555-0144"),
            ("Crestview Medical Systems", "admin@crestviewmed.com", "12 Healthcare Blvd, Boston MA", "+1-617-555-0182")
        ]

        cust_objs = []
        for company, email, address, phone in customers_data:
            c_user = UserService.get_by_email(db, email)
            if not c_user:
                c_user = UserService.create_customer_user(
                    db,
                    UserCreate(
                        email=email,
                        full_name=company,
                        password="CustomerPass2026!",
                        company_name=company
                    )
                )
                c_user.customer_profile.billing_address = address
                c_user.customer_profile.phone = phone
                db.commit()
            cust_objs.append(c_user.customer_profile)

        # 3. Products & Multi-Attribute Variants
        products_def = [
            {
                "name": "Brightloop Core Business Software",
                "type": "software",
                "sales_price": Decimal("1200.00"),
                "cost_price": Decimal("300.00"),
                "notes": "Core ERP backbone for subscription management",
                "variants": [
                    {
                        "name": "Brand: Standard Cloud Edition",
                        "sku": "BL-STD-01",
                        "attributes": {"brand": "Brightloop", "deployment": "Cloud"},
                        "surcharge": Decimal("0.00")
                    },
                    {
                        "name": "Brand: Odoo Enterprise Engine",
                        "sku": "BL-ODOO-01",
                        "attributes": {"brand": "Odoo", "engine": "Enterprise"},
                        "surcharge": Decimal("560.00")  # Exactly +560 from the hackathon problem statement!
                    },
                    {
                        "name": "Brand: High-Performance Multi-Tenant",
                        "sku": "BL-HPC-01",
                        "attributes": {"brand": "Brightloop", "tier": "HighPerformance"},
                        "surcharge": Decimal("1450.00")
                    }
                ]
            },
            {
                "name": "Customer Support Desk Pro",
                "type": "service",
                "sales_price": Decimal("350.00"),
                "cost_price": Decimal("100.00"),
                "notes": "Omnichannel ticketing and client communications",
                "variants": [
                    {
                        "name": "SLA: 24/7 Dedicated Account Manager",
                        "sku": "CS-247-SLA",
                        "attributes": {"sla": "24/7", "coverage": "Global"},
                        "surcharge": Decimal("250.00")
                    },
                    {
                        "name": "SLA: Business Hours Standard",
                        "sku": "CS-BH-STD",
                        "attributes": {"sla": "BusinessHours", "coverage": "Domestic"},
                        "surcharge": Decimal("0.00")
                    }
                ]
            },
            {
                "name": "Automated Multi-Location Inventory Add-on",
                "type": "addon",
                "sales_price": Decimal("480.00"),
                "cost_price": Decimal("120.00"),
                "notes": "Real-time stock sync across multiple regional hubs",
                "variants": [
                    {
                        "name": "Scale: Up to 5 Hubs",
                        "sku": "INV-5HUB",
                        "attributes": {"hubs": 5},
                        "surcharge": Decimal("0.00")
                    },
                    {
                        "name": "Scale: Unlimited Global Hubs",
                        "sku": "INV-UNLIM",
                        "attributes": {"hubs": "Unlimited"},
                        "surcharge": Decimal("650.00")
                    }
                ]
            }
        ]

        created_products = []
        for pdef in products_def:
            p = db.query(Product).filter(Product.name == pdef["name"]).first()
            if not p:
                p = Product(
                    name=pdef["name"],
                    product_type=pdef["type"],
                    sales_price=pdef["sales_price"],
                    cost_price=pdef["cost_price"],
                    notes=pdef["notes"],
                    is_active=True
                )
                db.add(p)
                db.flush()

                for vdef in pdef["variants"]:
                    v = ProductVariant(
                        product_id=p.id,
                        variant_name=vdef["name"],
                        sku=vdef["sku"],
                        attributes=vdef["attributes"],
                        price_surcharge=vdef["surcharge"],
                        is_active=True
                    )
                    db.add(v)
                db.commit()
                db.refresh(p)
            created_products.append(p)

        # 4. Subscription Plans
        today = date.today()
        plans_def = [
            {
                "name": "Monthly Flexible Growth Plan",
                "desc": "Billed monthly. Auto-renews or can be paused anytime.",
                "interval": BillingInterval.MONTHLY,
                "cost": Decimal("99.00"),
                "min_qty": 1,
                "from": today,
                "to": today + timedelta(days=730),
                "auto_close": False,
                "allow_close": True,
                "allow_pause": True,
                "allow_renew": True
            },
            {
                "name": "Enterprise Annual Contract",
                "desc": "Discounted annual billing for corporate accounts with minimum 5 seats.",
                "interval": BillingInterval.YEARLY,
                "cost": Decimal("990.00"),
                "min_qty": 5,
                "from": today,
                "to": None,
                "auto_close": False,
                "allow_close": True,
                "allow_pause": True,
                "allow_renew": True
            },
            {
                "name": "Fast-Track Sprint Plan (Weekly)",
                "desc": "Weekly billed trial period. Automatically terminates upon expiry.",
                "interval": BillingInterval.WEEKLY,
                "cost": Decimal("35.00"),
                "min_qty": 1,
                "from": today,
                "to": today + timedelta(days=90),
                "auto_close": True,  # Auto-close on expiry
                "allow_close": False,
                "allow_pause": False,
                "allow_renew": False
            }
        ]

        created_plans = []
        for pld in plans_def:
            plan = db.query(Plan).filter(Plan.name == pld["name"]).first()
            if not plan:
                plan = Plan(
                    name=pld["name"],
                    description=pld["desc"],
                    billing_interval=pld["interval"],
                    base_cost=pld["cost"],
                    min_quantity=pld["min_qty"],
                    available_from=pld["from"],
                    available_to=pld["to"],
                    auto_close_on_expiry=pld["auto_close"],
                    allow_early_close=pld["allow_close"],
                    allow_pause=pld["allow_pause"],
                    allow_renewal=pld["allow_renew"],
                    is_active=True
                )
                db.add(plan)
                db.commit()
                db.refresh(plan)
            created_plans.append(plan)

        # 5. Quotation Templates
        core_prod = created_products[0]
        odoo_variant = next(v for v in core_prod.variants if "Odoo" in v.variant_name)
        support_prod = created_products[1]

        tmpl1 = db.query(QuotationTemplate).filter(QuotationTemplate.name == "Brightloop Odoo Standard Package").first()
        if not tmpl1:
            tmpl1 = QuotationTemplate(
                name="Brightloop Odoo Standard Package",
                description="Core software powered by Odoo Enterprise Engine + 24/7 SLA Support",
                plan_id=created_plans[0].id,  # Monthly
                validity_days=30,
                is_active=True
            )
            db.add(tmpl1)
            db.flush()

            line1 = QuotationTemplateLine(
                template_id=tmpl1.id,
                product_id=core_prod.id,
                variant_id=odoo_variant.id,
                quantity=2,
                unit_price=Decimal("1760.00"),  # 1200 + 560
                discount_percent=Decimal("5.00")
            )
            line2 = QuotationTemplateLine(
                template_id=tmpl1.id,
                product_id=support_prod.id,
                variant_id=None,
                quantity=1,
                unit_price=Decimal("350.00"),
                discount_percent=Decimal("0.00")
            )
            db.add_all([line1, line2])
            db.commit()

        # 6. Sample Generated Quotation for Apex Logistics
        if cust_objs and tmpl1:
            existing_q = db.query(app.models.Quotation).first()
            if not existing_q:
                QuotationService.create_quotation_from_template(
                    db,
                    QuotationFromTemplateRequest(
                        customer_id=cust_objs[0].id,
                        template_id=tmpl1.id,
                        payment_terms="Net 30",
                        notes="Initial offer for Apex Logistics Corp multi-seat deployment"
                    )
                )

        # 7. Taxes
        from app.models.tax import Tax
        tax_gst = db.query(Tax).filter(Tax.name == "GST 18% (Standard)").first()
        if not tax_gst:
            tax_gst = Tax(
                name="GST 18% (Standard)",
                rate=Decimal("18.00"),
                description="Standard Goods and Services Tax",
                is_active=True,
                is_default=True
            )
            db.add(tax_gst)
        tax_vat = db.query(Tax).filter(Tax.name == "VAT 10% (Reduced)").first()
        if not tax_vat:
            tax_vat = Tax(
                name="VAT 10% (Reduced)",
                rate=Decimal("10.00"),
                description="Reduced Value Added Tax for enterprise cloud services",
                is_active=True,
                is_default=False
            )
            db.add(tax_vat)
        db.commit()

        # 8. Promotional Discounts
        from app.models.discount import Discount, DiscountType, DiscountScope
        disc_save20 = db.query(Discount).filter(Discount.code == "SAVE20").first()
        if not disc_save20:
            disc_save20 = Discount(
                code="SAVE20",
                name="Spring 2026 SaaS Growth Incentive",
                discount_type=DiscountType.PERCENTAGE,
                value=Decimal("20.00"),
                min_purchase_amount=Decimal("1000.00"),
                start_date=today - timedelta(days=30),
                expiry_date=today + timedelta(days=180),
                max_uses=100,
                used_count=12,
                scope=DiscountScope.ALL,
                is_active=True
            )
            db.add(disc_save20)
        
        disc_welcome = db.query(Discount).filter(Discount.code == "WELCOME100").first()
        if not disc_welcome:
            disc_welcome = Discount(
                code="WELCOME100",
                name="New Enterprise Onboarding Credit",
                discount_type=DiscountType.FIXED,
                value=Decimal("100.00"),
                min_purchase_amount=Decimal("500.00"),
                start_date=today - timedelta(days=30),
                expiry_date=today + timedelta(days=365),
                max_uses=500,
                used_count=45,
                scope=DiscountScope.SUBSCRIPTION,
                is_active=True
            )
            db.add(disc_welcome)
        db.commit()

        # 9. Realistic Subscriptions (Active, Paused, Closed)
        from app.models.subscription import Subscription, SubscriptionLine, SubscriptionStatus
        
        # Customer 1 (Apex): Active subscription
        sub_active = db.query(Subscription).filter(Subscription.subscription_number == "SUB-DEMO-APEX-01").first()
        if not sub_active and len(cust_objs) > 0 and len(created_plans) > 0:
            sub_active = Subscription(
                subscription_number="SUB-DEMO-APEX-01",
                customer_id=cust_objs[0].id,
                plan_id=created_plans[0].id,
                status=SubscriptionStatus.ACTIVE,
                start_date=today - timedelta(days=60),
                next_billing_date=today + timedelta(days=30),
                payment_terms="Net 30",
                subtotal=Decimal("3520.00"),
                discount_total=Decimal("176.00"),
                tax_total=Decimal("601.92"),
                total_amount=Decimal("3945.92"),
                current_billing_cycle=2
            )
            db.add(sub_active)
            db.flush()
            db.add(SubscriptionLine(
                subscription_id=sub_active.id,
                product_id=core_prod.id,
                variant_id=odoo_variant.id,
                description="Core ERP Software - Odoo Enterprise Engine (Demo)",
                quantity=2,
                unit_price=Decimal("1760.00"),
                discount_percent=Decimal("5.00"),
                line_total=Decimal("3344.00")
            ))
            db.commit()

        # Customer 2 (Nova Retailers): Paused subscription
        sub_paused = db.query(Subscription).filter(Subscription.subscription_number == "SUB-DEMO-NOVA-01").first()
        if not sub_paused and len(cust_objs) > 1 and len(created_plans) > 0:
            sub_paused = Subscription(
                subscription_number="SUB-DEMO-NOVA-01",
                customer_id=cust_objs[1].id,
                plan_id=created_plans[0].id,
                status=SubscriptionStatus.PAUSED,
                start_date=today - timedelta(days=45),
                next_billing_date=today + timedelta(days=15),
                payment_terms="Immediate",
                subtotal=Decimal("1200.00"),
                discount_total=Decimal("0.00"),
                tax_total=Decimal("216.00"),
                total_amount=Decimal("1416.00"),
                current_billing_cycle=1
            )
            db.add(sub_paused)
            db.flush()
            db.add(SubscriptionLine(
                subscription_id=sub_paused.id,
                product_id=core_prod.id,
                variant_id=None,
                description="Brightloop Core Business Software (Standard Cloud)",
                quantity=1,
                unit_price=Decimal("1200.00"),
                discount_percent=Decimal("0.00"),
                line_total=Decimal("1200.00")
            ))
            db.commit()

        # Customer 3 (Crestview): Closed subscription
        sub_closed = db.query(Subscription).filter(Subscription.subscription_number == "SUB-DEMO-CREST-01").first()
        if not sub_closed and len(cust_objs) > 2 and len(created_plans) > 2:
            sub_closed = Subscription(
                subscription_number="SUB-DEMO-CREST-01",
                customer_id=cust_objs[2].id,
                plan_id=created_plans[2].id, # Weekly sprint plan
                status=SubscriptionStatus.CLOSED,
                start_date=today - timedelta(days=90),
                expiry_date=today - timedelta(days=10),
                next_billing_date=today - timedelta(days=10),
                payment_terms="Immediate",
                subtotal=Decimal("480.00"),
                discount_total=Decimal("0.00"),
                tax_total=Decimal("86.40"),
                total_amount=Decimal("566.40"),
                current_billing_cycle=8
            )
            db.add(sub_closed)
            db.flush()
            db.commit()

        # 10. Realistic Invoices & Payments (Paid, Partially Paid, Unpaid, Overdue)
        from app.models.invoice import Invoice, InvoiceLine, InvoiceStatus
        from app.models.payment import Payment, PaymentMethod, PaymentReminder

        # Invoice 1: Fully Paid
        inv_paid = db.query(Invoice).filter(Invoice.invoice_number == "INV-DEMO-PAID-01").first()
        if not inv_paid and sub_active:
            inv_paid = Invoice(
                invoice_number="INV-DEMO-PAID-01",
                subscription_id=sub_active.id,
                customer_id=cust_objs[0].id,
                billing_period_start=today - timedelta(days=60),
                billing_period_end=today - timedelta(days=30),
                issue_date=today - timedelta(days=60),
                due_date=today - timedelta(days=30),
                status=InvoiceStatus.PAID,
                subtotal=Decimal("3520.00"),
                discount_total=Decimal("176.00"),
                tax_total=Decimal("601.92"),
                total_amount=Decimal("3945.92"),
                amount_paid=Decimal("3945.92"),
                balance_due=Decimal("0.00"),
                notes="Initial cycle payment completed in full via Bank Wire"
            )
            db.add(inv_paid)
            db.flush()
            db.add(Payment(
                payment_number="PAY-DEMO-WIRE-01",
                invoice_id=inv_paid.id,
                customer_id=cust_objs[0].id,
                amount=Decimal("3945.92"),
                payment_date=today - timedelta(days=45),
                payment_method=PaymentMethod.BANK_TRANSFER,
                transaction_reference="WIRE-CITI-2026-0991",
                notes="Bank Wire full settlement for invoice INV-DEMO-PAID-01"
            ))
            db.commit()

        # Invoice 2: Partially Paid
        inv_part = db.query(Invoice).filter(Invoice.invoice_number == "INV-DEMO-PART-01").first()
        if not inv_part and sub_active:
            inv_part = Invoice(
                invoice_number="INV-DEMO-PART-01",
                subscription_id=sub_active.id,
                customer_id=cust_objs[0].id,
                billing_period_start=today - timedelta(days=30),
                billing_period_end=today,
                issue_date=today - timedelta(days=30),
                due_date=today + timedelta(days=15),
                status=InvoiceStatus.PARTIALLY_PAID,
                subtotal=Decimal("3520.00"),
                discount_total=Decimal("176.00"),
                tax_total=Decimal("601.92"),
                total_amount=Decimal("3945.92"),
                amount_paid=Decimal("2000.00"),
                balance_due=Decimal("1945.92"),
                notes="Partial payment installment recorded via UPI"
            )
            db.add(inv_part)
            db.flush()
            db.add(Payment(
                payment_number="PAY-DEMO-UPI-01",
                invoice_id=inv_part.id,
                customer_id=cust_objs[0].id,
                amount=Decimal("2000.00"),
                payment_date=today - timedelta(days=10),
                payment_method=PaymentMethod.UPI,
                transaction_reference="UPI-HDFC-9928172",
                notes="50% installment advance via UPI"
            ))
            db.commit()

        # Invoice 3: Delinquent / Overdue
        inv_overdue = db.query(Invoice).filter(Invoice.invoice_number == "INV-DEMO-OVERDUE-01").first()
        if not inv_overdue and len(cust_objs) > 1 and sub_paused:
            inv_overdue = Invoice(
                invoice_number="INV-DEMO-OVERDUE-01",
                subscription_id=sub_paused.id,
                customer_id=cust_objs[1].id,
                billing_period_start=today - timedelta(days=45),
                billing_period_end=today - timedelta(days=15),
                issue_date=today - timedelta(days=45),
                due_date=today - timedelta(days=15),
                status=InvoiceStatus.OVERDUE,
                subtotal=Decimal("1200.00"),
                discount_total=Decimal("0.00"),
                tax_total=Decimal("216.00"),
                total_amount=Decimal("1416.00"),
                amount_paid=Decimal("0.00"),
                balance_due=Decimal("1416.00"),
                notes="Overdue past 15 days - Automated dunning triggered"
            )
            db.add(inv_overdue)
            db.flush()
            db.add(PaymentReminder(
                invoice_id=inv_overdue.id,
                customer_id=cust_objs[1].id,
                reminder_channel="email",
                due_date=inv_overdue.due_date,
                amount_due=Decimal("1416.00"),
                message="Automated reminder: Invoice INV-DEMO-OVERDUE-01 is past due. Please settle via portal."
            ))
            db.commit()

        # Invoice 4: Current Unpaid
        inv_unpaid = db.query(Invoice).filter(Invoice.invoice_number == "INV-DEMO-UNPAID-01").first()
        if not inv_unpaid and len(cust_objs) > 2 and sub_closed:
            inv_unpaid = Invoice(
                invoice_number="INV-DEMO-UNPAID-01",
                subscription_id=sub_closed.id,
                customer_id=cust_objs[2].id,
                billing_period_start=today,
                billing_period_end=today + timedelta(days=30),
                issue_date=today,
                due_date=today + timedelta(days=30),
                status=InvoiceStatus.UNPAID,
                subtotal=Decimal("700.00"),
                discount_total=Decimal("70.00"),
                tax_total=Decimal("113.40"),
                total_amount=Decimal("743.40"),
                amount_paid=Decimal("0.00"),
                balance_due=Decimal("743.40"),
                notes="Current cycle invoice awaiting customer approval"
            )
            db.add(inv_unpaid)
            db.commit()

        print("[SEED] Brightloop Software demo data populated successfully!")
        print("\n=== Safe Demo Credentials for Evaluation ===")
        print("  * Admin:    admin@brightloop.io              / Admin@Brightloop2026!")
        print("  * Staff:    sarah.sales@brightloop.io        / StaffPassword2026!")
        print("  * Customer: apex.billing@apexlogistics.com   / CustomerPass2026!")
        print("  * Customer: contact@novaretail.com           / CustomerPass2026!")
        print("  * Customer: admin@crestviewmed.com           / CustomerPass2026!")
        print("=============================================\n")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()

