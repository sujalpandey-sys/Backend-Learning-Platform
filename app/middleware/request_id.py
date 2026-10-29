import logging
import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("app.access")


class RequestIdAndLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware that:
    1. Extracts or generates an X-Request-ID for every incoming request.
    2. Measures request execution duration.
    3. Emits structured JSON access logs with request_id, method, path, status, and duration.
    4. Attaches the X-Request-ID to the outgoing response headers for client tracing.
    """

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = request_id

        start_time = time.perf_counter()
        try:
            response = await call_next(request)
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

            # Attach tracing header
            response.headers["X-Request-ID"] = request_id

            # Emit structured access log
            extra = {
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
            }
            logger.info("Request processed", extra=extra)

            return response
        except Exception as exc:
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            extra = {
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": 500,
                "duration_ms": duration_ms,
            }
            logger.exception("Unhandled server exception during request processing", extra=extra)
            raise exc
