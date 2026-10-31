"""Time-Travel Billing Simulator service for demo testing."""
from datetime import date, timedelta
from typing import Tuple, List
from sqlalchemy.orm import Session

from app.services.billing_engine import BillingEngine
from app.schemas.simulator import TimeTravelResponse, SimulatorStatusResponse, BillingRunSummary
from app.models.subscription import Subscription, SubscriptionStatus
from app.models.invoice import Invoice

class SimulatorService:
    # In-process simulation offset in days from current real-world date
    _simulated_offset_days: int = 0

    @classmethod
    def get_real_world_date(cls) -> date:
        return date.today()

    @classmethod
    def get_current_simulated_date(cls) -> date:
        return cls.get_real_world_date() + timedelta(days=cls._simulated_offset_days)

    @classmethod
    def get_status(cls, db: Session) -> SimulatorStatusResponse:
        current_sim_date = cls.get_current_simulated_date()
        # Count active subscriptions due on or before current simulated date
        due_count = (
            db.query(Subscription)
            .filter(
                Subscription.status == SubscriptionStatus.ACTIVE,
                Subscription.next_billing_date <= current_sim_date
            )
            .count()
        )
        return SimulatorStatusResponse(
            real_world_date=cls.get_real_world_date(),
            current_simulated_date=current_sim_date,
            days_offset=cls._simulated_offset_days,
            active_subscriptions_due_count=due_count
        )

    @classmethod
    def advance_time(cls, db: Session, days: int) -> Tuple[TimeTravelResponse, List[Invoice]]:
        """
        Fast-forwards simulated time by N days (e.g. 1, 7, 30 days)
        and automatically fires the recurring billing engine.
        """
        prev_date = cls.get_current_simulated_date()
        cls._simulated_offset_days += days
        new_date = cls.get_current_simulated_date()

        summary, invoices = BillingEngine.process_recurring_billing(db, target_date=new_date)

        from app.schemas.invoice import InvoiceRead
        response = TimeTravelResponse(
            previous_simulated_date=prev_date,
            new_simulated_date=new_date,
            days_advanced=days,
            billing_summary=summary,
            generated_invoices=[InvoiceRead.model_validate(inv) for inv in invoices]
        )
        return response, invoices

    @classmethod
    def reset_simulation(cls, db: Session) -> SimulatorStatusResponse:
        cls._simulated_offset_days = 0
        return cls.get_status(db)

