"""Subscription Plan management service."""
from datetime import date
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.plan import Plan, BillingInterval
from app.schemas.plan import PlanCreate, PlanUpdate

class PlanService:
    @staticmethod
    def get_by_id(db: Session, plan_id: int) -> Optional[Plan]:
        return db.query(Plan).filter(Plan.id == plan_id).first()

    @staticmethod
    def list_plans(
        db: Session, 
        billing_interval: Optional[BillingInterval] = None,
        active_only: bool = True
    ) -> List[Plan]:
        query = db.query(Plan)
        if active_only:
            query = query.filter(Plan.is_active == True)
        if billing_interval:
            query = query.filter(Plan.billing_interval == billing_interval)
        return query.order_by(Plan.id.asc()).all()

    @staticmethod
    def create_plan(db: Session, plan_in: PlanCreate) -> Plan:
        # Validate date availability window
        if plan_in.available_to and plan_in.available_to < plan_in.available_from:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Plan availability end date cannot precede start date."
            )

        plan = Plan(
            name=plan_in.name.strip(),
            description=plan_in.description,
            billing_interval=plan_in.billing_interval,
            base_cost=plan_in.base_cost,
            min_quantity=plan_in.min_quantity,
            available_from=plan_in.available_from,
            available_to=plan_in.available_to,
            auto_close_on_expiry=plan_in.auto_close_on_expiry,
            allow_early_close=plan_in.allow_early_close,
            allow_pause=plan_in.allow_pause,
            allow_renewal=plan_in.allow_renewal,
            is_active=plan_in.is_active
        )
        db.add(plan)
        db.commit()
        db.refresh(plan)
        return plan

    @staticmethod
    def update_plan(db: Session, plan_id: int, plan_in: PlanUpdate) -> Plan:
        plan = PlanService.get_by_id(db, plan_id)
        if not plan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Subscription Plan with ID {plan_id} not found."
            )

        update_data = plan_in.model_dump(exclude_unset=True)
        # Validate updated date window
        new_from = update_data.get("available_from", plan.available_from)
        new_to = update_data.get("available_to", plan.available_to)
        if new_to and new_from and new_to < new_from:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Plan availability end date cannot precede start date."
            )

        for key, value in update_data.items():
            if key == "name" and value is not None:
                value = value.strip()
            setattr(plan, key, value)

        db.commit()
        db.refresh(plan)
        return plan

    @staticmethod
    def delete_plan(db: Session, plan_id: int) -> bool:
        plan = PlanService.get_by_id(db, plan_id)
        if not plan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Subscription Plan with ID {plan_id} not found."
            )
        db.delete(plan)
        db.commit()
        return True

