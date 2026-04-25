# HealthHub v2

A self-hosted health tracking platform with body composition analytics and predictive insights.

## Features

- **Body Composition Tracking**: Record weight, body fat, muscle mass, water percentage, and more
- **Progress Visualization**: Charts and graphs showing trends over time
- **Predictive Analytics**: 90-day projections based on current progress
- **Trainer Recommendations**: Personalized exercise and nutrition advice
- **Secure & Private**: Self-hosted solution with JWT authentication

## Tech Stack

### Backend
- **FastAPI**: Modern Python web framework
- **SQLAlchemy**: Python SQL toolkit and ORM
- **SQLite**: Lightweight database (file-based)
- **JWT**: JSON Web Token authentication

### Frontend
- **Next.js 14**: React framework with App Router
- **TailwindCSS**: Utility-first CSS framework
- **React Query**: Server state management
- **Lucide React**: Beautiful & consistent icons

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for development)
- Python 3.11+ (for development)

### Docker Deployment
```bash
# Clone and navigate to project
git clone <repository-url>
cd healthhub-v2

# Start services
docker-compose up -d

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Development Setup

#### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Project Structure

```
healthhub-v2/
├── backend/              # FastAPI backend
│   ├── app/             # Application code
│   │   ├── main.py      # FastAPI app instance
│   │   ├── database.py  # Database connection
│   │   ├── models.py    # SQLAlchemy models
│   │   ├── schemas.py   # Pydantic schemas
│   │   ├── auth.py      # JWT authentication
│   │   └── routers/     # API route handlers
│   ├── requirements.txt # Python dependencies
│   └── run.py          # Application entry point
├── frontend/            # Next.js frontend
│   ├── app/             # Next.js App Router
│   │   ├── page.tsx     # Dashboard page
│   │   ├── measurements/# Measurement pages
│   │   ├── predictions/ # Prediction pages
│   │   └── layout.tsx   # Root layout
│   ├── components/      # React components
│   ├── package.json     # Node.js dependencies
│   └── tailwind.config.ts # Tailwind config
├── docker-compose.yml   # Docker deployment
├── SPEC.md             # Detailed specifications
└── README.md           # This file
```

## API Documentation

Once running, access the interactive API documentation at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Environment Variables

Create a `.env` file in the backend directory:

```env
DATABASE_URL=sqlite:///./healthhub.db
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Support

For issues and feature requests, please use the GitHub issue tracker.