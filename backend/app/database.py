"""
Database Configuration

This module sets up the SQLAlchemy database connection and session factory.
Uses SQLite for simplicity in self-hosted deployments.

Responsibilities:
- Create SQLAlchemy engine with SQLite
- Configure session factory
- Define declarative base for models
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# SQLite database URL
SQLALCHEMY_DATABASE_URL = "sqlite:///./healthhub.db"

# Create SQLAlchemy engine
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}  # Required for SQLite
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create declarative base
Base = declarative_base()

def get_db():
    """
    Dependency function to get database session.
    
    Usage in FastAPI endpoints:
        db: Session = Depends(get_db)
    
    Yields:
        SQLAlchemy session
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()