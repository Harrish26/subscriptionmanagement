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

SubscriptNova includes automated test suites to verify backend health, SQLite foreign key enforcement, financial Decimal math, password policy validation, and role-based permissions:

```bash
# Test 1: Verify Core Setup, SQLite foreign keys, and Decimal balance precision
python backend/test_setup.py

# Test 2: Full API router suite (Health, Register, Password Policy, Admin Login, RBAC Staff Creation, Password Reset)
python backend/test_api_endpoints.py

# Test 3: Frontend production build test (React 19 + Tailwind CSS + Vite)
npm --prefix frontend run build
```

---

## 📋 Hackathon Roadmap Status

* ✅ **Phase 1: Project Scaffolding & Dependencies Setup** (COMPLETED)
* ⏳ **Phase 2: Product Catalog, Multi-Attribute Variants, Plans & Quotation Engine**
* ⏳ **Phase 3: Subscription State Machine & Idempotent Recurring Billing Engine**
* ⏳ **Phase 4: Dynamic Taxes & Discounts Rules, Invoicing & Payments Ledger**
* ⏳ **Phase 5: Scikit-learn Customer Churn Predictor & Revenue Forecaster**
* ⏳ **Phase 6: Multi-Role Portals (Admin/Staff Enterprise UI + Customer Self-Service)**
* ⏳ **Phase 7: Billing Day Fast-Forward Simulator, Data Seeder & Demo Polish**

