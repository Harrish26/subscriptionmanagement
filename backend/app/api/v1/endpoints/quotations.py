"""Quotation Template and Customer Quotation Offer endpoints."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_admin, require_staff, get_current_user
from app.models.user import User, UserRole
from app.models.quotation import QuotationStatus
from app.schemas.common import ApiResponse
from app.schemas.quotation import (
    QuotationTemplateCreate, 
    QuotationTemplateUpdate, 
    QuotationTemplateRead,
    QuotationCreate, 
    QuotationFromTemplateRequest, 
    QuotationUpdate, 
    QuotationRead
)
from app.services.quotation_service import QuotationService

router = APIRouter()

# ============================================================================
# Quotation Templates (Sales Blueprint)
# ============================================================================

@router.get("/templates", response_model=ApiResponse[List[QuotationTemplateRead]], summary="List Quotation Templates")
def list_quotation_templates(
    active_only: bool = Query(True),
    current_staff: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """Staff & Admin: List available quotation templates with predefined plans and lines."""
    templates = QuotationService.list_templates(db, active_only=active_only)
    return ApiResponse(
        success=True,
        message="Quotation templates retrieved.",
        data=[QuotationTemplateRead.model_validate(t) for t in templates]
    )

@router.get("/templates/{template_id}", response_model=ApiResponse[QuotationTemplateRead], summary="Get Quotation Template")
def get_quotation_template(
    template_id: int,
    current_staff: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    template = QuotationService.get_template_by_id(db, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Quotation template not found.")
    return ApiResponse(
        success=True,
        message="Template details retrieved.",
        data=QuotationTemplateRead.model_validate(template)
    )

@router.post("/templates", response_model=ApiResponse[QuotationTemplateRead], status_code=status.HTTP_201_CREATED, summary="Create Quotation Template")
def create_quotation_template(
    template_in: QuotationTemplateCreate,
    current_staff: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """Staff & Admin: Define a reusable quotation template with preset plan and line items."""
    template = QuotationService.create_template(db, template_in)
    return ApiResponse(
        success=True,
        message=f"Quotation template '{template.name}' created.",
        data=QuotationTemplateRead.model_validate(template)
    )

@router.put("/templates/{template_id}", response_model=ApiResponse[QuotationTemplateRead], summary="Update Quotation Template")
def update_quotation_template(
    template_id: int,
    template_in: QuotationTemplateUpdate,
    current_staff: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    template = QuotationService.update_template(db, template_id, template_in)
    return ApiResponse(
        success=True,
        message=f"Template '{template.name}' updated.",
        data=QuotationTemplateRead.model_validate(template)
    )

@router.delete("/templates/{template_id}", response_model=ApiResponse[dict], summary="Delete Quotation Template")
def delete_quotation_template(
    template_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin-only: Delete quotation template."""
    QuotationService.delete_template(db, template_id)
    return ApiResponse(
        success=True,
        message=f"Template {template_id} deleted.",
        data={"deleted_id": template_id}
    )

# ============================================================================
# Customer Quotations (Live Proposals)
# ============================================================================

@router.get("/", response_model=ApiResponse[List[QuotationRead]], summary="List Customer Quotations")
def list_quotations(
    status_filter: Optional[QuotationStatus] = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Staff & Admin see all quotations.
    Customers see strictly their own quotations.
    """
    customer_id = None
    if current_user.role == UserRole.CUSTOMER:
        if not current_user.customer_profile:
            return ApiResponse(success=True, message="No customer profile attached.", data=[])
        customer_id = current_user.customer_profile.id

    quotes = QuotationService.list_quotations(db, customer_id=customer_id, status_filter=status_filter)
    return ApiResponse(
        success=True,
        message="Quotations retrieved successfully.",
        data=[QuotationRead.model_validate(q) for q in quotes]
    )

@router.get("/{quotation_id}", response_model=ApiResponse[QuotationRead], summary="Get Quotation")
def get_quotation(
    quotation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    quote = QuotationService.get_quotation_by_id(db, quotation_id)
    if not quote:
        raise HTTPException(status_code=404, detail="Quotation not found.")

    if current_user.role == UserRole.CUSTOMER:
        if not current_user.customer_profile or quote.customer_id != current_user.customer_profile.id:
            raise HTTPException(status_code=403, detail="Access to other customers' quotations is forbidden.")

    return ApiResponse(
        success=True,
        message="Quotation details retrieved.",
        data=QuotationRead.model_validate(quote)
    )

@router.post("/", response_model=ApiResponse[QuotationRead], status_code=status.HTTP_201_CREATED, summary="Create Custom Quotation")
def create_custom_quotation(
    quote_in: QuotationCreate,
    current_staff: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """Staff & Admin: Create a custom proposal with calculated Decimal totals."""
    quote = QuotationService.create_quotation(db, quote_in)
    return ApiResponse(
        success=True,
        message=f"Quotation {quote.quote_number} created successfully.",
        data=QuotationRead.model_validate(quote)
    )

@router.post("/from-template", response_model=ApiResponse[QuotationRead], status_code=status.HTTP_201_CREATED, summary="Create Quotation from Template")
def create_quotation_from_template(
    req: QuotationFromTemplateRequest,
    current_staff: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """
    Staff & Admin: Instantly spin up an offer for a customer from a quotation template.
    Automatically applies validity dates, copies products, and computes Decimal totals.
    """
    quote = QuotationService.create_quotation_from_template(db, req)
    return ApiResponse(
        success=True,
        message=f"Quotation {quote.quote_number} generated from template.",
        data=QuotationRead.model_validate(quote)
    )

@router.put("/{quotation_id}", response_model=ApiResponse[QuotationRead], summary="Update Quotation Status")
def update_quotation(
    quotation_id: int,
    quote_in: QuotationUpdate,
    current_staff: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """Staff & Admin: Update quotation status or parameters."""
    quote = QuotationService.update_quotation(db, quotation_id, quote_in)
    return ApiResponse(
        success=True,
        message=f"Quotation {quote.quote_number} updated.",
        data=QuotationRead.model_validate(quote)
    )
