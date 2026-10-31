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

        print("[SEED] Brightloop Software demo data populated successfully!")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
