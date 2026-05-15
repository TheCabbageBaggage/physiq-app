#!/bin/bash
# ML Service Startup Script for Physiq
# Usage: ./start_ml_service.sh [PORT]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ML_SERVICE_DIR="$SCRIPT_DIR/../ml-service"
PORT="${1:-8001}"

cd "$ML_SERVICE_DIR"

# Check if venv exists
if [ ! -d ".venv" ]; then
    echo "🔧 Creating Python virtual environment..."
    python3 -m venv .venv 2>/dev/null || { echo "❌ python3-venv not available. Please install: sudo apt install python3.13-venv"; exit 1; }
fi

# Activate venv
source .venv/bin/activate

# Install/update dependencies
echo "📦 Installing dependencies..."
pip install -q --upgrade pip
pip install -q -r requirements.txt

# Check if models exist
if [ ! -f "models/bodyfat_residual_model.joblib" ]; then
    echo "🤖 Models not found. They will be generated on first startup..."
fi

# Start ML service
echo "🚀 Starting ML Service on port $PORT..."
echo "   Health check: curl http://localhost:$PORT/health"
echo ""

exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT" --reload
