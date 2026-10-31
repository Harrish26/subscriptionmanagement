"""Tax Rate Management Service."""
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.tax import Tax
from app.schemas.tax import TaxCreate, TaxUpdate

TWOPLACES = Decimal("0.01")

class TaxService:
    @staticmethod
    def create_tax(db: Session, tax_in: TaxCreate) -> Tax:
        existing = db.query(Tax).filter(Tax.name == tax_in.name).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Tax rate with name '{tax_in.name}' already exists."
            )

        # If marked default, unset existing default
        if tax_in.is_default:
            db.query(Tax).filter(Tax.is_default == True).update({"is_default": False})

        tax = Tax(
            name=tax_in.name,
            rate=tax_in.rate.quantize(TWOPLACES, rounding=ROUND_HALF_UP),
            description=tax_in.description,
            is_active=tax_in.is_active,
            is_default=tax_in.is_default
        )
        db.add(tax)
        db.commit()
        db.refresh(tax)
        return tax

    @staticmethod
    def list_taxes(db: Session, active_only: bool = True) -> List[Tax]:
        query = db.query(Tax)
        if active_only:
            query = query.filter(Tax.is_active == True)
        return query.order_by(Tax.rate.asc()).all()

    @staticmethod
    def get_by_id(db: Session, tax_id: int) -> Tax:
        tax = db.query(Tax).filter(Tax.id == tax_id).first()
        if not tax:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tax rate not found."
            )
        return tax

    @staticmethod
    def get_default_tax(db: Session) -> Optional[Tax]:
        return db.query(Tax).filter(Tax.is_default == True, Tax.is_active == True).first()

    @staticmethod
    def update_tax(db: Session, tax_id: int, tax_in: TaxUpdate) -> Tax:
        tax = TaxService.get_by_id(db, tax_id)

        if tax_in.name and tax_in.name != tax.name:
            dup = db.query(Tax).filter(Tax.name == tax_in.name, Tax.id != tax_id).first()
            if dup:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Tax rate with name '{tax_in.name}' already exists."
                )
            tax.name = tax_in.name

        if tax_in.rate is not None:
            tax.rate = tax_in.rate.quantize(TWOPLACES, rounding=ROUND_HALF_UP)
        if tax_in.description is not None:
            tax.description = tax_in.description
        if tax_in.is_active is not None:
            tax.is_active = tax_in.is_active
        if tax_in.is_default is not None:
            if tax_in.is_default:
                db.query(Tax).filter(Tax.id != tax_id).update({"is_default": False})
            tax.is_default = tax_in.is_default

        db.commit()
        db.refresh(tax)
        return tax

    @staticmethod
    def delete_tax(db: Session, tax_id: int) -> None:
        tax = TaxService.get_by_id(db, tax_id)
        db.delete(tax)
        db.commit()

    @staticmethod
    def calculate_tax(amount: Decimal, rate: Decimal) -> Decimal:
        """
        Calculates tax on amount using rate percent: (amount * rate) / 100
        Returns Decimal rounded to two decimal places.
        """
        if amount <= Decimal("0.00") or rate <= Decimal("0.00"):
            return Decimal("0.00")
        tax_amt = (amount * rate) / Decimal("100.00")
        return tax_amt.quantize(TWOPLACES, rounding=ROUND_HALF_UP)
