from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .schemas import PredictRequest, PredictResponse, BatchPredictRequest
from .predictor import SentimentPredictor
import os
import time

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

# =====================================================================
# API MỚI: XỬ LÝ HÀNG LOẠT (BATCH PROCESSING) TỐI ƯU CHO CPU
# =====================================================================
@app.post("/predict/batch")
async def predict_batch(request: BatchPredictRequest):
    if predictor is None:
        raise HTTPException(status_code=503, detail="Mô hình chưa sẵn sàng. Vui lòng thử lại sau.")
        
    start_time = time.time()
    
    all_texts = request.texts
    total_texts = len(all_texts)
    results = []

    # CHUNKING: Chia mảng lớn thành các mảng nhỏ (10 câu/lần) để chống văng RAM
    CHUNK_SIZE = 10 

    try:
        for i in range(0, total_texts, CHUNK_SIZE):
            chunk_texts = all_texts[i : i + CHUNK_SIZE]
            
            for text in chunk_texts:
                # Bỏ qua nếu có chuỗi rỗng nằm lẫn trong mảng
                if not text.strip():
                    continue
                    
                # Tận dụng luôn class SentimentPredictor đã đóng gói của bạn
                pred_result = predictor.predict(text)
                
                # Trích xuất dữ liệu từ object/dict trả về của predictor
                # (Xử lý linh hoạt việc trả về dict hay Pydantic model)
                label = pred_result.label if hasattr(pred_result, 'label') else pred_result['label']
                confidence = pred_result.confidence if hasattr(pred_result, 'confidence') else pred_result['confidence']
                
                results.append({
                    "text": text,
                    "label": label,
                    "confidence": confidence
                })
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi trong quá trình xử lý mảng: {str(e)}")

    end_time = time.time()
    processing_time = round(end_time - start_time, 2)

    return {
        "results": results,
        "total_processed": total_texts,
        "processing_time": f"{processing_time}s"
    }