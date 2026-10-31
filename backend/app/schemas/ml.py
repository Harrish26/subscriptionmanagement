"""Pydantic schemas for Phase 5 AI & Machine Learning module."""
from datetime import date
from decimal import Decimal
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field

class ContributingFactor(BaseModel):
    factor: str
    impact: str = "negative"  # "negative" | "positive"
    description: str

class CustomerChurnPrediction(BaseModel):
    customer_id: int
    customer_name: str
    email: str
    company_name: Optional[str] = None
    churn_probability: float = Field(..., ge=0.0, le=1.0)
    churn_probability_pct: float = Field(..., ge=0.0, le=100.0)
    risk_tier: str  # "High", "Medium", "Low"
    risk_score: int = Field(..., ge=0, le=100)
    mrr: Decimal = Decimal("0.00")
    tenure_days: int = 0
    active_subscriptions: int = 0
    overdue_invoices: int = 0
    overdue_amount: Decimal = Decimal("0.00")
    avg_payment_delay_days: float = 0.0
    contributing_factors: List[str] = []
    recommended_action: str
    action_priority: str = "Routine"  # "Urgent", "Medium", "Routine"

class RiskDriver(BaseModel):
    factor: str
    importance: float
    description: str

class ChurnOverview(BaseModel):
    portfolio_churn_rate: float
    total_customers_analyzed: int
    high_risk_count: int
    medium_risk_count: int
    low_risk_count: int
    risk_distribution_pct: Dict[str, float]
    total_mrr_at_risk: Decimal
    total_current_mrr: Decimal
    top_risk_drivers: List[RiskDriver] = []
    recommended_interventions: List[str] = []

class MRRPoint(BaseModel):
    period: str  # "YYYY-MM"
    mrr: Decimal
    is_forecast: bool = False
    lower_bound: Optional[Decimal] = None
    upper_bound: Optional[Decimal] = None

class MRRForecastResponse(BaseModel):
    as_of_date: date
    current_mrr: Decimal
    projected_growth_rate_pct: float
    historical_mrr: List[MRRPoint]
    forecast_3_months: List[MRRPoint]
    forecast_6_months: List[MRRPoint]
    forecast_combined: List[MRRPoint]
    model_name: str
    r2_score: float

class AIInsightsDashboard(BaseModel):
    as_of_date: date
    churn_overview: ChurnOverview
    mrr_forecast: MRRForecastResponse
    high_risk_customers: List[CustomerChurnPrediction]
    all_customer_predictions: List[CustomerChurnPrediction]

