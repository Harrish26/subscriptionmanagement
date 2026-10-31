"""Discount and Promotional Rules Management Service."""
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.discount import Discount, DiscountType, DiscountScope
from app.models.product import Product
from app.schemas.discount import (
    DiscountCreate, 
    DiscountUpdate, 
    DiscountValidateResponse, 
    DiscountRead
)

TWOPLACES = Decimal("0.01")

class DiscountService:
    @staticmethod
    def create_discount(db: Session, discount_in: DiscountCreate) -> Discount:
        clean_code = discount_in.code.strip().upper()
        existing = db.query(Discount).filter(Discount.code == clean_code).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Discount code '{clean_code}' already exists."
            )

        if discount_in.scope == DiscountScope.PRODUCT and discount_in.product_id:
            prod = db.query(Product).filter(Product.id == discount_in.product_id).first()
            if not prod:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Product #{discount_in.product_id} not found."
                )

        discount = Discount(
            code=clean_code,
            name=discount_in.name,
            discount_type=discount_in.discount_type,
            value=discount_in.value.quantize(TWOPLACES, rounding=ROUND_HALF_UP),
            min_purchase_amount=discount_in.min_purchase_amount.quantize(TWOPLACES, rounding=ROUND_HALF_UP),
            start_date=discount_in.start_date,
            expiry_date=discount_in.expiry_date,
            max_uses=discount_in.max_uses,
            used_count=0,
            scope=discount_in.scope,
            product_id=discount_in.product_id,
            is_active=discount_in.is_active
        )
        db.add(discount)
        db.commit()
        db.refresh(discount)
        return discount

    @staticmethod
    def list_discounts(db: Session, active_only: bool = False) -> List[Discount]:
        query = db.query(Discount)
        if active_only:
            query = query.filter(Discount.is_active == True)
        return query.order_by(Discount.id.desc()).all()

    @staticmethod
    def get_by_id(db: Session, discount_id: int) -> Discount:
        discount = db.query(Discount).filter(Discount.id == discount_id).first()
        if not discount:
            raise HTTPException(status_code=404, detail="Discount not found.")
        return discount

    @staticmethod
    def get_by_code(db: Session, code: str) -> Optional[Discount]:
        return db.query(Discount).filter(Discount.code == code.strip().upper()).first()

    @staticmethod
    def validate_and_compute(
        db: Session,
        code: str,
        purchase_amount: Decimal,
        product_id: Optional[int] = None,
        is_subscription: bool = True,
        today: Optional[date] = None
    ) -> Tuple[bool, str, Decimal, Optional[Discount]]:
        """
        Validates discount eligibility:
        - Exists and is_active
        - Date window: start_date <= today <= expiry_date
        - Usage limit: used_count < max_uses
        - Threshold: purchase_amount >= min_purchase_amount
        - Scope: product vs subscription vs all
        Returns (valid, message, discount_amount, discount_obj)
        """
        clean_code = code.strip().upper()
        discount = DiscountService.get_by_code(db, clean_code)
        check_date = today or date.today()

        if not discount:
            return False, f"Discount code '{clean_code}' does not exist.", Decimal("0.00"), None

        if not discount.is_active:
            return False, f"Discount code '{clean_code}' is currently inactive.", Decimal("0.00"), discount

        if discount.start_date and check_date < discount.start_date:
            return False, f"Discount code '{clean_code}' is not active yet (starts on {discount.start_date}).", Decimal("0.00"), discount

        if discount.expiry_date and check_date > discount.expiry_date:
            return False, f"Discount code '{clean_code}' expired on {discount.expiry_date}.", Decimal("0.00"), discount

        if discount.max_uses is not None and discount.used_count >= discount.max_uses:
            return False, f"Discount code '{clean_code}' has reached its maximum usage limit ({discount.max_uses}).", Decimal("0.00"), discount

        if purchase_amount < discount.min_purchase_amount:
            return False, f"Minimum purchase amount of ${discount.min_purchase_amount} required to use code '{clean_code}'.", Decimal("0.00"), discount

        # Check scope
        if discount.scope == DiscountScope.PRODUCT:
            if not product_id or (discount.product_id and discount.product_id != product_id):
                return False, f"Discount code '{clean_code}' is restricted to specific product.", Decimal("0.00"), discount
        elif discount.scope == DiscountScope.SUBSCRIPTION:
            if not is_subscription:
                return False, f"Discount code '{clean_code}' applies only to subscriptions.", Decimal("0.00"), discount

        # Calculate discount amount
        discount_amount = Decimal("0.00")
        if discount.discount_type == DiscountType.PERCENTAGE:
            discount_amount = (purchase_amount * discount.value) / Decimal("100.00")
        else:  # FIXED
            discount_amount = min(discount.value, purchase_amount)

        discount_amount = discount_amount.quantize(TWOPLACES, rounding=ROUND_HALF_UP)
        return True, "Discount applied successfully.", discount_amount, discount

    @staticmethod
    def consume_discount(db: Session, discount_id: int) -> None:
        """Increments usage counter for a used discount."""
        discount = db.query(Discount).filter(Discount.id == discount_id).first()
        if discount:
            discount.used_count += 1
            db.commit()

    @staticmethod
    def update_discount(db: Session, discount_id: int, discount_in: DiscountUpdate) -> Discount:
        discount = DiscountService.get_by_id(db, discount_id)

        if discount_in.name is not None:
            discount.name = discount_in.name
        if discount_in.value is not None:
            discount.value = discount_in.value.quantize(TWOPLACES, rounding=ROUND_HALF_UP)
        if discount_in.min_purchase_amount is not None:
            discount.min_purchase_amount = discount_in.min_purchase_amount.quantize(TWOPLACES, rounding=ROUND_HALF_UP)
        if discount_in.start_date is not None:
            discount.start_date = discount_in.start_date
        if discount_in.expiry_date is not None:
            discount.expiry_date = discount_in.expiry_date
        if discount_in.max_uses is not None:
            discount.max_uses = discount_in.max_uses
        if discount_in.scope is not None:
            discount.scope = discount_in.scope
        if discount_in.product_id is not None:
            discount.product_id = discount_in.product_id
        if discount_in.is_active is not None:
            discount.is_active = discount_in.is_active

        db.commit()
        db.refresh(discount)
        return discount

    @staticmethod
    def delete_discount(db: Session, discount_id: int) -> None:
        discount = DiscountService.get_by_id(db, discount_id)
        db.delete(discount)
        db.commit()

