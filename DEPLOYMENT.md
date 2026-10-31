# SubscriptNova — Production Deployment Guide

This guide provides instructions for deploying **SubscriptNova** to production environments, including Docker Compose, Cloud Virtual Machines (GCP/AWS/Azure), and Container Platforms (Render, Railway, Fly.io).

---

## 🏗 Architecture Overview

SubscriptNova runs as a decoupled full-stack architecture:

* **Backend Service**: FastAPI with Uvicorn worker processes running Python 3.11+.
* **Database**: Embedded SQLite with strict `PRAGMA foreign_keys=ON` isolation, mounted on a persistent volume.
* **Machine Learning Engine**: In-memory Scikit-learn Random Forest Churn Classifier and Ridge Regression MRR Forecaster.
* **Frontend Service**: React 19 SPA bundled by Vite and served via an Nginx reverse proxy with gzip compression and caching.

```text
[ Client Web Browser ]
          │
          ▼ HTTP/HTTPS (Port 80 / 443)
┌──────────────────────────────────────────────┐
│                  Nginx                       │
│  ├── Static Assets (React 19 SPA)            │
│  └── /api/* Reverse Proxy ───────────────┐   │
└──────────────────────────────────────────┼───┘
                                           │
                                           ▼ HTTP (Port 8000)
┌──────────────────────────────────────────────┐
│             FastAPI Backend                  │
│  ├── REST API Endpoints                      │
│  ├── Bcrypt & JWT Security Engine            │
│  ├── Recurring Billing Engine                │
│  ├── Scikit-Learn ML Engines                 │
│  └── SQLAlchemy 2.0 ORM                      │
│            │                                 │
│            ▼ Persistent Storage              │
│     [ subscriptnova.db ]                     │
└──────────────────────────────────────────────┘
```

---

## Option 1: Docker Compose Deployment (Recommended)

### Prerequisites
* Docker Engine 24.0+
* Docker Compose v2.20+

### Steps

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/Harrish26/subscriptionmanagement.git
   cd subscriptionmanagement
   ```

2. **Configure Production Secrets**:
   Generate a cryptographic secret key:
   ```bash
   python -c "import secrets; print(secrets.token_hex(32))"
   ```
   Create a root `.env` file:
   ```bash
   SECRET_KEY=your_generated_64_character_hex_key
   ```

3. **Launch the Container Stack**:
   ```bash
   docker compose up -d --build
   ```

4. **Verify Health**:
   ```bash
   curl http://localhost/api/v1/health
   # Expected response: {"success":true,"message":"SubscriptNova backend is operational","data":{"status":"healthy",...}}
   ```

5. **Populate Demo Seed Data (Optional)**:
   ```bash
   docker compose exec backend python seed_data.py
   ```

6. **Access the Application**:
   * **Web Application**: `http://localhost`
   * **API Documentation**: `http://localhost:8000/docs`
   * **ReDoc Specification**: `http://localhost:8000/redoc`

---

## Option 2: Linux Virtual Machine Deployment (Ubuntu/Debian)

### 1. System Setup
```bash
sudo apt update && sudo apt install -y python3-pip python3-venv nodejs npm nginx curl
```

### 2. Backend Deployment with Systemd
```bash
cd /opt
sudo git clone https://github.com/Harrish26/subscriptionmanagement.git
cd subscriptionmanagement/backend

python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

cp .env.production.example .env
# Edit .env with your production SECRET_KEY and domain
nano .env

# Run database migration & seed
python seed_data.py
```

Create systemd service file `/etc/systemd/system/subscriptnova.service`:
```ini
[Unit]
Description=SubscriptNova FastAPI Backend
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/opt/subscriptionmanagement/backend
EnvironmentFile=/opt/subscriptionmanagement/backend/.env
ExecStart=/opt/subscriptionmanagement/backend/venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000 --workers 4

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable subscriptnova
sudo systemctl start subscriptnova
```

### 3. Frontend Build & Nginx Configuration
```bash
cd /opt/subscriptionmanagement/frontend
npm ci
npm run build
```

Configure Nginx `/etc/nginx/sites-available/subscriptnova`:
```nginx
server {
    listen 80;
    server_name subscriptnova.yourdomain.com;

    location / {
        root /opt/subscriptionmanagement/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/subscriptnova /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 4. Enable HTTPS / SSL with Let's Encrypt
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d subscriptnova.yourdomain.com
```

---

## 🔒 Security Best Practices

1. **Secret Key**: Always set `SECRET_KEY` to a 64+ character random string in production. Never commit `.env` files to git.
2. **CORS Restrictions**: Configure `CORS_ORIGINS` to accept requests solely from your registered domain.
3. **Database Backups**: For SQLite persistent storage, perform non-blocking backups:
   ```bash
   sqlite3 /app/data/subscriptnova.db ".backup /app/backups/backup_$(date +%F).db"
   ```
4. **Foreign Key Enforcement**: SubscriptNova enforces `PRAGMA foreign_keys=ON` automatically on every connection session to prevent orphaned records.
5. **Rate Limiting**: Protect authentication endpoints (`/api/v1/auth/login`, `/api/v1/auth/register`) via Nginx `limit_req_zone`.

---

## 🩺 Monitoring & Diagnostics

* **Vitality Health Check**: `GET /api/v1/health`
* **Finance Operations Overview**: `GET /api/v1/finance/admin-overview`
* **AI Model Metrics & Retraining**: `POST /api/v1/ml/retrain`
