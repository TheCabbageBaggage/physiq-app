"""
Simple in-memory rate limiter middleware for FastAPI
"""
import time
from typing import Dict, Tuple
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware

class RateLimiterMiddleware(BaseHTTPMiddleware):
    """Simple in-memory rate limiter: 100 requests per minute per IP"""
    
    def __init__(self, app, requests_per_minute: int = 100):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self._storage: Dict[str, Tuple[int, float]] = {}
    
    async def dispatch(self, request: Request, call_next):
        # Skip rate limiting for health checks
        if request.url.path in ["/health", "/api/health", "/docs", "/openapi.json"]:
            return await call_next(request)
        
        client_ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown")
        if "," in client_ip:
            client_ip = client_ip.split(",")[0].strip()
        
        current_time = time.time()
        window_start = current_time - 60
        
        count, last_window = self._storage.get(client_ip, (0, current_time))
        
        if last_window < window_start:
            count = 0
        
        if count >= self.requests_per_minute:
            raise HTTPException(status_code=429, detail="Rate limit exceeded. Try again in a minute.")
        
        self._storage[client_ip] = (count + 1, current_time)
        
        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(self.requests_per_minute)
        response.headers["X-RateLimit-Remaining"] = str(max(0, self.requests_per_minute - count - 1))
        return response
