"""Tax Rates API Endpoints."""
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_admin, require_staff, get_current_user
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.tax import TaxCreate, TaxUpdate, TaxRead
from app.services.tax_service import TaxService

router = APIRouter()

@router.get("/", response_model=ApiResponse[List[TaxRead]], summary="List Tax Rates")
def list_taxes(
    active_only: bool = Query(True),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all configured tax rates (e.g. GST, VAT, Sales Tax)."""
    taxes = TaxService.list_taxes(db, active_only=active_only)
    return ApiResponse(
        success=True,
        message="Tax rates retrieved successfully.",
        data=[TaxRead.model_validate(t) for t in taxes]
    )

@router.get("/{tax_id}", response_model=ApiResponse[TaxRead], summary="Get Tax Rate")
def get_tax(
    tax_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    tax = TaxService.get_by_id(db, tax_id)
    return ApiResponse(
        success=True,
        message="Tax rate retrieved.",
        data=TaxRead.model_validate(tax)
    )

@router.post("/", response_model=ApiResponse[TaxRead], status_code=status.HTTP_201_CREATED, summary="Create Tax Rate")
def create_tax(
    tax_in: TaxCreate,
    current_staff: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """Staff/Admin: Configure a new tax percentage rate."""
    tax = TaxService.create_tax(db, tax_in)
    return ApiResponse(
        success=True,
        message=f"Tax rate '{tax.name}' created with rate {tax.rate}%.",
        data=TaxRead.model_validate(tax)
    )

@router.put("/{tax_id}", response_model=ApiResponse[TaxRead], summary="Update Tax Rate")
def update_tax(
    tax_id: int,
    tax_in: TaxUpdate,
    current_staff: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """Staff/Admin: Modify an existing tax rate."""
    tax = TaxService.update_tax(db, tax_id, tax_in)
    return ApiResponse(
        success=True,
        message="Tax rate updated.",
        data=TaxRead.model_validate(tax)
    )

@router.delete("/{tax_id}", response_model=ApiResponse[None], summary="Delete Tax Rate")
def delete_tax(
    tax_id: int,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin only: Remove a tax rate."""
    TaxService.delete_tax(db, tax_id)
    return ApiResponse(
        success=True,
        message="Tax rate deleted successfully.",
        data=None
    )

