from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import time
from collections import Counter  # Thêm thư viện để đếm từ khóa cho Leaderboard
from typing import Optional
# Import cấu trúc dữ liệu từ file schemas.py
from .schemas import PredictRequest, PredictResponse, BatchPredictRequest, FeedbackRequest 
from .database import supabase
from .predictor import SentimentPredictor

app = FastAPI(
    title="Foody Sentiment Analysis API",
    description="API phân loại cảm xúc bình luận tiếng Việt sử dụng PhoBERT",
    version="1.0.0"
)

# Khai báo cấu hình CORS (Mở cổng cho ReactJS / Vite / Node.js)
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
        print("✅ Mô hình PhoBERT đã sẵn sàng!")
    except Exception as e:
        print(f"❌ Lỗi khi tải mô hình: {e}")

# =====================================================================
# HÀM BÓC TÁCH KHÍA CẠNH & CẢNH BÁO ĐỎ (ACTION REQUIRED)
# =====================================================================
ASPECT_DICT = {
    "Món ăn": ["mì cay", "trà sữa", "mặn", "nhạt", "nguội", "ngon", "dở", "sống", "cháy", "chua", "ngọt", "đậm đà", "vừa miệng", "đồ ăn", "nước lẩu", "thịt bò", "hải sản"],
    "Dịch vụ": ["nhân viên", "bảo vệ", "quản lý", "thái độ", "chậm", "lâu", "nhiệt tình", "chửi", "phục vụ", "order", "lên món", "giao hàng"],
    "Không gian": ["máy lạnh", "nóng", "bẩn", "dơ", "sạch", "chỗ để xe", "ồn ào", "rộng rãi", "thoáng mát", "nhà vệ sinh", "decor", "view"]
}

SENSITIVE_WORDS = ["ngộ độc", "đau bụng", "ruồi", "thái độ", "tẩy chay", "dị vật", "chửi", "tệ"]

def extract_insights(text: str, ai_label: int):
    text_lower = text.lower()
    found_aspects = set()
    found_keywords = []
    is_action_required = False
    
    # 1. Quét tìm khía cạnh và từ khóa
    for aspect, keywords in ASPECT_DICT.items():
        for kw in keywords:
            if kw in text_lower:
                found_aspects.add(aspect)
                found_keywords.append(kw)
                
    # 2. Check cảnh báo đỏ (Chỉ bật khi AI dán nhãn 0 - Tiêu cực VÀ có từ nhạy cảm)
    if ai_label == 0: 
        if any(bad_word in text_lower for bad_word in SENSITIVE_WORDS):
            is_action_required = True
            
    # Ép kiểu set() về list() để Supabase chấp nhận dạng mảng (Array)
    return list(found_aspects), list(set(found_keywords)), is_action_required


# =====================================================================
# API 1: DỰ ĐOÁN 1 CÂU BÌNH LUẬN (TEST NHANH)
# =====================================================================
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
# API 2: CUNG CẤP MỐC THỜI GIAN CHO BOT NODE.JS
# =====================================================================
@app.get("/api/last-scraped")
async def get_last_scraped(source_url: str, user_id: str):
    try:
        # Lấy ngày của bình luận mới nhất theo link và user
        response = supabase.table('scraped_reviews') \
            .select('review_date') \
            .eq('source_url', source_url) \
            .eq('user_id', user_id) \
            .order('review_date', desc=True) \
            .limit(1) \
            .execute()
        
        if len(response.data) > 0:
            return {"last_scraped_date": response.data[0]['review_date']}
        
        return {"last_scraped_date": None}
    except Exception as e:
        print("Lỗi truy vấn ngày cào:", e)
        return {"last_scraped_date": None}


# =====================================================================
# API 3: XỬ LÝ HÀNG LOẠT & LƯU DATABASE (CHUẨN SAAS)
# =====================================================================
@app.post("/predict/batch")
async def predict_batch(request: BatchPredictRequest):
    if predictor is None:
        raise HTTPException(status_code=503, detail="Mô hình chưa sẵn sàng. Vui lòng thử lại sau.")
        
    start_time = time.time()
    
    all_reviews = request.reviews
    total_reviews = len(all_reviews)
    results = []
    db_records = []

    # CHUNKING: Chia mảng lớn thành các mảng nhỏ (10 câu/lần) để chống văng RAM
    CHUNK_SIZE = 10 

    try:
        for i in range(0, total_reviews, CHUNK_SIZE):
            chunk_reviews = all_reviews[i : i + CHUNK_SIZE]
            
            for item in chunk_reviews:
                if not item.content.strip():
                    continue
                    
                # 1. Gọi AI dự đoán
                pred_result = predictor.predict(item.content)
                label = pred_result.label if hasattr(pred_result, 'label') else pred_result['label']
                confidence = pred_result.confidence if hasattr(pred_result, 'confidence') else pred_result['confidence']
                
                # 2. Bóc tách thông tin nâng cao (Aspect-based & Action Required)
                aspects, keywords, is_action = extract_insights(item.content, label)
                
                results.append({
                    "text": item.content,
                    "label": label,
                    "confidence": confidence
                })
                
                # 3. Gom dữ liệu vào Record để Insert Database
                db_records.append({
                    "content": item.content, 
                    "review_date": item.review_date,       # Ngày đăng
                    "ai_label": label, 
                    "confidence": confidence,
                    "aspects": aspects,                    # Mảng khía cạnh
                    "keywords": keywords,                  # Mảng từ khóa
                    "is_action_required": is_action,       # Cờ cảnh báo
                    "user_id": request.user_id,
                    "source_url": request.source_url 
                })

        # Giai đoạn 4: Bắn hàng loạt vào bảng scraped_reviews
        if db_records:
            try:
                supabase.table("scraped_reviews").insert(db_records).execute()
                print(f"✅ Đã lưu thành công {len(db_records)} bình luận đầy đủ thông số vào Database!")
            except Exception as db_error:
                print(f"❌ Lỗi khi lưu vào Supabase: {str(db_error)}")
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi trong quá trình xử lý mảng: {str(e)}")

    end_time = time.time()
    processing_time = round(end_time - start_time, 2)

    return {
        "results": results,
        "total_processed": len(results),
        "processing_time": f"{processing_time}s",
        "message": "Phân tích và bóc tách dữ liệu thành công"
    }


# =====================================================================
# API 4: VÒNG LẶP PHẢN HỒI (HUMAN-IN-THE-LOOP)
# =====================================================================
@app.post("/feedback")
async def save_feedback(request: FeedbackRequest):
    try:
        data, count = supabase.table("feedback_data").insert({
            "original_content": request.original_content,
            "old_ai_label": request.old_ai_label,
            "corrected_label": request.corrected_label,
            "user_id": request.user_id
        }).execute()
        
        return {
            "status": "success",
            "message": "Đã lưu đính chính thành công, cảm ơn bạn đã đóng góp dữ liệu!",
            "data": data[1] if data else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi lưu dữ liệu vào cơ sở dữ liệu: {str(e)}")

# ====================================================================
# API 5: BÁO ĐỘNG ĐỎ (ACTION REQUIRED)
# ====================================================================
@app.get("/api/dashboard/alerts")
async def get_dashboard_alerts(source_url: str, user_id: str):
    try:
        # Chỉ lấy những bình luận có cờ is_action_required = True, xếp mới nhất lên đầu
        response = supabase.table('scraped_reviews') \
            .select('id, content, review_date, keywords, ai_label') \
            .eq('source_url', source_url) \
            .eq('user_id', user_id) \
            .eq('is_action_required', True) \
            .order('review_date', desc=True) \
            .limit(20) \
            .execute()
            
        return {"alerts": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =====================================================================
# API 6 (GỘP): PHÂN TÍCH TỪ KHÓA (NUÔI CẢ LEADERBOARD VÀ WORD CLOUD)
# =====================================================================
@app.get("/api/dashboard/keyword-analytics")
async def get_keyword_analytics(user_id: str, source_url: Optional[str] = None):
    try:
        # 1. Query Database CHỈ 1 LẦN
        query = supabase.table('scraped_reviews').select('ai_label, keywords').eq('user_id', user_id)
        
        # Nếu có truyền link thì lọc theo link, nếu không thì lấy toàn bộ dữ liệu của user đó
        if source_url and source_url != "all":
            query = query.eq('source_url', source_url)
            
        response = query.execute()
        data = response.data
        
        pos_keywords = []
        neg_keywords = []
        
        # 2. Phân loại từ khóa
        for item in data:
            kws = item.get('keywords') or []
            if item['ai_label'] == 1:
                pos_keywords.extend(kws)
            else:
                neg_keywords.extend(kws)
                
        # 3. Đếm tần suất
        pos_counts = Counter(pos_keywords)
        neg_counts = Counter(neg_keywords)
        
        # ==========================================
        # ĐÓNG GÓI DỮ LIỆU CHO LEADERBOARD (Lấy Top 5)
        # ==========================================
        leaderboard_data = {
            "top_positive": [{"keyword": k.capitalize(), "count": v} for k, v in pos_counts.most_common(5)],
            "top_negative": [{"keyword": k.capitalize(), "count": v} for k, v in neg_counts.most_common(5)]
        }
        
        # ==========================================
        # ĐÓNG GÓI DỮ LIỆU CHO WORD CLOUD (Lấy Top 20)
        # ==========================================
        wordcloud_data = []
        for kw, count in pos_counts.most_common(20):
            wordcloud_data.append({"text": kw.capitalize(), "value": count * 10, "sentiment": "positive"})
            
        for kw, count in neg_counts.most_common(20):
            wordcloud_data.append({"text": kw.capitalize(), "value": count * 10, "sentiment": "negative"})
            
        # 4. Trả về 1 gói JSON chứa cả 2 cục data
        return {
            "leaderboard": leaderboard_data,
            "wordcloud": wordcloud_data
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))