from app.ml import ensure_models


if __name__ == "__main__":
    ensure_models()
    print("Models trained and persisted to ./models")
