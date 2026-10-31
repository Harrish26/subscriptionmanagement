# SubscriptNova: AI-Powered Subscription & Recurring Billing System

SubscriptNova is an enterprise-grade subscription management and recurring billing platform engineered for **Brightloop Software** (Odoo Hackathon Challenge). It unifies product and plan management, multi-attribute variants, automated recurring billing runs, tax and discount rule engines, payment reconciliation, customer self-service, and machine-learning-driven churn prediction and revenue forecasting.

---

## 🛠 Technology Stack

* **Backend**: Python 3.14+ / FastAPI (REST API, Pydantic v2, JWT Auth, OAuth2 Bearer)
* **Database & ORM**: SQLite with **strictly enforced foreign keys (`PRAGMA foreign_keys=ON`)** & SQLAlchemy 2.0
* **Financial Precision**: Python `Decimal` / SQLAlchemy `Numeric(12, 2)` for zero-loss currency math
* **Machine Learning**: Scikit-learn (RandomForest Churn Predictor & Revenue Forecaster)
* **Frontend**: React 19 + Vite (Fast SPA, Tailwind CSS v3, Lucide Icons)
* **Security & RBAC**: Multi-role authorization (`admin`, `staff`, `customer`), Bcrypt password salting & hashing, strict password validation policies

---

## 📂 Project Architecture

```text
SubscriptNova/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── deps.py               # Auth, RBAC guards & DB session dependencies
│   │   │   └── v1/
│   │   │       ├── api.py            # API v1 Router aggregation
│   │   │       └── endpoints/
│   │   │           ├── health.py     # Health check & foreign keys validator
│   │   │           ├── auth.py       # Register, Login, Me, Password Reset
│   │   │           └── users.py      # Admin staff creation & user management
│   │   ├── core/
│   │   │   ├── config.py             # Environment configuration (python-dotenv)
│   │   │   ├── database.py           # SQLite engine with PRAGMA foreign_keys=ON
│   │   │   └── security.py           # Bcrypt hashing & PyJWT token utilities
│   │   ├── models/                   # SQLAlchemy ORM Models
│   │   │   ├── base.py               # Timestamped Base
│   │   │   └── user.py               # User, Customer, UserRole (Decimal balances)
│   │   ├── schemas/                  # Pydantic v2 validation schemas
│   │   │   ├── common.py             # Standard API & health responses
│   │   │   ├── auth.py               # Token & login schemas
│   │   │   └── user.py               # User & customer schemas with password rules
│   │   └── services/                 # Business logic layer
│   │       └── user_service.py       # User authentication & lifecycle
│   ├── .env.example                  # Environment template
│   ├── .env                          # Local environment variables
│   ├── requirements.txt              # Backend dependencies
│   ├── main.py                       # FastAPI application entrypoint
│   ├── test_setup.py                 # Core setup verification test
│   └── test_api_endpoints.py         # Full API & RBAC test suite
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js             # Fetch client with auto-token injection
│   │   ├── components/
│   │   │   ├── HealthCheckBadge.jsx  # Live DB & SQLite FK status badge
│   │   │   └── AuthStatusCard.jsx    # Live RBAC & JWT authentication test bench
│   │   ├── App.jsx                   # Main dashboard application
│   │   ├── index.css                 # Tailwind CSS styles
│   │   └── main.jsx                  # React application root
│   ├── .env.example
│   ├── .env                          # Frontend environment config
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── vite.config.js
│
└── README.md
```

---

## 🚀 Setup & Execution Guide

### Prerequisites
* **Python**: Python 3.10+ (tested on Python 3.14.6)
* **Node.js**: Node.js 18+ (tested on Node v24.19.0)
* **Package Manager**: npm 10+ / 11+

---

### 1. Backend Setup & Startup

1. Open your terminal and navigate to the `backend` folder:
   ```bash
   cd backend
   ```

2. (Optional) Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On Linux / macOS:
   source venv/bin/activate
   ```

3. Install required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

4. Verify your environment file:
   The backend comes pre-configured with a default `.env` file based on `.env.example`.
   ```ini
   PROJECT_NAME="SubscriptNova"
   API_V1_STR="/api/v1"
   SECRET_KEY="subscriptnova_super_secret_dev_key_change_in_production_32chars!"
   ALGORITHM="HS256"
   ACCESS_TOKEN_EXPIRE_MINUTES=1440
   DATABASE_URL="sqlite:///./subscriptnova.db"
   CORS_ORIGINS="http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"
   ```

5. Launch the FastAPI server with auto-reload:
   ```bash
   python -m uvicorn main:app --reload --port 8000
   ```
   * **API Root**: `http://localhost:8000/`
   * **Interactive Swagger UI**: `http://localhost:8000/docs`
   * **Alternative ReDoc UI**: `http://localhost:8000/redoc`
   * **System Health Check**: `http://localhost:8000/api/v1/health`

---

### 2. Frontend Setup & Startup

1. Open a new terminal and navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Launch the Vite development server:
   ```bash
   npm run dev
   ```
   * **Web App URL**: `http://localhost:5173/`

---

## 🔐 Default Credentials & RBAC Roles

On application startup, SubscriptNova automatically bootstraps a default system administrator if no admin account exists:

* **Role**: `admin`
* **Email**: `admin@brightloop.io`
* **Password**: `Admin@Brightloop2026!`

### Password Strength Rule (Brightloop Compliance)
All passwords must satisfy:
* More than 8 characters in length ($\ge 9$)
* At least one uppercase letter
* At least one lowercase letter
* At least one special character (`!@#$%^&*`, etc.)

---

## 🧪 Running Verification Tests

SubscriptNova includes automated test suites to verify backend health, SQLite foreign key enforcement, financial Decimal math, password policy validation, multi-attribute variants, subscription plans, quotation engine, subscription state machine, idempotent billing engine, and the time-travel simulator:

```bash
# Test 1: Verify Core Setup, SQLite foreign keys, and Decimal balance precision
python backend/test_setup.py

# Test 2: Full API router suite (Health, Register, Password Policy, Admin Login, RBAC Staff Creation, Password Reset)
python backend/test_api_endpoints.py

# Test 3: Phase 2 Full Verification Suite (Products, Multi-Attribute Variants, Plans, Quotation Templates & Offers)
python backend/test_phase2.py

# Test 4: Phase 3 Full Verification Suite (Subscription State Machine, Billing Engine, Idempotency, Simulator)
python backend/test_phase3.py

# Test 5: Phase 4 Full Verification Suite (Taxes, Discounts, Payments, Overdue, Finance Dashboard)
python backend/test_phase4.py

# Test 6: Frontend production build test (React 19 + Tailwind CSS + Vite)
npm --prefix frontend run build
```

---

## 📋 Hackathon Roadmap Status

* ✅ **Phase 1: Project Scaffolding & Dependencies Setup** (COMPLETED)
* ✅ **Phase 2: Product Catalog, Multi-Attribute Variants, Plans & Quotation Engine** (COMPLETED)
* ✅ **Phase 3: Subscription State Machine & Idempotent Recurring Billing Engine** (COMPLETED)
* ✅ **Phase 4: Dynamic Taxes & Discounts Rules, Invoicing & Payments Ledger** (COMPLETED)
* ✅ **Phase 5: Scikit-learn Customer Churn Predictor & Revenue Forecaster** (COMPLETED)
* ⏳ **Phase 6: Multi-Role Portals (Admin/Staff Enterprise UI + Customer Self-Service)**
* ⏳ **Phase 7: Billing Day Fast-Forward Simulator, Data Seeder & Demo Polish**

---

## 🔄 Phase 3 — Subscription State Machine & Billing Engine

### Subscription Lifecycle

```
Draft → Quotation → Confirmed → Active → Closed
                                  ↕ Pause/Resume
                                  ↺ Renew
```

### API Endpoints (Phase 3)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/subscriptions/` | List all subscriptions |
| POST | `/api/v1/subscriptions/` | Create subscription manually |
| POST | `/api/v1/subscriptions/from-quotation` | Convert quotation → subscription |
| GET | `/api/v1/subscriptions/{id}` | Get subscription details |
| POST | `/api/v1/subscriptions/{id}/transition` | Trigger state transition |
| GET | `/api/v1/invoices/` | List all invoices |
| GET | `/api/v1/invoices/{id}` | Get invoice with line items |
| PUT | `/api/v1/invoices/{id}/status` | Update invoice status (e.g. mark paid) |
| GET | `/api/v1/simulator/status` | Get real & simulated dates |
| POST | `/api/v1/simulator/advance` | Advance simulated date by N days & run billing |
| POST | `/api/v1/simulator/reset` | Reset simulated date to today |

### Idempotency Guarantee

Invoices carry a `UNIQUE` database constraint on `(subscription_id, billing_period_start, billing_period_end)`. Running the billing engine twice for the same period generates **zero** duplicate invoices.

---

## 💳 Phase 4 — Tax, Discounts, Invoicing & Payment Management

### Key Capabilities

1. **Tax Management**: Configurable tax percentages (GST, VAT, Sales Tax) with active toggles and system default tax rules.
2. **Promotional Discounts**: Percentage-off and flat cash-off codes, protected by minimum purchase thresholds, start/expiry windows, and maximum usage quotas.
3. **Multi-Method Payments**: Support for UPI, Credit/Debit Card, Bank Wire (NEFT/RTGS), and Cash. Partial and full payments automatically adjust invoice balances and transition statuses (`unpaid`, `partially_paid`, `paid`).
4. **Overdue Recovery**: Automated past-due scanner flags delinquent invoices as `overdue` and logs customer payment reminders.
5. **Finance Dashboard**: Real-time KPI summaries for total gross invoiced, settled collections, outstanding accounts receivable, and payment method distribution.

### API Endpoints (Phase 4)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/taxes/` | List all tax rates |
| POST | `/api/v1/taxes/` | Configure new tax rate |
| PUT | `/api/v1/taxes/{id}` | Update existing tax rate |
| DELETE | `/api/v1/taxes/{id}` | Delete tax rate |
| GET | `/api/v1/discounts/` | List promotional discount rules |
| POST | `/api/v1/discounts/` | Create discount with thresholds & expiry |
| POST | `/api/v1/discounts/validate` | Validate code against cart amount & scope |
| DELETE | `/api/v1/discounts/{id}` | Remove discount rule |
| GET | `/api/v1/payments/` | View payments ledger |
| POST | `/api/v1/payments/` | Record partial or full payment |
| POST | `/api/v1/payments/reminders` | Dispatch and log overdue payment reminder |
| GET | `/api/v1/payments/reminders/list` | List reminder audit log |
| GET | `/api/v1/finance/dashboard` | Finance dashboard KPIs & revenue summary |
| POST | `/api/v1/finance/scan-overdue` | Scan and flag past-due invoices as overdue |

---

## 🧠 Phase 5 — AI & Machine Learning Suite

### Key Capabilities

1. **AI Churn Prediction (Scikit-Learn Random Forest Classifier)**:
   - Evaluates customer behavioral telemetry: account tenure, active/paused/closed subscription depth, invoice payment delays, overdue debt balances, and discount sensitivity.
   - Outputs continuous churn probability ($0.0 \dots 1.0$), percentage score ($0 \dots 100$), and categorical risk tier (`Low`, `Medium`, `High`).
   - Achieves **80.95% accuracy, 71.43% precision, 71.43% recall, and 0.7143 F1-score** on stratified validation.

2. **Customer Risk Analysis & Explainability**:
   - Deconstructs individual predictions into human-readable contributing drivers (e.g. *"4 overdue invoice(s) totaling $2,000.00"*, *"Payment delays averaging 24 days past due"*).
   - Generates automated prescriptive intervention playbooks (e.g. automated dunning with 5% settlement discounts, proactive Customer Success unpause outreach, or annual plan lock-in incentives).

3. **MRR Forecasting (Scikit-Learn Ridge Time-Series Regression)**:
   - Reconstructs historical normalized Monthly Recurring Revenue (MRR) across daily, weekly, monthly, and yearly cadences with zero-loss `Decimal` precision.
   - Fits a regularized Ridge regression forecaster ($R^2 = 0.9900$, $\text{MAE} = \$227.31$) projecting MRR for **3-month and 6-month horizons** with 95% confidence intervals.

4. **AI Insights Dashboard**:
   - Modern React 19 UI with glowing KPI metric cards, interactive bar visualizer contrasting historical actuals vs predicted revenue, feature importance charts, and deep-dive customer risk diagnostics.

### API Endpoints (Phase 5)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/v1/ml/churn/overview` | Overall portfolio churn rate, risk breakdown & drivers | Staff / Admin |
| GET | `/api/v1/ml/churn/customers` | Filterable list of all customer churn predictions & scores | Staff / Admin |
| GET | `/api/v1/ml/churn/customer/{id}` | Detailed risk diagnostic and feature metrics for a single account | Staff / Admin / Own Customer |
| GET | `/api/v1/ml/mrr/forecast` | Historical MRR + 3-month and 6-month forecasts with 95% CI | Staff / Admin |
| GET | `/api/v1/ml/dashboard` | Single-trip consolidated AI Insights dashboard payload | Staff / Admin |
| POST | `/api/v1/ml/retrain` | On-demand retraining trigger of Random Forest classifier | Staff / Admin |



