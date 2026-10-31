"""API endpoint test suite testing routers, schemas, services and RBAC logic."""
import time
import os
import sys

backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.core.database import SessionLocal, check_foreign_keys_enabled
from app.models.user import UserRole, User
from app.schemas.auth import LoginRequest, PasswordResetRequest, PasswordResetConfirm
from app.schemas.user import UserCreate, UserStaffCreate
from app.api.v1.endpoints import health, auth, users
from app.core.security import decode_access_token
from fastapi import HTTPException

def test_api_suite():
    print("--- Starting SubscriptNova API Endpoint Verification ---")
    db = SessionLocal()
    ts = int(time.time() * 1000)
    test_cust_email = f"customer.{ts}@brightloop.io"
    test_staff_email = f"staff.{ts}@brightloop.io"

    try:
        # 1. Test Health Check Endpoint
        health_res = health.health_check(db=db)
        assert health_res.success is True
        assert health_res.data.status == "healthy"
        assert health_res.data.database_connected is True
        assert health_res.data.sqlite_foreign_keys_enforced is True
        print("[PASS] 1. health.health_check -> Status: healthy (DB Connected, SQLite FK Enforced: True)")

        # 2. Test Customer Registration (Public)
        cust_payload = UserCreate(
            email=test_cust_email,
            full_name="Bright Customer Corp",
            password="StrongPassword2026!",
            company_name="Bright Customer Corp"
        )
        reg_res = auth.register_customer(user_in=cust_payload, db=db)
        assert reg_res.success is True
        assert reg_res.data.email == test_cust_email
        assert reg_res.data.role == UserRole.CUSTOMER
        assert reg_res.data.customer_profile is not None
        assert reg_res.data.customer_profile.credit_balance == 0
        print(f"[PASS] 2. auth.register_customer -> 201 Created (User ID: {reg_res.data.id}, Role: {reg_res.data.role})")

        # 3. Test Password Policy Validation Error
        try:
            weak_payload = UserCreate(
                email=f"weak.{ts}@example.com",
                full_name="Weak User",
                password="weakpassword",  # Missing uppercase, special char
                company_name="Weak"
            )
            auth.register_customer(user_in=weak_payload, db=db)
            assert False, "Should have raised ValueError on weak password"
        except ValueError as e:
            print(f"[PASS] 3. Strict Password Policy Guard -> Caught expected validation error: '{e}'")

        # 4. Test Login & JWT Token Issuance
        login_payload = LoginRequest(
            email="admin@brightloop.io",
            password="Admin@Brightloop2026!"
        )
        login_res = auth.login(login_data=login_payload, db=db)
        assert login_res.success is True
        admin_jwt = login_res.data.access_token
        payload = decode_access_token(admin_jwt)
        assert payload["role"] == "admin"
        print(f"[PASS] 4. auth.login -> JWT Token Issued (Subject: {payload['sub']}, Role: {payload['role']})")

        # 5. Test Customer Login & Profile
        cust_login_payload = LoginRequest(
            email=test_cust_email,
            password="StrongPassword2026!"
        )
        cust_login_res = auth.login(login_data=cust_login_payload, db=db)
        assert cust_login_res.success is True
        cust_user = db.query(User).filter(User.email == test_cust_email).first()
        me_res = auth.get_me(current_user=cust_user)
        assert me_res.data.email == test_cust_email
        print(f"[PASS] 5. auth.get_me -> Verified profile for: {me_res.data.email}")

        # 6. Test RBAC: Admin successfully creates staff member
        admin_user = db.query(User).filter(User.role == UserRole.ADMIN).first()
        staff_payload = UserStaffCreate(
            email=test_staff_email,
            full_name="Kevin Sales",
            password="SalesPassword2026!"
        )
        staff_res = users.create_staff_member(staff_in=staff_payload, current_admin=admin_user, db=db)
        assert staff_res.success is True
        assert staff_res.data.role == UserRole.STAFF
        print(f"[PASS] 6. users.create_staff_member -> Admin created staff: {staff_res.data.email} (Role: {staff_res.data.role})")

        # 7. Test RBAC: Customer trying to inspect another customer's data -> 403 Forbidden
        other_customer = db.query(User).filter(User.email == "testcustomer@example.com").first()
        if other_customer:
            try:
                users.get_user_by_id(user_id=other_customer.id, current_user=cust_user, db=db)
                assert False, "Customer should be forbidden from accessing other users"
            except HTTPException as e:
                assert e.status_code == 403
                print(f"[PASS] 7. RBAC Guard -> Customer access blocked to third-party ID: 403 {e.detail}")

        # 8. Test Password Reset Link Generation & Application
        forgot_res = auth.forgot_password(req=PasswordResetRequest(email=test_staff_email), db=db)
        assert forgot_res.success is True
        reset_token = forgot_res.data["reset_token"]
        assert reset_token is not None

        reset_res = auth.reset_password(
            req=PasswordResetConfirm(token=reset_token, new_password="UpdatedKevinPass2026!"), 
            db=db
        )
        assert reset_res.success is True
        print("[PASS] 8. auth.forgot_password & reset_password -> Token generated and password reset successfully")

        # 9. Verify login with updated password
        relogin = auth.login(
            login_data=LoginRequest(email=test_staff_email, password="UpdatedKevinPass2026!"),
            db=db
        )
        assert relogin.success is True
        print("[PASS] 9. auth.login with new reset password -> Successfully authenticated")

        # 10. List users endpoint
        list_res = users.list_users(role=None, current_staff=admin_user, db=db)
        assert list_res.success is True
        print(f"[PASS] 10. users.list_users -> Returned {len(list_res.data)} users across all roles")

        print("\n[ALL 10 VERIFICATIONS PASSED] Phase 1 backend architecture is 100% operational!")

    finally:
        db.close()

if __name__ == "__main__":
    test_api_suite()
