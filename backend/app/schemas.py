from datetime import date, datetime
from typing import Optional, Literal, Dict, Any
from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    email: EmailStr
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    full_name: Optional[str] = Field(None, min_length=1, max_length=100)


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=100)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(UserBase):
    id: int
    plan_type: Literal["free", "pro", "enterprise"] = "free"
    subscription_status: Literal["active", "inactive", "canceled"] = "inactive"
    available_features: list[str] = Field(default_factory=lambda: ["basic_tracking", "csv_export", "charts"])
    birth_date: Optional[date] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    profile_image_url: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = 86400


class TokenData(BaseModel):
    user_id: Optional[int] = None
    email: Optional[str] = None


class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    full_name: Optional[str] = Field(None, min_length=1, max_length=100)
    birth_date: Optional[date] = None
    gender: Optional[str] = Field(None, max_length=30)
    phone: Optional[str] = Field(None, max_length=30)
    address: Optional[str] = Field(None, max_length=255)
    city: Optional[str] = Field(None, max_length=100)
    postal_code: Optional[str] = Field(None, max_length=20)
    country: Optional[str] = Field(None, max_length=100)


class PasswordChange(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=100)
    confirm_password: str = Field(..., min_length=8, max_length=100)


class ProfileImageUpload(BaseModel):
    filename: str
    content_type: str
    profile_image_url: str


class MeasurementBase(BaseModel):
    date: date
    weight_kg: float = Field(..., ge=30, le=200)
    body_fat_percent: float = Field(..., ge=3, le=50)
    muscle_mass_percent: Optional[float] = Field(None, ge=0, le=100)
    stomach_circumference_cm: Optional[float] = Field(None, ge=50, le=150)
    skeletal_muscle_mass_kg: Optional[float] = Field(None, ge=10, le=100)
    bmi: Optional[float] = Field(None, ge=10, le=50)
    visceral_fat_level: Optional[int] = Field(None, ge=1, le=30)
    bmr_kcal: Optional[float] = Field(None, ge=800, le=5000)
    source_type: str = "manual"
    is_user_corrected: bool = False

    body_fat_percentage: Optional[float] = Field(None, ge=0, le=100)
    muscle_mass_kg: Optional[float] = Field(None, ge=10, le=100)
    water_percentage: Optional[float] = Field(None, ge=0, le=100)
    bone_mass_kg: Optional[float] = Field(None, gt=0)
    visceral_fat: Optional[int] = Field(None, ge=0, le=60)
    metabolic_age: Optional[int] = Field(None, ge=0)
    waist_circumference_cm: Optional[float] = Field(None, ge=50, le=150)
    hip_circumference_cm: Optional[float] = Field(None, ge=60, le=150)
    chest_circumference_cm: Optional[float] = Field(None, ge=70, le=150)
    source: Optional[Literal["manual", "pdf_extraction"]] = None
    extraction_confidence: Optional[float] = Field(None, ge=0, le=1)
    pdf_extraction_id: Optional[int] = None
    notes: Optional[str] = Field(None, max_length=500)


class MeasurementCreate(MeasurementBase):
    pass


class MeasurementUpdate(BaseModel):
    date: Optional[date] = None
    weight_kg: Optional[float] = Field(None, ge=30, le=200)
    body_fat_percent: Optional[float] = Field(None, ge=3, le=50)
    muscle_mass_percent: Optional[float] = Field(None, ge=0, le=100)
    stomach_circumference_cm: Optional[float] = Field(None, ge=50, le=150)
    skeletal_muscle_mass_kg: Optional[float] = Field(None, ge=10, le=100)
    bmi: Optional[float] = Field(None, ge=10, le=50)
    visceral_fat_level: Optional[int] = Field(None, ge=1, le=30)
    bmr_kcal: Optional[float] = Field(None, ge=800, le=5000)
    source_type: Optional[str] = None
    is_user_corrected: Optional[bool] = None

    body_fat_percentage: Optional[float] = Field(None, ge=0, le=100)
    muscle_mass_kg: Optional[float] = Field(None, ge=10, le=100)
    water_percentage: Optional[float] = Field(None, ge=0, le=100)
    bone_mass_kg: Optional[float] = Field(None, gt=0)
    visceral_fat: Optional[int] = Field(None, ge=0, le=60)
    metabolic_age: Optional[int] = Field(None, ge=0)
    waist_circumference_cm: Optional[float] = Field(None, ge=50, le=150)
    hip_circumference_cm: Optional[float] = Field(None, ge=60, le=150)
    chest_circumference_cm: Optional[float] = Field(None, ge=70, le=150)
    source: Optional[Literal["manual", "pdf_extraction"]] = None
    extraction_confidence: Optional[float] = Field(None, ge=0, le=1)
    pdf_extraction_id: Optional[int] = None
    notes: Optional[str] = Field(None, max_length=500)


class MeasurementResponse(MeasurementBase):
    id: int
    user_id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TrendMetric(BaseModel):
    direction: Literal["up", "down", "stable"]
    change: float
    change_percent: float


class StatsResponse(BaseModel):
    total_measurements: int
    average_weight_kg: float
    average_body_fat_percent: float
    average_muscle_mass_percent: float
    average_stomach_circumference_cm: float
    average_skeletal_muscle_mass_kg: float
    average_bmi: float
    average_visceral_fat_level: float
    average_bmr_kcal: float
    weight_trend: str
    body_fat_percent_trend: str
    muscle_mass_percent_trend: str
    trends: Dict[str, TrendMetric]


class PredictionConfidenceInterval(BaseModel):
    low: float
    high: float


class PredictionPoint(BaseModel):
    date: str
    value: float
    point_type: Literal["historical", "predicted"]
    confidence_low: Optional[float] = None
    confidence_high: Optional[float] = None


class PredictionResponse(BaseModel):
    metric: str
    days_ahead: int
    current_value: float
    predicted_value: float
    confidence_interval: PredictionConfidenceInterval
    trend: Literal["increasing", "decreasing", "stable"]
    confidence_score: float
    assumptions: list[str]
    source: Literal["ml", "fallback"]
    points: list[PredictionPoint]


class RecommendationResponse(BaseModel):
    exercise_recommendations: list[str]
    nutrition_recommendations: list[str]
    recovery_recommendations: list[str]
    priority_level: str
    rationale: str


class ChartDataResponse(BaseModel):
    dates: list[str]
    values: list[float]


class PdfExtractedMetric(BaseModel):
    value: Optional[float] = None
    confidence: float = Field(..., ge=0, le=1)
    low_confidence: bool
    warnings: list[str] = Field(default_factory=list)


class PdfExtractionResponse(BaseModel):
    pdf_extraction_id: int
    source: Literal["pdf_extraction"] = "pdf_extraction"
    extracted_values: Dict[str, Optional[float]]
    confidence_scores: Dict[str, float]
    low_confidence_fields: list[str]
    plausibility_warnings: Dict[str, list[str]]
    anomaly_warnings: list[str]
    raw_extracted_data: Dict[str, Any]


# ============ OPPORTUNITY + CALCULATOR SCHEMAS ============


class SubscriptionStatusResponse(BaseModel):
    plan_type: str
    subscription_status: str
    current_period_end: Optional[datetime] = None
    stripe_customer_id: Optional[str] = None
    stripe_subscription_id: Optional[str] = None
    features: list[str]

    class Config:
        from_attributes = True


class CancelSubscriptionResponse(BaseModel):
    message: str
    current_period_end: Optional[datetime] = None
    status: str


class CreateCheckoutRequest(BaseModel):
    plan_type: Literal["pro", "enterprise"]
    success_url: Optional[str] = None
    cancel_url: Optional[str] = None


class CreateCheckoutResponse(BaseModel):
    url: Optional[str] = None
    session_id: str


class StripeWebhookResponse(BaseModel):
    status: str
    message: str

class OpportunityCreate(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    phone: Optional[str] = Field(None, max_length=30)
    interests: Optional[list[str]] = None
    bia_access: Optional[str] = None  # yes, occasionally, planning, no
    newsletter_opt_in: bool = True
    referral_source: Optional[str] = None
    calculated_kfa: Optional[float] = None
    calculated_mma: Optional[float] = None
    calculated_body_fat_navy: Optional[float] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    neck_cm: Optional[float] = None
    waist_cm: Optional[float] = None
    hip_cm: Optional[float] = None
    activity_level: Optional[str] = None


class OpportunityResponse(BaseModel):
    id: int
    uuid: str
    email: str
    name: Optional[str] = None
    phone: Optional[str] = None
    interests: Optional[list[str]] = None
    bia_access: Optional[str] = None
    newsletter_opt_in: bool = True
    status: str
    referral_source: Optional[str] = None
    calculated_kfa: Optional[float] = None
    calculated_mma: Optional[float] = None
    calculated_body_fat_navy: Optional[float] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    converted_to_customer_id: Optional[int] = None
    
    class Config:
        from_attributes = True


class OpportunityListResponse(BaseModel):
    total: int
    opportunities: list[OpportunityResponse]
    page: int
    per_page: int


class CalculateRequest(BaseModel):
    gender: Literal["male", "female"]
    age: int = Field(..., ge=12, le=95)
    height_cm: float = Field(..., ge=120, le=230)
    weight_kg: float = Field(..., ge=30, le=250)
    neck_cm: float = Field(..., ge=20, le=70)
    waist_cm: float = Field(..., ge=40, le=200)
    hip_cm: Optional[float] = Field(None, ge=50, le=220)
    activity_level: Literal["sedentary", "light", "moderate", "active", "very_active"] = "moderate"


class CalculateResponse(BaseModel):
    body_fat_percent: float
    body_fat_navy_percent: float
    muscle_mass_percent: float
    athlete_type: str
    confidence_score: float
    composition: dict
    source: str  # "ml" or "navy_only"

