from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.router import api_router
from app.api.v1.health import router as health_root_router
from app.core.config import settings
from app.core.exceptions import AppException
from app.core.logging import setup_logging
from app.middleware.request_id import RequestIdAndLoggingMiddleware

# Configure structured JSON logging
logger = setup_logging(settings.LOG_LEVEL)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
    """Startup and shutdown lifecycle handler."""
    logger.info(
        "Application startup: %s (Environment: %s)",
        settings.APP_NAME,
        settings.APP_ENV,
    )
    yield
    logger.info("Application shutdown: %s", settings.APP_NAME)


# Configure documentation exposure: enabled in dev/staging/testing, disabled in production
docs_url = "/docs" if settings.APP_ENV != "production" else None
redoc_url = "/redoc" if settings.APP_ENV != "production" else None
openapi_url = "/openapi.json" if settings.APP_ENV != "production" else None

app = FastAPI(
    title=settings.APP_NAME,
    description="Industry-Ready Task Management REST API with JWT Auth, Caching, and Clean Architecture",
    version="1.0.0",
    docs_url=docs_url,
    redoc_url=redoc_url,
    openapi_url=openapi_url,
    lifespan=lifespan,
)

# 1. Custom Request ID & Access Logging Middleware
app.add_middleware(RequestIdAndLoggingMiddleware)

# 2. CORS Middleware with explicitly configured origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)


# Exception handlers
@app.exception_handler(AppException)
async def handle_app_exception(request: Request, exc: AppException) -> JSONResponse:
    request_id = getattr(request.state, "request_id", None)
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.detail,
                "request_id": request_id,
            }
        },
        headers=exc.headers,
    )


@app.exception_handler(RequestValidationError)
async def handle_validation_exception(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    request_id = getattr(request.state, "request_id", None)
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid request parameters or payload.",
                "details": exc.errors(),
                "request_id": request_id,
            }
        },
    )


@app.exception_handler(Exception)
async def handle_unexpected_exception(request: Request, exc: Exception) -> JSONResponse:
    request_id = getattr(request.state, "request_id", None)
    # Log the full exception stack trace internally for ops/observability
    logger.exception("Internal unhandled error: %s (request_id=%s)", exc, request_id)

    # Return safe response without leaking stack traces or internals to the client
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected server error occurred. Please contact support.",
                "request_id": request_id,
            }
        },
    )


# Attach API routes
app.include_router(health_root_router)  # Mounted directly at /health/live and /health/ready
app.include_router(api_router, prefix="/api/v1")


@app.get("/", tags=["Root"])
def root_endpoint() -> dict[str, str]:
    return {
        "name": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "docs": "/docs" if docs_url else "disabled",
    }
