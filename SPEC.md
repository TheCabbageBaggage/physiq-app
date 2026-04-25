# HealthHub v2 - Technical Specification

## Overview
HealthHub v2 is a self-hosted health tracking platform with a FastAPI backend and Next.js 14 frontend. It provides body composition tracking, progress visualization, and simple predictive analytics.

## Architecture

### Backend (FastAPI)
- **Framework**: FastAPI with SQLAlchemy ORM
- **Database**: SQLite (file-based, easy deployment)
- **Authentication**: JWT (JSON Web Tokens)
- **API Style**: RESTful with OpenAPI documentation

### Frontend (Next.js 14)
- **Framework**: Next.js 14 with App Router
- **Styling**: TailwindCSS with custom design system
- **State Management**: React Query for server state
- **Icons**: Lucide React for consistent iconography

## Database Schema

### User Table
- `id`: Integer (Primary Key)
- `email`: String (Unique)
- `hashed_password`: String
- `full_name`: String
- `created_at`: DateTime
- `updated_at`: DateTime

### Measurement Table
- `id`: Integer (Primary Key)
- `user_id`: Integer (Foreign Key to User)
- `date`: Date
- `weight_kg`: Float
- `body_fat_percentage`: Float
- `muscle_mass_kg`: Float
- `water_percentage`: Float
- `bone_mass_kg`: Float
- `visceral_fat`: Integer
- `bmi`: Float
- `metabolic_age`: Integer
- `notes`: Text (Optional)
- `created_at`: DateTime

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login (returns JWT)
- `POST /api/auth/refresh` - Refresh JWT token

### Measurements
- `GET /api/measurements` - List all measurements for authenticated user
- `GET /api/measurements/{id}` - Get specific measurement
- `POST /api/measurements` - Create new measurement
- `PUT /api/measurements/{id}` - Update measurement
- `DELETE /api/measurements/{id}` - Delete measurement

### Analytics
- `GET /api/analytics/stats` - Get summary statistics (totals, averages, trends)
- `GET /api/analytics/predictions` - Get 90-day projections based on current trends
- `GET /api/analytics/recommendations` - Get personalized trainer recommendations

## Frontend Components

### Layout
- **Sidebar Navigation**: Dark theme (#1A1A1A) with navigation links
- **Header**: User profile, notifications, logout
- **Main Content Area**: Responsive grid layout

### Pages
1. **Dashboard** (`/`)
   - Overview cards with key metrics
   - Recent measurements timeline
   - Progress charts

2. **Measurements** (`/measurements`)
   - Data entry form
   - Measurement history table
   - Export functionality

3. **Predictions** (`/predictions`)
   - 90-day projection charts
   - Goal setting interface
   - Milestone tracking

4. **Recommendations** (`/recommendations`)
   - Personalized trainer advice
   - Exercise suggestions
   - Nutrition tips

## Design System

### Colors
- **Primary**: #0066CC (Blue)
- **Secondary**: #1A1A1A (Dark sidebar)
- **Background**: #FFFFFF (Light mode), #0F0F0F (Dark mode)
- **Text**: #333333 (Light mode), #E0E0E0 (Dark mode)
- **Success**: #10B981 (Green)
- **Warning**: #F59E0B (Amber)
- **Error**: #EF4444 (Red)

### Typography
- **Font Family**: Inter (system font stack)
- **Base Size**: 16px
- **Scale**: 0.75, 0.875, 1, 1.125, 1.25, 1.5, 1.875, 2.25, 3, 3.75, 4.5

## Security

### Authentication
- Password hashing with bcrypt
- JWT tokens with 24-hour expiry
- Refresh token mechanism
- Rate limiting on auth endpoints

### Data Protection
- SQL injection prevention via SQLAlchemy
- XSS protection via React sanitization
- CORS configuration for frontend access
- Input validation with Pydantic

## Deployment

### Docker Compose
- Backend service: FastAPI on port 8000
- Frontend service: Next.js on port 3000
- Volume mapping for SQLite database
- Environment variable configuration

### Environment Variables
- `DATABASE_URL`: SQLite database path
- `SECRET_KEY`: JWT secret key
- `ALLOWED_ORIGINS`: CORS allowed origins
- `NODE_ENV`: Production/development mode

## Development Setup

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Future Enhancements

### Phase 2
- Mobile app (React Native)
- Webhook integrations (Fitbit, Apple Health)
- Advanced analytics (machine learning models)
- Social features (challenges, leaderboards)

### Phase 3
- Multi-user support (trainer/client relationships)
- Subscription management
- Advanced reporting (PDF generation)
- API rate limiting tiers

## File Structure Reference

See individual file comments for implementation details. Each file contains placeholder documentation explaining its purpose and required functionality.