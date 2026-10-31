"""AI and Machine Learning Insights API Endpoints."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_staff, get_current_user
from app.models.user import User, UserRole
from app.schemas.common import ApiResponse
from app.schemas.ml import (
    CustomerChurnPrediction,
    ChurnOverview,
    MRRForecastResponse,
    AIInsightsDashboard
)
from app.services.ml_service import MLService

router = APIRouter()

@router.get("/churn/overview", response_model=ApiResponse[ChurnOverview], summary="Portfolio Churn Overview")
def get_churn_overview(
    current_staff: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """Staff/Admin: Retrieve overall portfolio churn rate, risk distribution, and top behavioral risk drivers."""
    overview = MLService.get_churn_overview(db)
    return ApiResponse(
        success=True,
        message="Portfolio churn overview retrieved successfully.",
        data=overview
    )

@router.get("/churn/customers", response_model=ApiResponse[List[CustomerChurnPrediction]], summary="List Customer Churn Risk")
def get_customer_churn_predictions(
    risk_tier: Optional[str] = Query(None, description="Filter by risk tier: High, Medium, or Low"),
    current_staff: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """Staff/Admin: Retrieve all customer churn risk scores, contributing factors, and recommendations."""
    predictions = MLService.get_all_customer_predictions(db)
    if risk_tier:
        predictions = [p for p in predictions if p.risk_tier.lower() == risk_tier.lower()]
    
    return ApiResponse(
        success=True,
        message=f"Retrieved {len(predictions)} customer risk evaluations.",
        data=predictions
    )

@router.get("/churn/customer/{customer_id}", response_model=ApiResponse[CustomerChurnPrediction], summary="Single Customer Churn Risk")
def get_single_customer_churn(
    customer_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Staff/Admin or owning Customer: Deep-dive churn risk diagnostic for a specific customer."""
    # RBAC: customer can only view own risk profile; staff/admin can view all
    if current_user.role == UserRole.CUSTOMER:
        if not current_user.customer_profile or current_user.customer_profile.id != customer_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden: Customers may only view their own risk profile."
            )

    try:
        prediction = MLService.predict_customer_churn(customer_id, db)
        return ApiResponse(
            success=True,
            message="Customer churn evaluation generated successfully.",
            data=prediction
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.get("/mrr/forecast", response_model=ApiResponse[MRRForecastResponse], summary="MRR Forecast & Time-Series Projections")
def get_mrr_forecast(
    current_staff: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """Staff/Admin: Monthly Recurring Revenue (MRR) time-series regression forecast for 3 and 6 months."""
    forecast = MLService.forecast_mrr(db)
    return ApiResponse(
        success=True,
        message="MRR forecast calculated with Scikit-learn regression forecaster.",
        data=forecast
    )

@router.get("/dashboard", response_model=ApiResponse[AIInsightsDashboard], summary="Consolidated AI Insights Dashboard")
def get_ai_insights_dashboard(
    current_staff: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """Staff/Admin: Single-trip endpoint for complete AI Insights dashboard."""
    dashboard = MLService.get_ai_insights_dashboard(db)
    return ApiResponse(
        success=True,
        message="AI insights dashboard data loaded successfully.",
        data=dashboard
    )

@router.post("/retrain", response_model=ApiResponse[dict], summary="Retrain ML Models")
def retrain_ml_models(
    current_staff: User = Depends(require_staff),
    db: Session = Depends(get_db)
):
    """Staff/Admin: Trigger retraining of Random Forest churn model on current database state."""
    importances = MLService.retrain_model(db)
    return ApiResponse(
        success=True,
        message="Random Forest Churn Model retrained successfully.",
        data={"feature_importances": importances}
    )
