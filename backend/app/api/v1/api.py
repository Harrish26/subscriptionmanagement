"""API v1 Router aggregation."""
from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth, 
    health, 
    users, 
    products, 
    plans, 
    quotations, 
    subscriptions, 
    invoices, 
    simulator,
    taxes,
    discounts,
    payments,
    finance,
    ml
)

api_router = APIRouter()

api_router.include_router(health.router, tags=["Health"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(products.router, prefix="/products", tags=["Product Catalog & Variants"])
api_router.include_router(plans.router, prefix="/plans", tags=["Subscription Plans"])
api_router.include_router(quotations.router, prefix="/quotations", tags=["Quotation Engine"])
api_router.include_router(subscriptions.router, prefix="/subscriptions", tags=["Subscriptions"])
api_router.include_router(invoices.router, prefix="/invoices", tags=["Invoicing & Billing Ledger"])
api_router.include_router(simulator.router, prefix="/simulator", tags=["Time-Travel Billing Simulator"])
api_router.include_router(taxes.router, prefix="/taxes", tags=["Tax Management"])
api_router.include_router(discounts.router, prefix="/discounts", tags=["Discount Management"])
api_router.include_router(payments.router, prefix="/payments", tags=["Payment Management"])
api_router.include_router(finance.router, prefix="/finance", tags=["Finance Dashboard & Analytics"])
api_router.include_router(ml.router, prefix="/ml", tags=["AI & Machine Learning Insights"])
