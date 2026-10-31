"""
Verification script for Authentication, Customer Account Creation,
Customer Edit, Customer Self-Registration, and RBAC Directory Access.
"""
import sys
import os
import time
from decimal import Decimal

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import HTTPException
from app.core.database import SessionLocal
from app.services.user_service import UserService
from app.models.user import User, Customer, UserRole
from app.schemas.auth import LoginRequest
from app.schemas.user import CustomerCreateByStaff, CustomerUpdate, UserCreate
from app.core.security import verify_password
from app.api.v1.endpoints import auth, users

def run_tests():
    print("=" * 65)
    print("   SUBSCRIPTNOVA AUTHENTICATION & CUSTOMER MGMT TEST SUITE")
    print("=" * 65)

    db = SessionLocal()
    tests_passed = 0

    try:
        # Step 1: Ensure demo users exist & verify passwords
        print("\n--- 1. Demo User Seeding & Credentials Verification ---")
        demo_users = UserService.create_demo_users_if_missing(db)
        print(f"[PASS] Demo accounts verified: {list(demo_users.keys())}")

        roles_to_test = [
            ("admin@brightloop.io", "Admin@Brightloop2026!", UserRole.ADMIN),
            ("staff@brightloop.io", "Staff@Brightloop2026!", UserRole.STAFF),
            ("customer@brightloop.io", "Customer@Brightloop2026!", UserRole.CUSTOMER),
        ]

        auth_tokens = {}
        for email, password, expected_role in roles_to_test:
            user = UserService.authenticate(db, email=email, password=password)
            assert user is not None, f"UserService.authenticate failed for {email}"
            assert user.role == expected_role, f"Expected {expected_role}, got {user.role}"
            assert verify_password(password, user.hashed_password) is True

            # Test API login endpoint
            login_req = LoginRequest(email=email, password=password)
            token_res = auth.login(login_data=login_req, db=db)
            assert token_res.success is True
            assert token_res.data.access_token is not None
            auth_tokens[expected_role.value] = (token_res.data.access_token, user)
            print(f"[PASS] Login & Session verified for {expected_role.value.upper()}: {email} (User #{user.id})")
            tests_passed += 1

        admin_user = auth_tokens["admin"][1]
        staff_user = auth_tokens["staff"][1]
        customer_user = auth_tokens["customer"][1]

        # Step 2: Customer Directory Access (Admin and Staff can access; Customer is blocked)
        print("\n--- 2. Customer Directory RBAC Access ---")
        admin_res = users.list_customers_overview(current_staff=admin_user, db=db)
        assert admin_res.success is True
        print(f"[PASS] Admin retrieved customer directory: {len(admin_res.data)} customers loaded")
        tests_passed += 1

        staff_res = users.list_customers_overview(current_staff=staff_user, db=db)
        assert staff_res.success is True
        print(f"[PASS] Staff retrieved customer directory: {len(staff_res.data)} customers loaded")
        tests_passed += 1

        # RBAC Check: Customer role cannot access staff-only endpoint
        try:
            from app.api.deps import require_staff
            require_staff(current_user=customer_user)
            assert False, "Should have raised 403 Forbidden for customer accessing staff route"
        except HTTPException as exc:
            assert exc.status_code == 403
            print(f"[PASS] Multi-tenant isolation verified: Customer blocked from customer directory (HTTP 403)")
            tests_passed += 1

        # Step 3: Admin Creates Customer Account
        print("\n--- 3. Customer Account Creation by Admin ---")
        ts = int(time.time() * 1000)
        new_customer_payload = CustomerCreateByStaff(
            full_name=f"Enterprise Client {ts}",
            email=f"client_{ts}@enterprise.org",
            company_name="Enterprise Inc.",
            billing_address="100 Innovation Way, Suite 400",
            phone="+1 800-555-0199",
            tax_identifier="US-EIN-987654321",
            password="Customer@Brightloop2026!"
        )

        create_res = users.create_customer_account(cust_in=new_customer_payload, current_staff=admin_user, db=db)
        assert create_res.success is True
        customer_id = create_res.data["customer_id"]
        print(f"[PASS] Customer account created: ID #{customer_id}, Email: {create_res.data['email']}")
        tests_passed += 1

        # Verify new customer appears in directory
        check_dir_res = users.list_customers_overview(current_staff=admin_user, db=db)
        found = any(c.email == new_customer_payload.email for c in check_dir_res.data)
        assert found, "Newly created customer not visible in directory!"
        print(f"[PASS] Newly created customer verified in live directory.")
        tests_passed += 1

        # Step 4: Admin Edits Customer Account
        print("\n--- 4. Customer Account Editing ---")
        update_payload = CustomerUpdate(
            full_name=f"Enterprise Client {ts} (Updated)",
            company_name="Enterprise Global Inc.",
            phone="+1 800-555-9999",
            credit_balance=Decimal("250.00")
        )
        update_res = users.update_customer_account(customer_id=customer_id, cust_in=update_payload, current_user=admin_user, db=db)
        assert update_res.success is True
        assert update_res.data["full_name"] == f"Enterprise Client {ts} (Updated)"
        assert update_res.data["company_name"] == "Enterprise Global Inc."
        print(f"[PASS] Customer account updated: Name='{update_res.data['full_name']}', Company='{update_res.data['company_name']}'")
        tests_passed += 1

        # Step 5: Customer Self-Registration & Subsequent Login
        print("\n--- 5. Customer Self-Registration ---")
        self_reg_payload = UserCreate(
            full_name=f"Self Registered User {ts}",
            email=f"self_{ts}@clientportal.io",
            company_name="Portal Tech LLC",
            password="SelfReg@Brightloop2026!"
        )
        reg_res = auth.register_customer(user_in=self_reg_payload, db=db)
        assert reg_res.success is True
        assert reg_res.data.email == self_reg_payload.email
        assert reg_res.data.role == UserRole.CUSTOMER
        print(f"[PASS] Customer self-registered: ID #{reg_res.data.id}, Email: {reg_res.data.email}")
        tests_passed += 1

        # Test authenticate with self-registered credentials
        auth_self = UserService.authenticate(db, email=self_reg_payload.email, password=self_reg_payload.password)
        assert auth_self is not None
        assert auth_self.role == UserRole.CUSTOMER
        print(f"[PASS] Self-registered customer successfully authenticated.")
        tests_passed += 1

        # Step 6: Customer Account Deletion / Archival
        print("\n--- 6. Customer Account Deletion ---")
        del_res = users.delete_customer_account(customer_id=customer_id, current_admin=admin_user, db=db)
        assert del_res.success is True
        print(f"[PASS] Customer ID #{customer_id} successfully deactivated/archived: {del_res.message}")
        tests_passed += 1

        print("\n" + "=" * 65)
        print(f"   ALL {tests_passed} AUTHENTICATION & CUSTOMER MANAGEMENT TESTS PASSED!")
        print("=" * 65)

    finally:
        db.close()

if __name__ == "__main__":
    run_tests()
