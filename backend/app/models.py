from sqlalchemy import Column, Integer, String, Float, Date, DateTime, Boolean, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from uuid import uuid4
from app.database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(100))
    is_admin = Column(Boolean, default=False)

    birth_date = Column(Date, nullable=True)
    gender = Column(String(30), nullable=True)
    phone = Column(String(30), nullable=True)
    address = Column(String(255), nullable=True)
    city = Column(String(100), nullable=True)
    postal_code = Column(String(20), nullable=True)
    country = Column(String(100), nullable=True)
    profile_image_url = Column(String(500), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    plan_type = Column(String(20), default="free")
    subscription_status = Column(String(20), default="inactive")
    stripe_customer_id = Column(String(255), nullable=True)
    stripe_subscription_id = Column(String(255), nullable=True)
    current_period_end = Column(DateTime, nullable=True)

    measurements = relationship("Measurement", back_populates="user")
    pdf_extractions = relationship("PdfExtraction", back_populates="user")


class PdfExtraction(Base):
    __tablename__ = "pdf_extractions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    file_path = Column(String(500), nullable=False)
    raw_extracted_data = Column(JSON)
    confidence_scores = Column(JSON)
    llm_used = Column(Boolean, default=False)
    extraction_notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="pdf_extractions")
    measurements = relationship("Measurement", back_populates="pdf_extraction")


class Measurement(Base):
    __tablename__ = "measurements"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(DateTime, default=datetime.utcnow)

    weight_kg = Column(Float)
    body_fat_percent = Column(Float)
    muscle_mass_percent = Column(Float)
    waist_cm = Column(Float)
    stomach_circumference_cm = Column(Float)
    hip_circumference_cm = Column(Float)
    chest_circumference_cm = Column(Float)
    skeletal_muscle_mass_kg = Column(Float)
    visceral_fat_level = Column(Integer)
    bmr_kcal = Column(Float)
    bmi = Column(Float)

    source_type = Column(String(50), default="manual")
    extraction_confidence = Column(Float)
    pdf_extraction_id = Column(Integer, ForeignKey("pdf_extractions.id"), nullable=True)

    is_user_corrected = Column(Boolean, default=False)

    user = relationship("User", back_populates="measurements")
    pdf_extraction = relationship("PdfExtraction", back_populates="measurements")


class SubscriptionEvent(Base):
    __tablename__ = "subscription_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    stripe_event_id = Column(String(255), unique=True, nullable=False, index=True)
    event_type = Column(String(100), nullable=False)
    stripe_customer_id = Column(String(255), nullable=True)
    stripe_subscription_id = Column(String(255), nullable=True)
    payload = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Opportunity(Base):
    __tablename__ = "opportunities"
    
    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), unique=True, nullable=False, default=lambda: str(uuid4()))
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=True)
    status = Column(String(20), default="waiting")  # waiting, contacted, converted, expired
    referral_source = Column(String(100), nullable=True)
    
    # Calculator data - what they calculated at signup
    calculated_kfa = Column(Float, nullable=True)  # body fat percent (ML corrected)
    calculated_mma = Column(Float, nullable=True)  # muscle mass percent
    calculated_body_fat_navy = Column(Float, nullable=True)  # raw navy formula
    height_cm = Column(Float, nullable=True)
    weight_kg = Column(Float, nullable=True)
    age = Column(Integer, nullable=True)
    gender = Column(String(10), nullable=True)
    neck_cm = Column(Float, nullable=True)
    waist_cm = Column(Float, nullable=True)
    hip_cm = Column(Float, nullable=True)
    
    # Tracking
    metadata_json = Column(JSON, nullable=True)
    converted_to_customer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    converted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    converted_customer = relationship("User", foreign_keys=[converted_to_customer_id])

