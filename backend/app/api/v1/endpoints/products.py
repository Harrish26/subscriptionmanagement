"""Product Catalog and Multi-Attribute Variant endpoints."""
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_admin, require_staff, get_current_user
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.product import (
    ProductCreate, 
    ProductUpdate, 
    ProductRead, 
    ProductVariantCreate, 
    ProductVariantUpdate, 
    ProductVariantRead
)
from app.services.product_service import ProductService

router = APIRouter()

@router.get("/", response_model=ApiResponse[List[ProductRead]], summary="List Products")
def list_products(
    product_type: Optional[str] = Query(None, description="Filter by product type"),
    active_only: bool = Query(True, description="Filter active products only"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Available to all authenticated users (Admin, Staff, Customer)."""
    products = ProductService.list_products(db, product_type=product_type, active_only=active_only)
    return ApiResponse(
        success=True,
        message="Products retrieved successfully.",
        data=[ProductRead.model_validate(p) for p in products]
    )

@router.get("/{product_id}", response_model=ApiResponse[ProductRead], summary="Get Product Details")
def get_product(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    product = ProductService.get_by_id(db, product_id)
    return ApiResponse(
        success=True,
        message="Product details retrieved.",
        data=ProductRead.model_validate(product)
    )

@router.post("/", response_model=ApiResponse[ProductRead], status_code=status.HTTP_201_CREATED, summary="Create Product")
def create_product(
    product_in: ProductCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin-only: Create a new product with optional initial variants."""
    product = ProductService.create_product(db, product_in)
    return ApiResponse(
        success=True,
        message=f"Product '{product.name}' created successfully.",
        data=ProductRead.model_validate(product)
    )

@router.put("/{product_id}", response_model=ApiResponse[ProductRead], summary="Update Product")
def update_product(
    product_id: int,
    product_in: ProductUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin-only: Update product details."""
    product = ProductService.update_product(db, product_id, product_in)
    return ApiResponse(
        success=True,
        message=f"Product '{product.name}' updated successfully.",
        data=ProductRead.model_validate(product)
    )

@router.delete("/{product_id}", response_model=ApiResponse[dict], summary="Delete Product")
def delete_product(
    product_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin-only: Delete product and associated variants."""
    ProductService.delete_product(db, product_id)
    return ApiResponse(
        success=True,
        message=f"Product {product_id} deleted successfully.",
        data={"deleted_id": product_id}
    )

# --- Multi-Attribute Variant Endpoints ---

@router.post("/{product_id}/variants", response_model=ApiResponse[ProductVariantRead], status_code=status.HTTP_201_CREATED, summary="Add Variant")
def add_product_variant(
    product_id: int,
    variant_in: ProductVariantCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Admin-only: Add a multi-attribute variant with surcharge pricing.
    Example: Odoo brand adds +560.00 surcharge to base price.
    """
    variant = ProductService.add_variant(db, product_id, variant_in)
    return ApiResponse(
        success=True,
        message=f"Variant '{variant.variant_name}' attached to product {product_id}.",
        data=ProductVariantRead.model_validate(variant)
    )

@router.put("/variants/{variant_id}", response_model=ApiResponse[ProductVariantRead], summary="Update Variant")
def update_product_variant(
    variant_id: int,
    variant_in: ProductVariantUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin-only: Update variant properties or price surcharge."""
    variant = ProductService.update_variant(db, variant_id, variant_in)
    return ApiResponse(
        success=True,
        message=f"Variant '{variant.variant_name}' updated successfully.",
        data=ProductVariantRead.model_validate(variant)
    )

@router.delete("/variants/{variant_id}", response_model=ApiResponse[dict], summary="Delete Variant")
def delete_product_variant(
    variant_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Admin-only: Delete a product variant."""
    ProductService.delete_variant(db, variant_id)
    return ApiResponse(
        success=True,
        message=f"Variant {variant_id} deleted successfully.",
        data={"deleted_variant_id": variant_id}
    )
