"""Product and Variant management service."""
from decimal import Decimal
from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status

from app.models.product import Product, ProductVariant
from app.schemas.product import (
    ProductCreate, 
    ProductUpdate, 
    ProductVariantCreate, 
    ProductVariantUpdate
)

class ProductService:
    @staticmethod
    def get_by_id(db: Session, product_id: int) -> Optional[Product]:
        return (
            db.query(Product)
            .options(joinedload(Product.variants))
            .filter(Product.id == product_id)
            .first()
        )

    @staticmethod
    def list_products(
        db: Session, 
        product_type: Optional[str] = None, 
        active_only: bool = True
    ) -> List[Product]:
        query = db.query(Product).options(joinedload(Product.variants))
        if active_only:
            query = query.filter(Product.is_active == True)
        if product_type:
            query = query.filter(Product.product_type == product_type.lower())
        return query.order_by(Product.id.asc()).all()

    @staticmethod
    def create_product(db: Session, product_in: ProductCreate) -> Product:
        db_product = Product(
            name=product_in.name.strip(),
            product_type=product_in.product_type.lower().strip(),
            sales_price=product_in.sales_price,
            cost_price=product_in.cost_price,
            notes=product_in.notes,
            is_active=product_in.is_active
        )
        db.add(db_product)
        db.flush()

        if product_in.variants:
            for v_in in product_in.variants:
                variant = ProductVariant(
                    product_id=db_product.id,
                    variant_name=v_in.variant_name.strip(),
                    sku=v_in.sku.strip() if v_in.sku else None,
                    attributes=v_in.attributes or {},
                    price_surcharge=v_in.price_surcharge,
                    is_active=v_in.is_active
                )
                db.add(variant)

        db.commit()
        db.refresh(db_product)
        return db_product

    @staticmethod
    def update_product(db: Session, product_id: int, product_in: ProductUpdate) -> Product:
        product = ProductService.get_by_id(db, product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with ID {product_id} not found."
            )

        update_data = product_in.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            if key == "name" and value is not None:
                value = value.strip()
            elif key == "product_type" and value is not None:
                value = value.lower().strip()
            setattr(product, key, value)

        db.commit()
        db.refresh(product)
        return product

    @staticmethod
    def delete_product(db: Session, product_id: int) -> bool:
        product = ProductService.get_by_id(db, product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with ID {product_id} not found."
            )
        db.delete(product)
        db.commit()
        return True

    # --- Variant Operations ---

    @staticmethod
    def add_variant(
        db: Session, 
        product_id: int, 
        variant_in: ProductVariantCreate
    ) -> ProductVariant:
        product = ProductService.get_by_id(db, product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with ID {product_id} not found."
            )

        variant = ProductVariant(
            product_id=product.id,
            variant_name=variant_in.variant_name.strip(),
            sku=variant_in.sku.strip() if variant_in.sku else None,
            attributes=variant_in.attributes or {},
            price_surcharge=variant_in.price_surcharge,
            is_active=variant_in.is_active
        )
        db.add(variant)
        db.commit()
        db.refresh(variant)
        return variant

    @staticmethod
    def update_variant(
        db: Session, 
        variant_id: int, 
        variant_in: ProductVariantUpdate
    ) -> ProductVariant:
        variant = db.query(ProductVariant).filter(ProductVariant.id == variant_id).first()
        if not variant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product variant with ID {variant_id} not found."
            )

        update_data = variant_in.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            if key == "variant_name" and value is not None:
                value = value.strip()
            setattr(variant, key, value)

        db.commit()
        db.refresh(variant)
        return variant

    @staticmethod
    def delete_variant(db: Session, variant_id: int) -> bool:
        variant = db.query(ProductVariant).filter(ProductVariant.id == variant_id).first()
        if not variant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product variant with ID {variant_id} not found."
            )
        db.delete(variant)
        db.commit()
        return True
