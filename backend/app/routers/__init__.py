"""
API Routers Package

This package contains all API route handlers for HealthHub v2.
Each router handles a specific domain (auth, measurements, analytics).

Available routers:
- auth: Authentication (login, register, token refresh)
- measurements: CRUD for body measurements
- users: User profile management
- subscriptions: Stripe subscription handling
- opportunities: Waitlist management (public signup + admin)
- calculate: Public body composition calculator
"""

from . import auth, measurements, users, subscriptions, opportunities, calculate

__all__ = [
    "auth",
    "measurements", 
    "users",
    "subscriptions",
    "opportunities",
    "calculate",
]