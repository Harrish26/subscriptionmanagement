"""Discounts and Promo Codes API Endpoints."""
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_admin, require_staff, get_current_user
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.discount import (
    DiscountCreate, 
    DiscountUpdate, 
    DiscountRead,
    DiscountValidateRequest,
    DiscountValidateResponse
)
from app.services.discount_service import DiscountService

router = APIRouter()

@router.get("/", response_model=ApiResponse[List[DiscountRead]], summary="List Discounts")
def list_discounts(
    active_only: bool = Query(False),
    current_staff: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """Staff/Admin: View all discount and promotional rules."""
    discounts = DiscountService.list_discounts(db, active_only=active_only)
    return ApiResponse(
        success=True,
        message="Discounts retrieved successfully.",
        data=[DiscountRead.model_validate(d) for d in discounts]
    )

@router.post("/validate", response_model=ApiResponse[DiscountValidateResponse], summary="Validate Discount Code")
def validate_discount(
    req: DiscountValidateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Public/Customer/Staff: Validate discount code against purchase amount,
    date window, usage limits, and scope.
    """
    valid, message, discount_amount, discount_obj = DiscountService.validate_and_compute(
        db=db,
        code=req.code,
        purchase_amount=req.purchase_amount,
        product_id=req.product_id,
        is_subscription=req.is_subscription
    )
    return ApiResponse(
        success=valid,
        message=message,
        data=DiscountValidateResponse(
            valid=valid,
            message=message,
            discount_amount=discount_amount,
            discount=DiscountRead.model_validate(discount_obj) if discount_obj else None
        )
    )

@router.get("/{discount_id}", response_model=ApiResponse[DiscountRead], summary="Get Discount Details")
def get_discount(
    discount_id: int,
    current_staff: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    discount = DiscountService.get_by_id(db, discount_id)
    return ApiResponse(
        success=True,
        message="Discount retrieved.",
        data=DiscountRead.model_validate(discount)
    )

@router.post("/", response_model=ApiResponse[DiscountRead], status_code=status.HTTP_201_CREATED, summary="Create Discount")
def create_discount(
    discount_in: DiscountCreate,
    current_staff: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """Staff/Admin: Create a promotional code with threshold, expiry, and usage limits."""
    discount = DiscountService.create_discount(db, discount_in)
    return ApiResponse(
        success=True,
        message=f"Discount code '{discount.code}' created.",
        data=DiscountRead.model_validate(discount)
    )

@router.put("/{discount_id}", response_model=ApiResponse[DiscountRead], summary="Update Discount")
def update_discount(
    discount_id: int,
    discount_in: DiscountUpdate,
    current_staff: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    discount = DiscountService.update_discount(db, discount_id, discount_in)
    return ApiResponse(
        success=True,
        message="Discount updated.",
        data=DiscountRead.model_validate(discount)
    )

@router.delete("/{discount_id}", response_model=ApiResponse[None], summary="Delete Discount")
def delete_discount(
    discount_id: int,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin only: Remove a discount code."""
    DiscountService.delete_discount(db, discount_id)
    return ApiResponse(
        success=True,
        message="Discount deleted successfully.",
        data=None
    )
