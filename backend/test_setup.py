import os
import sys

# Ensure backend directory is in sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

print(f"Testing backend setup from: {backend_dir}")

try:
    from app.core.config import settings
    print(f"[OK] Settings loaded: {settings.PROJECT_NAME} (env: {settings.ENVIRONMENT})")
    print(f"[OK] CORS Origins: {settings.CORS_ORIGINS}")

    from app.core.database import Base, engine, SessionLocal, check_foreign_keys_enabled
    import app.models  # Register all models on Base.metadata
    Base.metadata.create_all(bind=engine)
    print(f"[OK] Database tables created: {list(Base.metadata.tables.keys())}")
    print(f"[OK] SQLite foreign keys enforced: {check_foreign_keys_enabled()}")

    from app.services.user_service import UserService
    from app.schemas.user import UserCreate
    from app.models.user import UserRole

    db = SessionLocal()
    try:
        # Bootstrap admin
        admin = UserService.create_admin_user_if_missing(
            db, 
            "admin@brightloop.io", 
            "Admin@Brightloop2026!", 
            "Brightloop Admin"
        )
        print(f"[OK] Admin account verified: {admin.email} (role: {admin.role.value})")

        # Test customer registration
        test_email = "testcustomer@example.com"
        existing = UserService.get_by_email(db, test_email)
        if not existing:
            cust = UserService.create_customer_user(
                db,
                UserCreate(
                    email=test_email,
                    full_name="Acme Shop",
                    password="Password123!",
                    company_name="Acme Corporation"
                )
            )
            print(f"[OK] Customer created: {cust.email} (profile: {cust.customer_profile.company_name})")
            print(f"[OK] Customer credit balance (Decimal): {cust.customer_profile.credit_balance} ({type(cust.customer_profile.credit_balance)})")
        else:
            print(f"[OK] Existing customer verified: {existing.email}")

        # Test auth
        auth_user = UserService.authenticate(db, "admin@brightloop.io", "Admin@Brightloop2026!")
        assert auth_user is not None, "Admin authentication failed!"
        print(f"[OK] Authentication verified for: {auth_user.email}")

        # Test JWT token generation
        from app.core.security import create_access_token, decode_access_token
        token = create_access_token(str(auth_user.id), auth_user.role.value)
        payload = decode_access_token(token)
        assert payload["sub"] == str(auth_user.id)
        assert payload["role"] == "admin"
        print(f"[OK] JWT token encode/decode verified: {payload}")

    finally:
        db.close()

    from main import app
    print(f"[OK] FastAPI app successfully initialized: {app.title} v{app.version}")
    print("[SUCCESS] All Phase 1 backend components verified successfully!")

except Exception as e:
    import traceback
    traceback.print_exc()
    sys.exit(1)
