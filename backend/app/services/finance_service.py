"""Finance Dashboard and Revenue Analytics Service."""
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, List, Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.models.invoice import Invoice, InvoiceStatus
from app.models.payment import Payment, PaymentMethod
from app.schemas.finance import FinanceDashboardSummary
from app.schemas.payment import PaymentRead
from app.schemas.invoice import InvoiceRead

TWOPLACES = Decimal("0.01")

class FinanceService:
    @staticmethod
    def get_dashboard_summary(db: Session, as_of_date: Optional[date] = None) -> FinanceDashboardSummary:
        today = as_of_date or date.today()

        # Invoices query
        all_invoices = (
            db.query(Invoice)
            .options(
                joinedload(Invoice.customer),
                joinedload(Invoice.lines),
                joinedload(Invoice.payments),
                joinedload(Invoice.subscription)
            )
            .all()
        )

        total_invoiced = Decimal("0.00")
        total_outstanding = Decimal("0.00")
        overdue_count = 0
        overdue_amount = Decimal("0.00")

        status_counts: Dict[str, int] = {
            "draft": 0,
            "unpaid": 0,
            "partially_paid": 0,
            "paid": 0,
            "overdue": 0,
            "cancelled": 0
        }

        for inv in all_invoices:
            s_val = inv.status.value
            if s_val == "confirmed":
                s_val = "unpaid"  # Map confirmed to unpaid for dashboard consistency

            if s_val in status_counts:
                status_counts[s_val] += 1
            else:
                status_counts[s_val] = 1

            if inv.status != InvoiceStatus.CANCELLED:
                total_invoiced += inv.total_amount
                total_outstanding += inv.balance_due

                # Check if overdue
                if inv.balance_due > Decimal("0.00") and (inv.status == InvoiceStatus.OVERDUE or inv.due_date < today):
                    overdue_count += 1
                    overdue_amount += inv.balance_due

        # Payments query
        all_payments = (
            db.query(Payment)
            .options(
                joinedload(Payment.customer),
                joinedload(Payment.invoice)
            )
            .all()
        )

        total_collected = Decimal("0.00")
        methods_breakdown: Dict[str, Decimal] = {
            "upi": Decimal("0.00"),
            "cash": Decimal("0.00"),
            "card": Decimal("0.00"),
            "bank_transfer": Decimal("0.00")
        }

        for p in all_payments:
            total_collected += p.amount
            m_val = p.payment_method.value
            if m_val in methods_breakdown:
                methods_breakdown[m_val] = (methods_breakdown[m_val] + p.amount).quantize(TWOPLACES, rounding=ROUND_HALF_UP)
            else:
                methods_breakdown[m_val] = p.amount.quantize(TWOPLACES, rounding=ROUND_HALF_UP)

        # Recent transactions
        recent_payments = (
            db.query(Payment)
            .options(joinedload(Payment.customer), joinedload(Payment.invoice))
            .order_by(Payment.id.desc())
            .limit(6)
            .all()
        )
        recent_invoices = (
            db.query(Invoice)
            .options(
                joinedload(Invoice.customer), 
                joinedload(Invoice.lines), 
                joinedload(Invoice.payments),
                joinedload(Invoice.subscription)
            )
            .order_by(Invoice.id.desc())
            .limit(6)
            .all()
        )

        return FinanceDashboardSummary(
            as_of_date=today,
            total_invoiced_amount=total_invoiced.quantize(TWOPLACES, rounding=ROUND_HALF_UP),
            total_collected_amount=total_collected.quantize(TWOPLACES, rounding=ROUND_HALF_UP),
            total_outstanding_amount=total_outstanding.quantize(TWOPLACES, rounding=ROUND_HALF_UP),
            overdue_invoices_count=overdue_count,
            overdue_amount=overdue_amount.quantize(TWOPLACES, rounding=ROUND_HALF_UP),
            invoices_by_status=status_counts,
            payment_methods_breakdown=methods_breakdown,
            recent_payments=[PaymentRead.model_validate(p) for p in recent_payments],
            recent_invoices=[InvoiceRead.model_validate(i) for i in recent_invoices]
        )

