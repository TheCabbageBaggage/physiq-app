#!/usr/bin/env python3
"""
Application Runner Script

This script starts the FastAPI application using Uvicorn.
Can be used for both development and production deployment.

Usage:
    python run.py              # Start with default settings
    python run.py --reload     # Start with auto-reload (development)
    python run.py --host 0.0.0.0 --port 8000  # Custom host/port
"""

import uvicorn
import argparse

def main():
    """Parse command line arguments and start the server."""
    parser = argparse.ArgumentParser(description="HealthHub v2 Backend Server")
    parser.add_argument("--host", default="127.0.0.1", help="Host to bind to")
    parser.add_argument("--port", type=int, default=8000, help="Port to bind to")
    parser.add_argument("--reload", action="store_true", help="Enable auto-reload (development)")
    parser.add_argument("--workers", type=int, default=1, help="Number of worker processes")
    
    args = parser.parse_args()
    
    uvicorn.run(
        "app.main:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
        workers=args.workers
    )

if __name__ == "__main__":
    main()