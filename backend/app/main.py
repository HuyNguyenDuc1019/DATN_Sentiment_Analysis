from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .schemas import PredictRequest, PredictResponse
from .predictor import SentimentPredictor
import os

app = FastAPI(
    title="Foody Sentiment Analysis API",
    description="API phân loại cảm xúc bình luận tiếng Việt sử dụng PhoBERT",
    version="1.0.0"
)

# Khai báo cấu hình CORS (Mở cổng cho ReactJS / Vite)
origins = [
    "http://localhost:3000",
    "http://localhost:5173",  # Port mặc định nếu bạn dùng Vite
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Biến toàn cục lưu trữ mô hình
predictor = None

@app.on_event("startup")
async def load_model():
    global predictor
    # Đường dẫn trỏ tới thư mục chứa model đã giải nén
    model_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "phobert_saved_model")
    try:
        predictor = SentimentPredictor(model_path=model_dir)
    except Exception as e:
        print(f"Lỗi khi tải mô hình: {e}")

@app.post("/predict", response_model=PredictResponse)
async def predict_sentiment(request: PredictRequest):
    if predictor is None:
        raise HTTPException(status_code=503, detail="Mô hình chưa sẵn sàng. Vui lòng thử lại sau.")
    
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Văn bản không được để trống.")

    try:
        result = predictor.predict(request.text)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi trong quá trình dự đoán: {str(e)}")