"""Time-Travel Billing Simulator API endpoints."""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_staff
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.simulator import (
    TimeTravelRequest, 
    TimeTravelResponse, 
    SimulatorStatusResponse
)
from app.services.simulator_service import SimulatorService

router = APIRouter()

@router.get("/status", response_model=ApiResponse[SimulatorStatusResponse], summary="Get Simulator Status")
def get_simulator_status(
    current_staff: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """Staff & Admin: Check current simulated date, real date, offset, and pending due subscriptions."""
    status_data = SimulatorService.get_status(db)
    return ApiResponse(
        success=True,
        message="Simulation status retrieved.",
        data=status_data
    )

@router.post("/advance", response_model=ApiResponse[TimeTravelResponse], summary="Advance Simulated Time & Run Billing")
def advance_time(
    req: TimeTravelRequest,
    current_staff: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """
    Staff & Admin: Fast-forward simulated system date by N days (1, 7, 30 days) 
    and immediately execute the recurring billing engine.
    Demonstrates auto-renewals, automated invoicing, and zero duplicate billing.
    """
    response_data, _ = SimulatorService.advance_time(db, days=req.days)
    return ApiResponse(
        success=True,
        message=f"Simulated time advanced by {req.days} day(s). Generated {response_data.billing_summary.invoices_generated} invoice(s).",
        data=response_data
    )

@router.post("/reset", response_model=ApiResponse[SimulatorStatusResponse], summary="Reset Simulated Time to Today")
def reset_simulation(
    current_staff: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """Staff & Admin: Reset time offset back to real-world today."""
    status_data = SimulatorService.reset_simulation(db)
    return ApiResponse(
        success=True,
        message="Simulated time reset to today.",
        data=status_data
    )

