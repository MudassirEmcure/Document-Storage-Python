# Document Storage

Internal web application to securely store, manage, search, and monitor operational documents.

## Tech Stack

- **Frontend:** React 18 + React Router v6 (Red, White & Blue theme)
- **Backend:** Python FastAPI + SQLAlchemy (async)
- **Database:** PostgreSQL (`document_storage`)
- **Auth:** Local (bcrypt + JWT) + Azure AD OIDC (SSO)
- **Email:** SMTP via aiosmtplib
- **Scheduler:** APScheduler (daily expiry checks)

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 15+

### 1. Database Setup

```sql
CREATE DATABASE document_storage;
```

### 2. Backend Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt

# Copy and configure environment
copy .env.example .env
# Edit .env with your database credentials

# Run migrations
alembic upgrade head

# Seed admin user
python seed.py

# Start the server
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm start
```

The app will be available at http://localhost:3000

### Default Login

- **Username:** admin
- **Email:** admin@emcure.com
- **Password:** 1

## Features

- Document upload with drag & drop, search, download, and soft-delete
- Master data management (Companies, Banks, Facilities)
- Role-based access control (Admin, User, Viewer)
- Azure AD SSO integration (OIDC)
- Automated email alerts for document expiry (30 days + on expiry)
- Immutable audit trail with CSV export
- Password reset flow
- Red, White & Blue themed UI

## API Documentation

Once the backend is running, visit http://localhost:8000/docs for the interactive Swagger UI.
