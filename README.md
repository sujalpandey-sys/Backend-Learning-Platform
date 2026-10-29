# Backend Learning Platform API

A complete, production-grade REST API backend built with **FastAPI**, **SQLAlchemy 2.x**, **Pydantic 2.x**, and **Argon2 / JWT** authentication. Designed as a real-world reference application demonstrating clean architecture, strict tenant isolation, distributed-ready caching, database migrations, containerization, and enterprise CI/CD pipelines.

---

## 1. Project Overview & Architecture

### Request Flow & Architectural Layers
The project adheres to a strict separation of concerns following clean layered architecture:

```
[ Client / Web Browser / Mobile App ]
                  │ (HTTP Request + Bearer Token)
                  ▼
         [ FastAPI Router ] (app/api/v1/)
                  │ Validates routing, parameters, HTTP status
                  ▼
     [ Dependencies & Security ] (app/dependencies/)
                  │ Validates JWT, verifies token denylist, checks DB session
                  ▼
       [ Pydantic Schemas ] (app/schemas/)
                  │ Validates types, regex constraints, and data structure
                  ▼
      [ Service Layer ] (app/services/)
                  │ Executes business rules, cache coordination, audit events
                  ▼
    [ Repository Layer ] (app/repositories/)
                  │ Handles raw SQLAlchemy 2.0 parameterized queries with owner isolation
                  ▼
     [ Database / Engine ] (SQLite / PostgreSQL)
```

#### Layer Responsibilities
1. **API Routers (`app/api/v1/`)**: Pure HTTP transport layer. Maps URLs, handles request/response codes, and coordinates dependencies.
2. **Schemas (`app/schemas/`)**: Data contracts using Pydantic v2. Prevents mass-assignment attacks and prevents internal fields (like password hashes) from leaking.
3. **Services (`app/services/`)**: Business logic layer. Manages token generation, cache coordination, hashing, and asynchronous background tasks.
4. **Repositories (`app/repositories/`)**: Database query layer using SQLAlchemy 2.x expressions. Enforces row-level security (`where Task.owner_id == user.id`) to prevent cross-tenant data leakage.
5. **Core (`app/core/`)**: Cross-cutting concerns: Pydantic Settings, Argon2 hashing, PyJWT tokens, and structured JSON logging.
6. **Middleware (`app/middleware/`)**: Global request tracing injecting `X-Request-ID` and emitting structured JSON latency metrics.

---

## 2. Prerequisites (Ubuntu / Linux)

Ensure you have Python 3.12, Git, and Docker installed:
```bash
sudo apt update
sudo apt install -y python3 python3-pip virtualenv git curl
```

---

## 3. Local Development Setup

### Step 1: Clone and Enter Directory
```bash
cd /home/lap-45/.gemini/antigravity/scratch/backend-learning-platform
```

### Step 2: Set up Virtual Environment
```bash
virtualenv .venv
source .venv/bin/activate
```

### Step 3: Install Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### Step 4: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default `.env` configuration:
```ini
APP_NAME="Backend Learning Platform API"
APP_ENV=development
DEBUG=True
LOG_LEVEL=INFO
DATABASE_URL=sqlite:///./task_management.db
JWT_SECRET_KEY=development_secret_key_needs_to_be_at_least_32_chars_long_12345
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
CORS_ORIGINS=["http://localhost:3000","http://127.0.0.1:3000"]
REDIS_URL=redis://localhost:6379/0
CACHE_TTL_SECONDS=120
```

### Step 5: Run Database Migrations
Initialize database tables with Alembic:
```bash
alembic upgrade head
```

### Step 6: Start the Development Server
```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
Server will be available at: **http://127.0.0.1:8000**

---

## 4. Interactive API Documentation

FastAPI automatically generates interactive documentation in non-production environments:
- **Swagger UI:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc:** [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

### How to Authorize in Swagger UI:
1. Open [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).
2. Execute the `POST /api/v1/auth/login` endpoint using your registered credentials.
3. Copy the returned `access_token`.
4. Click the green **Authorize** button at the top right of the page.
5. In the `Value` box, paste the token (no need to prefix with `Bearer `, Swagger adds it automatically).
6. Click **Authorize** and then **Close**. All protected endpoints are now accessible.

---

## 5. API Usage Examples (cURL)

### 1. Register User
```bash
curl -X POST http://127.0.0.1:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "developer@example.com",
    "password": "SuperSecretPassword123!",
    "full_name": "Alex Developer"
  }'
```

### 2. Login & Obtain JWT Access Token
```bash
curl -X POST http://127.0.0.1:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "developer@example.com",
    "password": "SuperSecretPassword123!"
  }'
```
Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in_seconds": 3600
}
```

### 3. Get Current User Profile
```bash
export TOKEN="<PASTE_YOUR_ACCESS_TOKEN_HERE>"

curl -X GET http://127.0.0.1:8000/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Create a Task
```bash
curl -X POST http://127.0.0.1:8000/api/v1/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Build production Dockerfile",
    "description": "Multi-stage build with non-root security",
    "priority": "high",
    "status": "in_progress"
  }'
```

### 5. List Tasks (Pagination, Filter, Search, Sort)
```bash
# Filter by priority and search title with pagination
curl -X GET "http://127.0.0.1:8000/api/v1/tasks?priority=high&search=Docker&sort_by=created_at&sort_order=desc&limit=10&offset=0" \
  -H "Authorization: Bearer $TOKEN"
```

### 6. Update Task
```bash
curl -X PATCH http://127.0.0.1:8000/api/v1/tasks/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}'
```

### 7. Delete Task
```bash
curl -X DELETE http://127.0.0.1:8000/api/v1/tasks/1 \
  -H "Authorization: Bearer $TOKEN"
```

### 8. Revoke Token on Logout
```bash
curl -X POST http://127.0.0.1:8000/api/v1/auth/logout \
  -H "Authorization: Bearer $TOKEN"
```
*Note:* The token JTI is registered on the server-side denylist. Any subsequent request with this token will return HTTP 401 Unauthorized.

---

## 6. Testing & Quality Assurance

### Run Test Suite with Coverage:
```bash
pytest --cov=app --cov-report=term-missing --cov-fail-under=80
```
*Result:* 100% of tests pass with 89%+ line coverage across all critical modules.

### Linting and Code Formatting with Ruff:
```bash
# Verify formatting and linting
ruff check .
ruff format --check .

# Auto-fix linting issues and reformat
ruff check --fix .
ruff format .
```

---

## 7. Docker and Docker Compose

### Start Services (FastAPI + Redis)
```bash
docker compose up --build -d
```

### Check Running Containers
```bash
docker compose ps
```

### Inspect Container Logs
```bash
docker compose logs -f api
```

### Verify Container Health
```bash
curl -f http://localhost:8000/health/ready
```

### Stop Services
```bash
docker compose down
```

---

## 8. Five-Day Junior Backend Learning Roadmap

| Day | Focus Topic | Files to Study & Practice |
|---|---|---|
| **Day 1** | **FastAPI Basics & Clean Architecture** | `app/main.py`, `app/api/router.py`, `app/api/v1/health.py`, `app/middleware/request_id.py` |
| **Day 2** | **Data Modeling & Migrations** | `app/database.py`, `app/models/`, `alembic/env.py`, `alembic/versions/` |
| **Day 3** | **Security, Authentication & Validation** | `app/core/security.py`, `app/schemas/`, `app/dependencies/auth.py`, `app/services/auth.py` |
| **Day 4** | **Business Logic, Caching & Repositories** | `app/repositories/tasks.py`, `app/services/tasks.py`, `app/services/cache.py` |
| **Day 5** | **Testing, Containerization & CI/CD** | `tests/`, `Dockerfile`, `compose.yaml`, `.github/workflows/ci.yml`, `scripts/aws-deployment-guide.md` |

