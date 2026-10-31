"""Subscription Plan endpoints."""
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_admin, get_current_user
from app.models.user import User
from app.models.plan import BillingInterval
from app.schemas.common import ApiResponse
from app.schemas.plan import PlanCreate, PlanUpdate, PlanRead
from app.services.plan_service import PlanService

router = APIRouter()

@router.get("/", response_model=ApiResponse[List[PlanRead]], summary="List Subscription Plans")
def list_plans(
    billing_interval: Optional[BillingInterval] = Query(None, description="daily, weekly, monthly, yearly"),
    active_only: bool = Query(True, description="Filter active plans only"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Available to all authenticated users."""
    plans = PlanService.list_plans(db, billing_interval=billing_interval, active_only=active_only)
    return ApiResponse(
        success=True,
        message="Subscription plans retrieved successfully.",
        data=[PlanRead.model_validate(p) for p in plans]
    )

@router.get("/{plan_id}", response_model=ApiResponse[PlanRead], summary="Get Plan Details")
def get_plan(
    plan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    plan = PlanService.get_by_id(db, plan_id)
    return ApiResponse(
        success=True,
        message="Plan details retrieved.",
        data=PlanRead.model_validate(plan)
    )

@router.post("/", response_model=ApiResponse[PlanRead], status_code=status.HTTP_201_CREATED, summary="Create Subscription Plan")
def create_plan(
    plan_in: PlanCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Admin-only: Configure a new subscription plan with billing frequency, 
    minimum quantities, date window, and lifecycle rules (auto-close, early close, pause, renewal).
    """
    plan = PlanService.create_plan(db, plan_in)
    return ApiResponse(
        success=True,
        message=f"Plan '{plan.name}' created successfully.",
        data=PlanRead.model_validate(plan)
    )

@router.put("/{plan_id}", response_model=ApiResponse[PlanRead], summary="Update Subscription Plan")
def update_plan(
    plan_id: int,
    plan_in: PlanUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin-only: Update plan parameters or termination rules."""
    plan = PlanService.update_plan(db, plan_id, plan_in)
    return ApiResponse(
        success=True,
        message=f"Plan '{plan.name}' updated successfully.",
        data=PlanRead.model_validate(plan)
    )

@router.delete("/{plan_id}", response_model=ApiResponse[dict], summary="Delete Plan")
def delete_plan(
    plan_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin-only: Delete a plan."""
    PlanService.delete_plan(db, plan_id)
    return ApiResponse(
        success=True,
        message=f"Plan {plan_id} deleted successfully.",
        data={"deleted_id": plan_id}
    )

