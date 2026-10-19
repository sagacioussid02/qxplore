"""Shared slowapi rate limiter for the FastAPI app.

The limiter instance lives here (not in main.py) so routers can import it
without creating a circular import. main.py registers it on app.state and
adds the RateLimitExceeded exception handler.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
