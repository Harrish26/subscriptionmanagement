"""Payment Management and Overdue Reminder Service."""
from datetime import date, datetime
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status

from app.models.invoice import Invoice, InvoiceStatus
from app.models.payment import Payment, PaymentMethod, PaymentReminder
from app.models.user import User, Customer
from app.schemas.payment import PaymentCreate, PaymentReminderCreate

TWOPLACES = Decimal("0.01")

class PaymentService:
    @staticmethod
    def _generate_payment_number(db: Session) -> str:
        year = date.today().year
        count = db.query(Payment).count() + 1
        return f"PAY-{year}-{count:04d}"

    @staticmethod
    def record_payment(
        db: Session, 
        payment_in: PaymentCreate,
        user_id: Optional[int] = None
    ) -> Payment:
        """
        Records a customer payment against an invoice:
        1. Validates invoice existence, open status, and non-cancelled state.
        2. Validates payment amount > 0 and amount <= balance_due.
        3. Supports partial and full payments.
        4. Updates invoice.amount_paid and calculates new invoice.balance_due.
        5. Automatically transitions invoice status (PAID vs PARTIALLY_PAID vs OVERDUE).
        6. Generates sequential payment number PAY-YYYY-####.
        """
        invoice = (
            db.query(Invoice)
            .filter(Invoice.id == payment_in.invoice_id)
            .first()
        )
        if not invoice:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Invoice #{payment_in.invoice_id} not found."
            )

        if invoice.status == InvoiceStatus.CANCELLED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot accept payments for a cancelled invoice."
            )

        if invoice.balance_due <= Decimal("0.00") or invoice.status == InvoiceStatus.PAID:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invoice is already fully settled (balance due is $0.00)."
            )

        pay_amount = payment_in.amount.quantize(TWOPLACES, rounding=ROUND_HALF_UP)
        if pay_amount <= Decimal("0.00"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payment amount must be greater than zero."
            )

        if pay_amount > invoice.balance_due:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Payment amount (${pay_amount}) exceeds outstanding balance (${invoice.balance_due})."
            )

        pay_number = PaymentService._generate_payment_number(db)
        pay_date = payment_in.payment_date or date.today()

        payment = Payment(
            payment_number=pay_number,
            invoice_id=invoice.id,
            customer_id=invoice.customer_id,
            amount=pay_amount,
            payment_date=pay_date,
            payment_method=payment_in.payment_method,
            transaction_reference=payment_in.transaction_reference,
            notes=payment_in.notes
        )
        db.add(payment)

        # Update invoice balance and status
        invoice.amount_paid = (invoice.amount_paid + pay_amount).quantize(TWOPLACES, rounding=ROUND_HALF_UP)
        invoice.balance_due = max(Decimal("0.00"), invoice.total_amount - invoice.amount_paid).quantize(TWOPLACES, rounding=ROUND_HALF_UP)

        if invoice.balance_due == Decimal("0.00"):
            invoice.status = InvoiceStatus.PAID
        else:
            invoice.status = InvoiceStatus.PARTIALLY_PAID

        db.commit()
        db.refresh(payment)
        db.refresh(invoice)
        return payment

    @staticmethod
    def list_payments(
        db: Session,
        customer_id: Optional[int] = None,
        invoice_id: Optional[int] = None
    ) -> List[Payment]:
        query = db.query(Payment).options(
            joinedload(Payment.customer),
            joinedload(Payment.invoice)
        )
        if customer_id:
            query = query.filter(Payment.customer_id == customer_id)
        if invoice_id:
            query = query.filter(Payment.invoice_id == invoice_id)
        return query.order_by(Payment.id.desc()).all()

    @staticmethod
    def get_by_id(db: Session, payment_id: int) -> Payment:
        payment = (
            db.query(Payment)
            .options(
                joinedload(Payment.customer),
                joinedload(Payment.invoice)
            )
            .filter(Payment.id == payment_id)
            .first()
        )
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found.")
        return payment

    @staticmethod
    def scan_and_update_overdue(db: Session, as_of_date: Optional[date] = None) -> List[Invoice]:
        """
        Scans all unpaid or partially paid invoices with due_date < as_of_date
        and updates their status to OVERDUE.
        """
        target_date = as_of_date or date.today()
        overdue_invoices = (
            db.query(Invoice)
            .filter(
                Invoice.status.in_([InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.CONFIRMED]),
                Invoice.due_date < target_date,
                Invoice.balance_due > Decimal("0.00")
            )
            .all()
        )

        for inv in overdue_invoices:
            inv.status = InvoiceStatus.OVERDUE

        if overdue_invoices:
            db.commit()

        return overdue_invoices

    @staticmethod
    def send_payment_reminder(
        db: Session, 
        reminder_in: PaymentReminderCreate,
        sent_by_user_id: Optional[int] = None
    ) -> PaymentReminder:
        """
        Records an automated or manual payment reminder sent to customer for overdue / pending invoice.
        """
        invoice = (
            db.query(Invoice)
            .options(joinedload(Invoice.customer))
            .filter(Invoice.id == reminder_in.invoice_id)
            .first()
        )
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found.")

        if invoice.balance_due <= Decimal("0.00"):
            raise HTTPException(status_code=400, detail="Cannot send reminder: invoice is already fully paid.")

        msg = reminder_in.message or (
            f"Friendly reminder: Invoice {invoice.invoice_number} for ${invoice.balance_due} "
            f"was due on {invoice.due_date}. Please settle via UPI, Card, or Bank Transfer."
        )

        reminder = PaymentReminder(
            invoice_id=invoice.id,
            customer_id=invoice.customer_id,
            reminder_channel=reminder_in.reminder_channel,
            reminder_date=datetime.utcnow(),
            due_date=invoice.due_date,
            amount_due=invoice.balance_due,
            message=msg,
            sent_by_user_id=sent_by_user_id
        )
        db.add(reminder)
        
        # Append note to invoice
        invoice.notes = f"{invoice.notes or ''}\n[{date.today()}] Reminder sent via {reminder_in.reminder_channel}"
        db.commit()
        db.refresh(reminder)
        return reminder

    @staticmethod
    def list_reminders(
        db: Session,
        invoice_id: Optional[int] = None,
        customer_id: Optional[int] = None
    ) -> List[PaymentReminder]:
        query = db.query(PaymentReminder).options(
            joinedload(PaymentReminder.customer),
            joinedload(PaymentReminder.invoice)
        )
        if invoice_id:
            query = query.filter(PaymentReminder.invoice_id == invoice_id)
        if customer_id:
            query = query.filter(PaymentReminder.customer_id == customer_id)
        return query.order_by(PaymentReminder.id.desc()).all()
