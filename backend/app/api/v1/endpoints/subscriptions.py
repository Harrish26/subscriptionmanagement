"""Subscription lifecycle and state machine endpoints."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_admin, require_staff, get_current_user
from app.models.user import User, UserRole
from app.models.subscription import SubscriptionStatus
from app.schemas.common import ApiResponse
from app.schemas.subscription import (
    SubscriptionCreate, 
    SubscriptionFromQuotationRequest, 
    SubscriptionTransitionRequest, 
    SubscriptionRead
)
from app.services.subscription_service import SubscriptionService

router = APIRouter()

@router.get("/", response_model=ApiResponse[List[SubscriptionRead]], summary="List Subscriptions")
def list_subscriptions(
    status_filter: Optional[SubscriptionStatus] = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Staff & Admin see all subscriptions across customers.
    Customers see strictly their own subscriptions.
    """
    customer_id = None
    if current_user.role == UserRole.CUSTOMER:
        if not current_user.customer_profile:
            return ApiResponse(success=True, message="No customer profile attached.", data=[])
        customer_id = current_user.customer_profile.id

    subs = SubscriptionService.list_subscriptions(db, customer_id=customer_id, status_filter=status_filter)
    return ApiResponse(
        success=True,
        message="Subscriptions retrieved successfully.",
        data=[SubscriptionRead.model_validate(s) for s in subs]
    )

@router.get("/{subscription_id}", response_model=ApiResponse[SubscriptionRead], summary="Get Subscription Details")
def get_subscription(
    subscription_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sub = SubscriptionService.get_by_id(db, subscription_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found.")

    if current_user.role == UserRole.CUSTOMER:
        if not current_user.customer_profile or sub.customer_id != current_user.customer_profile.id:
            raise HTTPException(status_code=403, detail="Access to other customers' subscriptions is forbidden.")

    return ApiResponse(
        success=True,
        message="Subscription details retrieved.",
        data=SubscriptionRead.model_validate(sub)
    )

@router.post("/", response_model=ApiResponse[SubscriptionRead], status_code=status.HTTP_201_CREATED, summary="Create Subscription (Draft)")
def create_subscription(
    sub_in: SubscriptionCreate,
    current_staff: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """Staff & Admin: Create a new subscription contract in DRAFT state."""
    sub = SubscriptionService.create_subscription(db, sub_in)
    return ApiResponse(
        success=True,
        message=f"Subscription {sub.subscription_number} created in draft state.",
        data=SubscriptionRead.model_validate(sub)
    )

@router.post("/from-quotation", response_model=ApiResponse[SubscriptionRead], status_code=status.HTTP_201_CREATED, summary="Convert Quotation to Subscription")
def create_subscription_from_quotation(
    req: SubscriptionFromQuotationRequest,
    current_staff: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """
    Staff & Admin: Convert an approved quotation into an active subscription.
    Clones product lines, binds plan cadences, and computes initial billing due dates.
    """
    sub = SubscriptionService.create_from_quotation(db, req)
    return ApiResponse(
        success=True,
        message=f"Quotation converted to Subscription {sub.subscription_number}.",
        data=SubscriptionRead.model_validate(sub)
    )

@router.post("/{subscription_id}/transition", response_model=ApiResponse[SubscriptionRead], summary="Transition Subscription State")
def transition_subscription_state(
    subscription_id: int,
    transition: SubscriptionTransitionRequest,
    current_staff: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """
    Staff & Admin: Execute state transition:
    Draft -> Quotation -> Confirmed -> Active -> Closed
    Also supports: pause, resume, close, renew.
    """
    sub = SubscriptionService.transition_state(db, subscription_id, transition)
    return ApiResponse(
        success=True,
        message=f"Subscription {sub.subscription_number} transitioned to '{sub.status.value}'.",
        data=SubscriptionRead.model_validate(sub)
    )

