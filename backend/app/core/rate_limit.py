"""Small in-memory protections: an AI rate limit and security headers.

The rate limit is per client IP and per process, which is enough for this local
academic prototype. A multi-server deployment would use a shared store instead.
"""

import threading
import time
from collections import defaultdict, deque
from collections.abc import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

AI_RATE_LIMIT_PER_MINUTE = 10
AI_PATH_SUFFIXES = ("/generate", "/retry")


class SlidingWindowLimiter:
    """Allows at most max_calls per key within window_seconds."""

    def __init__(self, max_calls: int, window_seconds: float = 60.0, clock: Callable[[], float] = time.monotonic):
        self.max_calls = max_calls
        self.window_seconds = window_seconds
        self._clock = clock
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def allow(self, key: str) -> tuple[bool, int]:
        """Return (allowed, seconds_until_retry)."""
        now = self._clock()
        with self._lock:
            hits = self._hits[key]
            while hits and now - hits[0] >= self.window_seconds:
                hits.popleft()
            if len(hits) >= self.max_calls:
                retry_after = int(self.window_seconds - (now - hits[0])) + 1
                return False, retry_after
            hits.append(now)
            return True, 0

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


def is_ai_request(request: Request) -> bool:
    path = request.url.path
    return request.method == "POST" and path.startswith("/api/") and path.endswith(AI_PATH_SUFFIXES)


class AIRateLimitMiddleware(BaseHTTPMiddleware):
    """Limits only the endpoints that call the AI provider, to protect the API quota."""

    def __init__(self, app, limiter: SlidingWindowLimiter):
        super().__init__(app)
        self.limiter = limiter

    async def dispatch(self, request: Request, call_next) -> Response:
        if is_ai_request(request):
            client = request.client.host if request.client else "unknown"
            allowed, retry_after = self.limiter.allow(client)
            if not allowed:
                return JSONResponse(
                    status_code=429,
                    content={
                        "error": {
                            "code": "RATE_LIMITED",
                            "message": f"Too many AI requests. Please wait {retry_after} seconds and try again.",
                        }
                    },
                    headers={"Retry-After": str(retry_after)},
                )
        return await call_next(request)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        if request.url.path.startswith("/api/"):
            # Health-related data should not be stored in the browser cache.
            response.headers.setdefault("Cache-Control", "no-store")
        return response