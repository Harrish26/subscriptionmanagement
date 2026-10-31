"""Quotation Templates and Customer Quotation Engine service."""
from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status

from app.models.quotation import (
    QuotationTemplate, 
    QuotationTemplateLine, 
    Quotation, 
    QuotationLine, 
    QuotationStatus
)
from app.models.product import Product, ProductVariant
from app.models.plan import Plan
from app.models.user import Customer
from app.schemas.quotation import (
    QuotationTemplateCreate, 
    QuotationTemplateUpdate, 
    QuotationCreate, 
    QuotationFromTemplateRequest, 
    QuotationUpdate
)

TWOPLACES = Decimal("0.01")

class QuotationService:
    # --- Quotation Templates ---

    @staticmethod
    def get_template_by_id(db: Session, template_id: int) -> Optional[QuotationTemplate]:
        return (
            db.query(QuotationTemplate)
            .options(
                joinedload(QuotationTemplate.plan),
                joinedload(QuotationTemplate.lines).joinedload(QuotationTemplateLine.product),
                joinedload(QuotationTemplate.lines).joinedload(QuotationTemplateLine.variant)
            )
            .filter(QuotationTemplate.id == template_id)
            .first()
        )

    @staticmethod
    def list_templates(db: Session, active_only: bool = True) -> List[QuotationTemplate]:
        query = db.query(QuotationTemplate).options(
            joinedload(QuotationTemplate.plan),
            joinedload(QuotationTemplate.lines).joinedload(QuotationTemplateLine.product),
            joinedload(QuotationTemplate.lines).joinedload(QuotationTemplateLine.variant)
        )
        if active_only:
            query = query.filter(QuotationTemplate.is_active == True)
        return query.order_by(QuotationTemplate.id.asc()).all()

    @staticmethod
    def create_template(db: Session, template_in: QuotationTemplateCreate) -> QuotationTemplate:
        # Verify plan exists
        plan = db.query(Plan).filter(Plan.id == template_in.plan_id).first()
        if not plan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Subscription Plan with ID {template_in.plan_id} not found."
            )

        template = QuotationTemplate(
            name=template_in.name.strip(),
            description=template_in.description,
            plan_id=template_in.plan_id,
            validity_days=template_in.validity_days,
            is_active=template_in.is_active
        )
        db.add(template)
        db.flush()

        for line_in in template_in.lines:
            # Verify product exists
            prod = db.query(Product).filter(Product.id == line_in.product_id).first()
            if not prod:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Product with ID {line_in.product_id} not found."
                )
            
            # Resolve default unit price if not explicitly set
            unit_price = line_in.unit_price
            if unit_price is None:
                unit_price = prod.sales_price
                if line_in.variant_id:
                    v = db.query(ProductVariant).filter(ProductVariant.id == line_in.variant_id).first()
                    if v:
                        unit_price += v.price_surcharge

            template_line = QuotationTemplateLine(
                template_id=template.id,
                product_id=line_in.product_id,
                variant_id=line_in.variant_id,
                quantity=line_in.quantity,
                unit_price=unit_price,
                discount_percent=line_in.discount_percent
            )
            db.add(template_line)

        db.commit()
        return QuotationService.get_template_by_id(db, template.id)

    @staticmethod
    def update_template(
        db: Session, 
        template_id: int, 
        template_in: QuotationTemplateUpdate
    ) -> QuotationTemplate:
        template = db.query(QuotationTemplate).filter(QuotationTemplate.id == template_id).first()
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Quotation Template with ID {template_id} not found."
            )

        if template_in.plan_id is not None:
            plan = db.query(Plan).filter(Plan.id == template_in.plan_id).first()
            if not plan:
                raise HTTPException(status_code=404, detail="Plan not found.")
            template.plan_id = template_in.plan_id

        if template_in.name is not None:
            template.name = template_in.name.strip()
        if template_in.description is not None:
            template.description = template_in.description
        if template_in.validity_days is not None:
            template.validity_days = template_in.validity_days
        if template_in.is_active is not None:
            template.is_active = template_in.is_active

        if template_in.lines is not None:
            # Replace existing template lines
            db.query(QuotationTemplateLine).filter(QuotationTemplateLine.template_id == template.id).delete()
            for line_in in template_in.lines:
                prod = db.query(Product).filter(Product.id == line_in.product_id).first()
                if not prod:
                    continue
                unit_price = line_in.unit_price or prod.sales_price
                if line_in.variant_id:
                    v = db.query(ProductVariant).filter(ProductVariant.id == line_in.variant_id).first()
                    if v:
                        unit_price += v.price_surcharge

                new_line = QuotationTemplateLine(
                    template_id=template.id,
                    product_id=line_in.product_id,
                    variant_id=line_in.variant_id,
                    quantity=line_in.quantity,
                    unit_price=unit_price,
                    discount_percent=line_in.discount_percent
                )
                db.add(new_line)

        db.commit()
        return QuotationService.get_template_by_id(db, template.id)

    @staticmethod
    def delete_template(db: Session, template_id: int) -> bool:
        template = db.query(QuotationTemplate).filter(QuotationTemplate.id == template_id).first()
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Quotation Template with ID {template_id} not found."
            )
        db.delete(template)
        db.commit()
        return True

    # --- Customer Quotations ---

    @staticmethod
    def _generate_quote_number(db: Session) -> str:
        """Generates a sequential human-readable quote number (e.g. QT-2026-0001)."""
        year = date.today().year
        count = db.query(Quotation).count() + 1
        return f"QT-{year}-{count:04d}"

    @staticmethod
    def get_quotation_by_id(db: Session, quotation_id: int) -> Optional[Quotation]:
        return (
            db.query(Quotation)
            .options(
                joinedload(Quotation.customer),
                joinedload(Quotation.plan),
                joinedload(Quotation.lines).joinedload(QuotationLine.product),
                joinedload(Quotation.lines).joinedload(QuotationLine.variant)
            )
            .filter(Quotation.id == quotation_id)
            .first()
        )

    @staticmethod
    def list_quotations(
        db: Session, 
        customer_id: Optional[int] = None, 
        status_filter: Optional[QuotationStatus] = None
    ) -> List[Quotation]:
        query = db.query(Quotation).options(
            joinedload(Quotation.customer),
            joinedload(Quotation.plan),
            joinedload(Quotation.lines).joinedload(QuotationLine.product),
            joinedload(Quotation.lines).joinedload(QuotationLine.variant)
        )
        if customer_id:
            query = query.filter(Quotation.customer_id == customer_id)
        if status_filter:
            query = query.filter(Quotation.status == status_filter)
        return query.order_by(Quotation.id.desc()).all()

    @staticmethod
    def create_quotation(db: Session, quote_in: QuotationCreate) -> Quotation:
        customer = db.query(Customer).filter(Customer.id == quote_in.customer_id).first()
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found.")

        plan = db.query(Plan).filter(Plan.id == quote_in.plan_id).first()
        if not plan:
            raise HTTPException(status_code=404, detail="Plan not found.")

        quote_number = QuotationService._generate_quote_number(db)

        subtotal = Decimal("0.00")
        discount_total = Decimal("0.00")
        lines_to_add = []

        for line_in in quote_in.lines:
            product = db.query(Product).filter(Product.id == line_in.product_id).first()
            if not product:
                raise HTTPException(status_code=404, detail=f"Product {line_in.product_id} not found.")

            raw_line = Decimal(line_in.quantity) * line_in.unit_price
            line_disc = (raw_line * (line_in.discount_percent / Decimal("100.00"))).quantize(TWOPLACES, rounding=ROUND_HALF_UP)
            line_total = (raw_line - line_disc).quantize(TWOPLACES, rounding=ROUND_HALF_UP)

            subtotal += raw_line
            discount_total += line_disc

            q_line = QuotationLine(
                product_id=line_in.product_id,
                variant_id=line_in.variant_id,
                description=line_in.description or product.name,
                quantity=line_in.quantity,
                unit_price=line_in.unit_price,
                discount_percent=line_in.discount_percent,
                line_total=line_total
            )
            lines_to_add.append(q_line)

        subtotal = subtotal.quantize(TWOPLACES, rounding=ROUND_HALF_UP)
        discount_total = discount_total.quantize(TWOPLACES, rounding=ROUND_HALF_UP)
        tax_total = Decimal("0.00")  # Handled dynamically by Tax Engine in Phase 4
        total_amount = (subtotal - discount_total + tax_total).quantize(TWOPLACES, rounding=ROUND_HALF_UP)

        quotation = Quotation(
            quote_number=quote_number,
            customer_id=quote_in.customer_id,
            plan_id=quote_in.plan_id,
            template_id=quote_in.template_id,
            status=QuotationStatus.DRAFT,
            valid_until=quote_in.valid_until,
            payment_terms=quote_in.payment_terms,
            subtotal=subtotal,
            discount_total=discount_total,
            tax_total=tax_total,
            total_amount=total_amount,
            notes=quote_in.notes
        )
        db.add(quotation)
        db.flush()

        for line in lines_to_add:
            line.quotation_id = quotation.id
            db.add(line)

        db.commit()
        return QuotationService.get_quotation_by_id(db, quotation.id)

    @staticmethod
    def create_quotation_from_template(
        db: Session, 
        req: QuotationFromTemplateRequest
    ) -> Quotation:
        """
        Instant Offer Generator:
        Turns a predefined quotation template into a customized offer with automatic validity calculation.
        """
        template = QuotationService.get_template_by_id(db, req.template_id)
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Quotation Template with ID {req.template_id} not found."
            )

        customer = db.query(Customer).filter(Customer.id == req.customer_id).first()
        if not customer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Customer with ID {req.customer_id} not found."
            )

        # Compute validity expiration based on template definition
        valid_until = date.today() + timedelta(days=template.validity_days)

        # Build lines snapshot from template
        lines = []
        for t_line in template.lines:
            unit_price = t_line.unit_price
            if unit_price is None:
                unit_price = t_line.product.sales_price
                if t_line.variant:
                    unit_price += t_line.variant.price_surcharge

            from app.schemas.quotation import QuotationLineCreate
            lines.append(
                QuotationLineCreate(
                    product_id=t_line.product_id,
                    variant_id=t_line.variant_id,
                    description=t_line.product.name,
                    quantity=t_line.quantity,
                    unit_price=unit_price,
                    discount_percent=t_line.discount_percent
                )
            )

        quote_create = QuotationCreate(
            customer_id=req.customer_id,
            plan_id=template.plan_id,
            template_id=template.id,
            valid_until=valid_until,
            payment_terms=req.payment_terms or "Immediate",
            notes=req.notes or f"Generated from template: {template.name}",
            lines=lines
        )

        return QuotationService.create_quotation(db, quote_create)

    @staticmethod
    def update_quotation(
        db: Session, 
        quotation_id: int, 
        quote_in: QuotationUpdate
    ) -> Quotation:
        quote = db.query(Quotation).filter(Quotation.id == quotation_id).first()
        if not quote:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Quotation with ID {quotation_id} not found."
            )

        update_data = quote_in.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(quote, key, value)

        db.commit()
        return QuotationService.get_quotation_by_id(db, quotation_id)
