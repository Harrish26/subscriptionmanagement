"""Health check and diagnostic endpoint."""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db, check_foreign_keys_enabled
from app.schemas.common import ApiResponse, HealthCheckResponse

router = APIRouter()

@router.get("/health", response_model=ApiResponse[HealthCheckResponse], summary="System Health Check")
def health_check(db: Session = Depends(get_db)):
    """Verifies backend health, database connectivity, and SQLite foreign key enforcement."""
    db_connected = False
    try:
        db.execute(text("SELECT 1;"))
        db_connected = True
    except Exception:
        db_connected = False

    fk_enforced = check_foreign_keys_enabled()

    health_data = HealthCheckResponse(
        status="healthy" if (db_connected and fk_enforced) else "degraded",
        service=settings.PROJECT_NAME,
        environment=settings.ENVIRONMENT,
        database_connected=db_connected,
        sqlite_foreign_keys_enforced=fk_enforced,
        timestamp=datetime.now(timezone.utc).isoformat()
    )

    return ApiResponse(
        success=True,
        message="SubscriptNova backend is operational",
        data=health_data
    )

