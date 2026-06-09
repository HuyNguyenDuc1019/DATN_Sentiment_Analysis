from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .schemas import PredictRequest, PredictResponse, BatchPredictRequest, FeedbackRequest
from .database import supabase
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
# API MỚI: XỬ LÝ HÀNG LOẠT & LƯU DATABASE (CHUẨN SAAS)
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
        # Giai đoạn 1: AI Dự đoán cảm xúc
        for i in range(0, total_texts, CHUNK_SIZE):
            chunk_texts = all_texts[i : i + CHUNK_SIZE]
            
            for text in chunk_texts:
                if not text.strip():
                    continue
                    
                pred_result = predictor.predict(text)
                
                label = pred_result.label if hasattr(pred_result, 'label') else pred_result['label']
                confidence = pred_result.confidence if hasattr(pred_result, 'confidence') else pred_result['confidence']
                
                results.append({
                    "text": text,
                    "label": label,
                    "confidence": confidence
                })
                
        # Giai đoạn 2: Chuẩn bị gói dữ liệu để đưa lên Supabase
        db_records = []
        for item in results:
            db_records.append({
                "content": item["text"], 
                "ai_label": item["label"], # 👈 ĐỔI TÊN CỘT THÀNH ai_label (giống hệt Supabase)
                "confidence": item["confidence"],
                "user_id": request.user_id,
                "source_url": request.source_url # 👈 LƯU THÊM CÁI LINK VÀO DB
            })

        # Giai đoạn 3: Bắn dữ liệu vào bảng scraped_reviews
        if db_records:
            try:
                # Gọi lệnh insert hàng loạt
                supabase.table("scraped_reviews").insert(db_records).execute()
                print(f"✅ Đã lưu thành công {len(db_records)} bình luận vào Database!")
            except Exception as db_error:
                # Chỉ in lỗi ra Terminal chứ không làm sập API, để Frontend vẫn nhận được kết quả phân tích
                print(f"❌ Lỗi khi lưu vào Supabase: {str(db_error)}")
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi trong quá trình xử lý mảng: {str(e)}")

    end_time = time.time()
    processing_time = round(end_time - start_time, 2)

    return {
        "results": results,
        "total_processed": len(results),
        "processing_time": f"{processing_time}s",
        "message": "Phân tích và lưu trữ thành công"
    }

# =====================================================================
# API MỚI: VÒNG LẶP PHẢN HỒI (HUMAN-IN-THE-LOOP)
# =====================================================================
@app.post("/feedback")
async def save_feedback(request: FeedbackRequest):
    try:
        data, count = supabase.table("feedback_data").insert({
            "original_content": request.original_content,
            "old_ai_label": request.old_ai_label,
            "corrected_label": request.corrected_label,
            "user_id": request.user_id # Lưu lại công lao của người đóng góp
        }).execute()
        
        return {
            "status": "success",
            "message": "Đã lưu đính chính thành công, cảm ơn bạn đã đóng góp dữ liệu!",
            "data": data[1] if data else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi lưu dữ liệu vào cơ sở dữ liệu: {str(e)}")