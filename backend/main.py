"""SubscriptNova FastAPI Main Application Entrypoint."""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.api import api_router
from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
import app.models  # Ensure all SQLAlchemy models are registered on Base.metadata
from app.services.user_service import UserService

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure database tables are created and bootstrap admin
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        UserService.create_demo_users_if_missing(db=db)
    finally:
        db.close()

    yield
    # Shutdown logic (if any)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="AI-powered Subscription Management and Recurring Billing Engine",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Configure CORS Middleware (support both explicit origins and any local dev port regex)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API v1 router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/", tags=["Root"])
def root():
    return JSONResponse(
        content={
            "app": settings.PROJECT_NAME,
            "version": "0.1.0",
            "documentation": "/docs",
            "health_check": f"{settings.API_V1_STR}/health"
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
