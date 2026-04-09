import time
from collections import defaultdict
from fastapi import HTTPException, Request

# In-memory store: {key: [(timestamp, count)]}
_store: dict = defaultdict(list)

def rate_limit(key: str, max_requests: int = 5, window_seconds: int = 60):
    """Raise 429 if key exceeds max_requests in window_seconds."""
    now = time.time()
    window_start = now - window_seconds

    # Clean old entries
    _store[key] = [t for t in _store[key] if t > window_start]

    if len(_store[key]) >= max_requests:
        raise HTTPException(
            status_code=429,
            detail=f"Too many attempts. Please wait {window_seconds} seconds before trying again."
        )

    _store[key].append(now)

def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"
