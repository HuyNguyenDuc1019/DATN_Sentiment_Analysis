from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from app.predictor import SentimentPredictor

# Import routers
from app.api.routers import (
    admin,
    user,
    predict,
    dashboard,
    feedback,
    compare,
    payment,
)

app = FastAPI(
    title="Foody Sentiment Analysis API",
    description="API phân loại cảm xúc bình luận tiếng Việt sử dụng PhoBERT",
    version="1.0.0",
)

origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def load_model():
    model_dir = os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        "phobert_saved_model",
    )

    try:
        app.state.predictor = SentimentPredictor(model_path=model_dir)
        print("✅ Mô hình PhoBERT đã sẵn sàng!")
    except Exception as e:
        app.state.predictor = None
        print(f"❌ Lỗi khi tải mô hình: {e}")


# Include routers
app.include_router(admin.router)
app.include_router(user.router)
app.include_router(predict.router)
app.include_router(dashboard.router)
app.include_router(feedback.router)
app.include_router(compare.router)
app.include_router(payment.router)


@app.get("/")
async def root():
    return {
        "status": "success",
        "message": "Foody Sentiment Analysis API is running",
    }