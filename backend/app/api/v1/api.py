"""API v1 Router aggregation."""
from fastapi import APIRouter
from app.api.v1.endpoints import auth, health, users, products, plans, quotations

api_router = APIRouter()

api_router.include_router(health.router, tags=["Health"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(products.router, prefix="/products", tags=["Product Catalog & Variants"])
api_router.include_router(plans.router, prefix="/plans", tags=["Subscription Plans"])
api_router.include_router(quotations.router, prefix="/quotations", tags=["Quotation Engine"])
