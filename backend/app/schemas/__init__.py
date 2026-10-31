"""Pydantic schemas package."""
from app.schemas.common import ApiResponse, HealthCheckResponse
from app.schemas.auth import (
    Token, 
    TokenPayload, 
    LoginRequest, 
    PasswordResetRequest, 
    PasswordResetConfirm
)
from app.schemas.user import (
    UserCreate, 
    UserStaffCreate, 
    UserUpdate, 
    UserRead, 
    CustomerProfileCreate, 
    CustomerProfileRead,
    CustomerCreateByStaff,
    CustomerUpdate,
    CustomerEnrichedRead,
    CustomerFullDetailRead
)
from app.schemas.product import (
    ProductCreate, 
    ProductUpdate, 
    ProductRead, 
    ProductVariantCreate, 
    ProductVariantUpdate, 
    ProductVariantRead
)
from app.schemas.plan import (
    PlanCreate, 
    PlanUpdate, 
    PlanRead
)
from app.schemas.quotation import (
    QuotationTemplateCreate, 
    QuotationTemplateUpdate, 
    QuotationTemplateRead,
    QuotationTemplateLineCreate,
    QuotationTemplateLineRead,
    QuotationCreate, 
    QuotationFromTemplateRequest, 
    QuotationUpdate, 
    QuotationRead,
    QuotationLineCreate, 
    QuotationLineRead,
    CustomerBrief
)
from app.schemas.subscription import (
    SubscriptionCreate, 
    SubscriptionFromQuotationRequest, 
    SubscriptionTransitionRequest, 
    SubscriptionRead,
    SubscriptionLineCreate, 
    SubscriptionLineRead
)
from app.schemas.invoice import (
    InvoiceRead, 
    InvoiceLineRead, 
    InvoiceStatusUpdate
)
from app.schemas.simulator import (
    TimeTravelRequest, 
    TimeTravelResponse, 
    SimulatorStatusResponse,
    BillingRunSummary
)
from app.schemas.tax import (
    TaxBase,
    TaxCreate,
    TaxUpdate,
    TaxRead
)
from app.schemas.discount import (
    DiscountBase,
    DiscountCreate,
    DiscountUpdate,
    DiscountRead,
    DiscountValidateRequest,
    DiscountValidateResponse
)
from app.schemas.payment import (
    PaymentCreate,
    PaymentRead,
    PaymentReminderCreate,
    PaymentReminderRead
)
from app.schemas.finance import (
    FinanceDashboardSummary,
    AdminDashboardOverview,
    ActivityEvent
)
from app.schemas.ml import (
    CustomerChurnPrediction,
    ChurnOverview,
    MRRPoint,
    MRRForecastResponse,
    AIInsightsDashboard,
    RiskDriver
)

__all__ = [
    "ApiResponse",
    "HealthCheckResponse",
    "Token",
    "TokenPayload",
    "LoginRequest",
    "PasswordResetRequest",
    "PasswordResetConfirm",
    "UserCreate",
    "UserStaffCreate",
    "UserUpdate",
    "UserRead",
    "CustomerProfileCreate",
    "CustomerProfileRead",
    "CustomerCreateByStaff",
    "CustomerEnrichedRead",
    "CustomerFullDetailRead",
    "ProductCreate",
    "ProductUpdate",
    "ProductRead",
    "ProductVariantCreate",
    "ProductVariantUpdate",
    "ProductVariantRead",
    "PlanCreate",
    "PlanUpdate",
    "PlanRead",
    "QuotationTemplateCreate",
    "QuotationTemplateUpdate",
    "QuotationTemplateRead",
    "QuotationTemplateLineCreate",
    "QuotationTemplateLineRead",
    "QuotationCreate",
    "QuotationFromTemplateRequest",
    "QuotationUpdate",
    "QuotationRead",
    "QuotationLineCreate",
    "QuotationLineRead",
    "CustomerBrief",
    "SubscriptionCreate",
    "SubscriptionFromQuotationRequest",
    "SubscriptionTransitionRequest",
    "SubscriptionRead",
    "SubscriptionLineCreate",
    "SubscriptionLineRead",
    "InvoiceRead",
    "InvoiceLineRead",
    "InvoiceStatusUpdate",
    "TimeTravelRequest",
    "TimeTravelResponse",
    "SimulatorStatusResponse",
    "BillingRunSummary",
    "TaxBase",
    "TaxCreate",
    "TaxUpdate",
    "TaxRead",
    "DiscountBase",
    "DiscountCreate",
    "DiscountUpdate",
    "DiscountRead",
    "DiscountValidateRequest",
    "DiscountValidateResponse",
    "PaymentCreate",
    "PaymentRead",
    "PaymentReminderCreate",
    "PaymentReminderRead",
    "FinanceDashboardSummary",
    "AdminDashboardOverview",
    "ActivityEvent",
    "CustomerChurnPrediction",
    "ChurnOverview",
    "MRRPoint",
    "MRRForecastResponse",
    "AIInsightsDashboard",
    "RiskDriver"
]
