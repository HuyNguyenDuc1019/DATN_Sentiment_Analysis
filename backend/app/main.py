from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import time
from collections import Counter  # Thêm thư viện để đếm từ khóa cho Leaderboard
from typing import Optional,Dict, Any
# Import cấu trúc dữ liệu từ file schemas.py
from .schemas import PredictRequest, PredictResponse, BatchPredictRequest, FeedbackRequest 
from .database import supabase
from .predictor import SentimentPredictor
from datetime import datetime, timedelta
from collections import defaultdict
from fastapi.responses import StreamingResponse
import io
import csv
from fastapi import HTTPException as FastAPIHTTPException

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
# HÀM BÓC TÁCH KHÍA CẠNH & CẢNH BÁO ĐỎ (ĐÃ NÂNG CẤP DÙNG TỪ ĐIỂN ĐỘNG)
# =====================================================================
def extract_insights(text: str, ai_label: int, dynamic_aspects: dict, sensitive_words_str: str, crisis_enabled: bool):
    text_lower = text.lower()
    found_aspects = set()
    found_keywords = []
    is_action_required = False
    
    # Dịch chuỗi từ cấm (ngăn cách bởi dấu phẩy) thành mảng (List)
    sensitive_words = [w.strip().lower() for w in sensitive_words_str.split(",") if w.strip()]
    
    # 1. Quét tìm khía cạnh theo từ điển động lấy từ Database
    if isinstance(dynamic_aspects, dict):
        for aspect, keywords in dynamic_aspects.items():
            for kw in keywords:
                kw_clean = kw.strip().lower()
                if kw_clean and kw_clean in text_lower:
                    found_aspects.add(aspect)
                    found_keywords.append(kw_clean)
                
    # 2. Check cảnh báo đỏ (Chỉ bật khi Admin gạt nút xanh VÀ AI dán nhãn 0 VÀ có từ nhạy cảm)
    if crisis_enabled and ai_label == 0: 
        if any(bad_word in text_lower for bad_word in sensitive_words):
            is_action_required = True
            
    return list(found_aspects), list(set(found_keywords)), is_action_required

# =====================================================================
# API 1: DỰ ĐOÁN 1 CÂU BÌNH LUẬN (TEST NHANH)
# =====================================================================
@app.post("/predict", response_model=PredictResponse)
async def predict_sentiment(request: PredictRequest):
    if predictor is None:
        raise HTTPException(status_code=503, detail="Mô hình chưa sẵn sàng.")
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Văn bản không để trống.")

    # --- TRẠM GÁC QUOTA (RATE LIMIT) ---
    try:
        # Lấy thông tin user (Giả sử bạn truyền thêm user_id vào PredictRequest, 
        # nếu request hiện tại chưa có user_id thì bạn cân nhắc thêm vào nhé)
        user_id = request.user_id 
        profile_res = supabase.table('profiles').select('tier').eq('id', user_id).single().execute()
        is_vip = profile_res.data and profile_res.data.get('tier') == 'vip'

        if not is_vip:
            # Đếm số lượng record đã tạo trong ngày hôm nay của user này
            today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0).isoformat()
            
            # Query đếm số dòng trong scraped_reviews tạo từ 0h sáng nay
            count_res = supabase.table('scraped_reviews').select('id', count='exact') \
                .eq('user_id', user_id) \
                .gte('created_at', today_start) \
                .execute()
            
            daily_usage = count_res.count if count_res.count else 0
            
            # Nếu vượt quá 100 lần, báo lỗi 429
            if daily_usage >= 100:
                raise HTTPException(status_code=429, detail="Bạn đã hết 100 lượt phân tích miễn phí hôm nay. Hãy nâng cấp VIP!")
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        # Nếu lỗi logic (vd không có user_id), tạm thời cho qua để không chết API

    # Phần dự đoán giữ nguyên
    try:
        result = predictor.predict(request.text)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi dự đoán: {str(e)}")
    
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
# API 3: XỬ LÝ HÀNG LOẠT & LƯU DATABASE (CHUẨN SAAS CÓ MERGE LOGIC)
# =====================================================================
@app.post("/predict/batch")
async def predict_batch(request: BatchPredictRequest):
    if predictor is None:
        raise HTTPException(status_code=503, detail="Mô hình chưa sẵn sàng. Vui lòng thử lại sau.")
        
    # 1. Trạm gác phân quyền
    profile = supabase.table('profiles').select('tier').eq('id', request.user_id).single().execute()
    is_vip = profile.data and profile.data.get('tier') == 'vip'

    if not is_vip and len(request.reviews) > 50:
        raise HTTPException(status_code=403, detail="Tài khoản Free chỉ phân tích tối đa 50 bình luận/lần. Vui lòng nâng cấp VIP!")

    # ==========================================
    # 2. KIẾN TRÚC ĐA NGƯỜI THUÊ: GỘP CẤU HÌNH ADMIN + USER VIP
    # ==========================================
    try:
        # A. Lấy cấu hình gốc của Admin (Global)
        settings_res = supabase.table("system_settings").select("*").eq("id", 1).single().execute()
        sys_settings = settings_res.data
        admin_aspects = sys_settings.get("aspect_dictionary", {})
        admin_sensitive = sys_settings.get("custom_dictionary", "")
        crisis_enabled = sys_settings.get("crisis_alert_enabled", True)
        
        # Biến chuẩn bị đưa vào AI
        dynamic_aspects = admin_aspects.copy()
        sensitive_words_str = admin_sensitive
        retention_days = 7 # Mặc định Free là 7

        # B. Lấy cấu hình riêng của User VIP (Tenant) và GỘP lại
        if is_vip:
            user_res = supabase.table('user_settings').select('*').eq('user_id', request.user_id).execute()
            
            if user_res.data and len(user_res.data) > 0:
                user_settings = user_res.data[0]
                
                # Gộp Từ cấm: Nối chuỗi Admin và User lại với nhau
                user_sensitive = user_settings.get("custom_sensitive_words", "")
                if user_sensitive:
                    sensitive_words_str = f"{admin_sensitive}, {user_sensitive}"
                
                # Gộp Khía cạnh: Duyệt qua từng ngành hàng của User
                user_aspects = user_settings.get("custom_aspects", {})
                if isinstance(user_aspects, dict):
                    for aspect, keywords in user_aspects.items():
                        if aspect in dynamic_aspects:
                            dynamic_aspects[aspect] = f"{dynamic_aspects[aspect]}, {keywords}" # Nối thêm từ
                        else:
                            dynamic_aspects[aspect] = keywords # Thêm khía cạnh mới tinh
                
                # Ghi đè thời gian lưu trữ
                retention_days = user_settings.get("retention_days", 30)
                
                # MỞ RỘNG: Lấy Ngưỡng độ nhạy tự chỉnh (Custom Threshold)
                user_threshold = user_settings.get("custom_threshold", 50) / 100.0

        else:
            # Xử lý tước quyền User Free
            dynamic_aspects = {}      # Tịch thu từ điển khía cạnh
            sensitive_words_str = ""  # Tịch thu từ cấm
            crisis_enabled = False    # Tắt cảnh báo đỏ
            
    except Exception as e:
        print(f"⚠️ Lỗi khi tải cấu hình từ DB, dùng mặc định. Chi tiết: {e}")
        dynamic_aspects = {}
        sensitive_words_str = ""
        crisis_enabled = is_vip
        retention_days = 7

    # ==========================================
    # 3. 🧹 TÍNH NĂNG DỌN RÁC TỰ ĐỘNG (DATA RETENTION)
    # ==========================================
    try:
        from datetime import datetime, timedelta
        cutoff_date = (datetime.now() - timedelta(days=retention_days)).isoformat()
        supabase.table("scraped_reviews").delete().eq("user_id", request.user_id).lt("created_at", cutoff_date).execute()
        print(f"🧹 Đã dọn dẹp các dữ liệu cũ hơn {retention_days} ngày của user {request.user_id}.")
    except Exception as cleanup_error:
        print(f"⚠️ Lỗi khi dọn rác: {cleanup_error}")

    # ==========================================
    # 4. QUÁ TRÌNH PHÂN TÍCH AI
    # ==========================================
    import time
    start_time = time.time()
    results = []
    db_records = []

    try:
        for item in request.reviews:
            if not item.content.strip():
                continue
                
            # Gọi AI dự đoán
            pred_result = predictor.predict(item.content)
            label = pred_result.label if hasattr(pred_result, 'label') else pred_result['label']
            confidence = pred_result.confidence if hasattr(pred_result, 'confidence') else pred_result['confidence']
            
            # (Tùy chọn) Ghi đè Label dựa trên Custom Threshold của VIP
            if is_vip and 'user_threshold' in locals():
                if confidence < user_threshold and label == "Tích cực":
                    label = "Tiêu cực" # AI tự tin thấp hơn mức User yêu cầu -> Đẩy xuống Tiêu cực

            # Bóc tách thông tin truyền cấu hình ĐÃ GỘP vào
            aspects, keywords, is_action = extract_insights(
                item.content, label, dynamic_aspects, sensitive_words_str, crisis_enabled
            )
            
            results.append({"text": item.content, "label": label, "confidence": confidence})
            db_records.append({
                "content": item.content, "review_date": item.review_date,
                "ai_label": label, "confidence": confidence,
                "aspects": aspects, "keywords": keywords,
                "is_action_required": is_action,
                "user_id": request.user_id, "source_url": request.source_url 
            })

        # Bắn hàng loạt vào bảng
        if db_records:
            supabase.table("scraped_reviews").insert(db_records).execute()
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi phân tích AI: {str(e)}")

    end_time = time.time()
    return {
        "results": results,
        "total_processed": len(results),
        "processing_time": f"{round(end_time - start_time, 2)}s",
        "message": "Phân tích và bóc tách dữ liệu thành công với cấu hình động cá nhân hóa!"
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
    # 1. Trạm gác: Kiểm tra Tier
    profile = supabase.table('profiles').select('tier').eq('id', user_id).single().execute()
    is_vip = profile.data and profile.data.get('tier') == 'vip'

    if not is_vip:
        raise HTTPException(status_code=403, detail="Tính năng Cảnh báo Đỏ chỉ dành cho tài khoản VIP.")
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
        # --- TRẠM GÁC: KIỂM TRA TIER TỪ DATABASE ---
        profile_res = supabase.table('profiles').select('tier').eq('id', user_id).single().execute()
        is_vip = profile_res.data and profile_res.data.get('tier') == 'vip'

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
        # ĐÓNG GÓI DỮ LIỆU CHO LEADERBOARD (Lấy Top 5 - Bất kỳ ai cũng xem được)
        # ==========================================
        leaderboard_data = {
            "top_positive": [{"keyword": k.capitalize(), "count": v} for k, v in pos_counts.most_common(5)],
            "top_negative": [{"keyword": k.capitalize(), "count": v} for k, v in neg_counts.most_common(5)]
        }
        
        # ==========================================
        # ĐÓNG GÓI DỮ LIỆU CHO WORD CLOUD (Chỉ VIP mới có data)
        # ==========================================
        wordcloud_data = []
        if is_vip:
            for kw, count in pos_counts.most_common(20):
                wordcloud_data.append({"text": kw.capitalize(), "value": count * 10, "sentiment": "positive"})
                
            for kw, count in neg_counts.most_common(20):
                wordcloud_data.append({"text": kw.capitalize(), "value": count * 10, "sentiment": "negative"})
                
        # 4. Trả về 1 gói JSON chứa cả 2 cục data
        return {
            "leaderboard": leaderboard_data,
            "wordcloud": wordcloud_data # Sẽ trả về mảng rỗng [] nếu là User Free
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    # Tạo model nhận dữ liệu


class UpgradeRequest(BaseModel):
    user_id: str
    amount: float = 99000 # Gắn cứng mặc định 99k
@app.put("/api/user/upgrade")
async def upgrade_to_vip(req: UpgradeRequest):
    try:
        update_res = (
            supabase
            .table('profiles')
            .update({'tier': 'vip'})
            .eq('id', req.user_id)
            .execute()
        )

        if not update_res.data:
            raise HTTPException(status_code=400, detail="Không tìm thấy người dùng.")

        transaction_data = {
            "user_id": req.user_id,
            "amount": req.amount,
            "status": "paid",
        }

        try:
            supabase.table('transactions').insert(transaction_data).execute()
        except Exception as transaction_error:
            print(f"⚠️ Không thể ghi giao dịch VIP: {transaction_error}")

        return {
            "status": "success",
            "message": "Nâng cấp VIP thành công!",
            "profile": update_res.data[0],
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    
# ==========================================
# 1. MODEL HỨNG DỮ LIỆU TỪ FRONTEND
# ==========================================
class UserSettingsUpdate(BaseModel):
    user_id: str
    custom_aspects: Optional[Dict[str, Any]] = None
    custom_sensitive_words: Optional[str] = None
    custom_threshold: Optional[float] = None
    use_custom_threshold: Optional[bool] = None
    alert_email: Optional[bool] = None
    weekly_report: Optional[bool] = None
    retention_days: Optional[int] = None

# ==========================================
# 2. API ĐỌC CẤU HÌNH (GET) - Chạy khi mở trang
# ==========================================
@app.get("/api/user/settings")
async def get_user_settings(user_id: str):
    try:
        # Lấy dữ liệu dưới dạng list
        res = supabase.table('user_settings').select('*').eq('user_id', user_id).execute()
        
        # Nếu mảng rỗng (User chưa từng lưu cài đặt bao giờ) -> Trả về mặc định
        if not res.data or len(res.data) == 0:
            return {
                "user_id": user_id, 
                "custom_threshold": 50,
                "custom_sensitive_words": "",
                "custom_aspects": {}, # Quan trọng: Tránh lỗi map() ở Frontend
                "alert_email": False,
                "weekly_report": True,
                "retention_days": 7
            }
            
        # Nếu đã có dữ liệu, trả về object đầu tiên trong mảng
        return res.data[0]
        
    except Exception as e:
        print(f"Lỗi API get_user_settings: {e}") 
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# 3. API LƯU CẤU HÌNH (PUT) - Chạy khi bấm nút Lưu
# ==========================================
@app.put("/api/user/settings")
async def update_user_settings(req: UserSettingsUpdate):
    try:
        # Lọc bỏ các trường None để chỉ update những gì được gửi lên
        # Dùng model_dump() nếu xài Pydantic V2, hoặc dict() cho bản cũ
        update_data = {k: v for k, v in req.dict().items() if v is not None and k != "user_id"}
        
        # SỬA LỖI: Cập nhật thời gian bằng Python thay vì string "now()"
        update_data['updated_at'] = datetime.utcnow().isoformat()
        
        # Upsert: Có rồi thì update, chưa có thì tạo mới
        res = supabase.table('user_settings').upsert({**update_data, "user_id": req.user_id}).execute()
        
        return {"status": "success", "message": "Đã lưu cài đặt thành công!"}
    except Exception as e:
        print(f"Lỗi API update_user_settings: {e}") 
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# 4. API XÓA TOÀN BỘ DỮ LIỆU (DELETE) - Chạy khi bấm nút Danger
# ==========================================
@app.delete("/api/user/data/clear")
async def clear_user_data(user_id: str):
    try:
        # Lệnh 1: Xóa toàn bộ bình luận đã cào của user này
        # (Thay 'scraped_reviews' bằng đúng tên bảng chứa data của bạn)
        res_reviews = supabase.table('scraped_reviews').delete().eq('user_id', user_id).execute()
        
        # Lệnh 2 (Tùy chọn): Xóa các bản ghi đính chính tay trong bảng feedback (nếu có)
        # res_feedback = supabase.table('feedback').delete().eq('user_id', user_id).execute()

        return {"status": "success", "message": "Toàn bộ dữ liệu phân tích đã được dọn dẹp vĩnh viễn."}
    
    except Exception as e:
        print(f"Lỗi API clear_user_data: {e}")
        raise HTTPException(status_code=500, detail="Không thể xóa dữ liệu. Vui lòng thử lại sau.")
# =====================================================================
# 1. DATA MODELS (KHUÔN DỮ LIỆU) CHO CÁC API ADMIN
# =====================================================================
class AdminActionRequest(BaseModel):
    admin_id: str
    target_user_id: str
    action: str  # ban, unban, upgrade_vip, downgrade_vip

class AdminFeedbackReview(BaseModel):
    admin_id: str
    feedback_id: str
    action: str  # approve, reject

class AdminSettingUpdate(BaseModel):
    admin_id: str
    ai_threshold: float
    max_upload_size_free: int
    custom_dictionary: str        
    crisis_alert_enabled: bool 
    aspect_dictionary: dict   
    data_retention_days: int

# =====================================================================
# 2. HÀM BẢO VỆ (TRẠM GÁC): KIỂM TRA QUYỀN ADMIN
# =====================================================================
def check_is_admin(user_id: str):
    try:
        response = supabase.table('profiles').select('role').eq('id', user_id).execute()
        if not response.data or response.data[0]['role'] != 'admin':
            raise HTTPException(status_code=403, detail="Cảnh báo: Lĩnh vực tuyệt mật! Bạn không có quyền Admin.")
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Lỗi kiểm tra quyền truy cập.")

# =====================================================================
# 3. NHÓM API QUẢN LÝ TÀI KHOẢN NGƯỜI DÙNG (USER MANAGEMENT)
# =====================================================================

# API: Lấy danh sách toàn bộ người dùng
@app.get("/api/admin/users")
async def get_admin_users(admin_id: str):
    check_is_admin(admin_id)
    try:
        res = supabase.table('profiles').select('*').execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# API: Thay đổi trạng thái (Khóa/Mở khóa) hoặc Gói dịch vụ (VIP/Free)
@app.put("/api/admin/users/action")
async def update_user_action(request: AdminActionRequest):
    check_is_admin(request.admin_id)
    
    # Dịch hành động (action) từ Frontend sang cấu trúc dữ liệu lưu vào DB
    update_payload = {}
    if request.action == "ban":
        update_payload = {"status": "blocked"}  # Đồng bộ khớp với trạng thái blocked ở Frontend
    elif request.action == "unban":
        update_payload = {"status": "active"}   # Đồng bộ khớp với trạng thái active ở Frontend
    elif request.action == "upgrade_vip":
        update_payload = {"tier": "vip"}
    elif request.action == "downgrade_vip":
        update_payload = {"tier": "free"}
    else:
        raise HTTPException(status_code=400, detail="Hành động không hợp lệ!")

    try:
        res = supabase.table('profiles').update(update_payload).eq('id', request.target_user_id).execute()
        return {"status": "success", "message": f"Đã thực hiện thao tác {request.action} thành công.", "updated_data": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =====================================================================
# 4. NHÓM API QUẢN LÝ PHẢN HỒI NHÃN & MLOps (FEEDBACK MANAGEMENT)
# =====================================================================

# API: Lấy danh sách phản hồi (Tối ưu kết hợp bảng để lấy thông tin Email, Tên hiển thị)
@app.get("/api/admin/feedback")
async def get_admin_feedbacks(admin_id: str):
    check_is_admin(admin_id)

    try:
        # 1. Lấy toàn bộ feedback
        feedback_res = (
            supabase
            .table("feedback_data")
            .select("*")
            .order("created_at", desc=True)
            .execute()
        )

        feedback_rows = feedback_res.data or []

        # 2. Lấy toàn bộ user để lấy email và tên
        profiles_res = (
            supabase
            .table("profiles")
            .select("id, email, full_name")
            .execute()
        )

        profiles_dict = {
            p["id"]: p
            for p in (profiles_res.data or [])
        }

        # 3. Lấy toàn bộ review có confidence
        reviews_res = (
            supabase
            .table("scraped_reviews")
            .select("id, user_id, content, ai_label, confidence, created_at")
            .order("created_at", desc=True)
            .execute()
        )

        reviews = reviews_res.data or []

        # 4. Tạo lookup theo user_id + content + ai_label
        review_lookup = {}

        for review in reviews:
            key = (
                review.get("user_id"),
                (review.get("content") or "").strip().lower(),
                str(review.get("ai_label"))
            )

            if key not in review_lookup:
                review_lookup[key] = review.get("confidence")

        # 5. Gắn profiles + ai_confidence vào từng feedback
        result = []

        for item in feedback_rows:
            item["profiles"] = profiles_dict.get(item.get("user_id"))

            key = (
                item.get("user_id"),
                (item.get("original_content") or "").strip().lower(),
                str(item.get("old_ai_label"))
            )

            item["ai_confidence"] = review_lookup.get(key)

            result.append(item)

        return result

    except Exception as e:
        print(f"⚠️ LỖI API FEEDBACK: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# API: Duyệt hoặc từ chối nhãn hiệu chỉnh dữ liệu từ người dùng
@app.put("/api/admin/feedback/review")
async def review_feedback(request: AdminFeedbackReview):
    check_is_admin(request.admin_id)
    try:
        status = "approved" if request.action == "approve" else "rejected"
        supabase.table('feedback_data').update({"status": status}).eq('id', request.feedback_id).execute()
        return {"status": "success", "message": f"Đã thực hiện {status} mẫu dữ liệu này thành công."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# API: Xuất tập dữ liệu đã qua kiểm duyệt thành file CSV sạch để Re-train Model AI
@app.get("/api/admin/dataset/export")
async def export_retrain_dataset(admin_id: str):
    check_is_admin(admin_id)
    try:
        response = supabase.table('feedback_data').select('original_content, corrected_label').eq('status', 'approved').execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Chưa có dữ liệu nào được duyệt để xuất bộ dữ liệu.")

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['text', 'label'])
        for item in response.data:
            writer.writerow([item['original_content'], item['corrected_label']])
        output.seek(0)
        
        return StreamingResponse(
            iter([output.getvalue()]), 
            media_type="text/csv", 
            headers={"Content-Disposition": "attachment; filename=phobert_retrain_dataset.csv"}
        )
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=str(e))

# =====================================================================
# 5. NHÓM API QUẢN TRỊ CÀI ĐẶT LÕI HỆ THỐNG (SYSTEM SETTINGS)
# =====================================================================

# API: Tải cấu hình hệ thống hiện tại lên giao diện Admin
@app.get("/api/admin/settings")
async def get_system_settings(admin_id: str):
    check_is_admin(admin_id)
    try:
        res = supabase.table('system_settings').select('*').eq('id', 1).execute()
        if not res.data:
            return {
                "ai_threshold": 0.75, 
                "max_upload_size_free": 5,
                "data_retention_days": 30,
                "custom_dictionary": "",
                "crisis_alert_enabled": True,
                "aspect_dictionary": {}
            }
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# API: Lưu và cập nhật toàn diện cấu hình hệ thống (Vá lỗi đồng bộ từ điển & Vòng đời dữ liệu)
@app.put("/api/admin/settings")
async def update_system_settings(request: AdminSettingUpdate):
    check_is_admin(request.admin_id)
    try:
        supabase.table('system_settings').update({
            "ai_threshold": request.ai_threshold,
            "max_upload_size_free": request.max_upload_size_free,
            "custom_dictionary": request.custom_dictionary,
            "crisis_alert_enabled": request.crisis_alert_enabled,
            "aspect_dictionary": request.aspect_dictionary,
            "data_retention_days": request.data_retention_days
        }).eq('id', 1).execute()
        return {"status": "success", "message": "Đã cập nhật cấu hình hệ thống toàn diện!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =====================================================================
# 6. NHÓM API THỐNG KÊ BIỂU ĐỒ & ĐIỀU HÀNH (METRICS & DASHBOARD)
# =====================================================================

# API: Thống kê số liệu tổng quan trên màn hình Bảng điều khiển
@app.get("/api/admin/metrics")
async def get_admin_metrics(admin_id: str):
    check_is_admin(admin_id)
    try:
        reviews_res = supabase.table('scraped_reviews').select('ai_label', count='exact').execute()
        users_res = supabase.table('profiles').select('id', count='exact').execute()
        feedback_res = supabase.table('feedback_data').select('id', count='exact').eq('status', 'pending').execute()

        data = reviews_res.data
        total_reviews = len(data)
        positive_count = sum(1 for item in data if item['ai_label'] == 1)
        
        return {
            "total_api_calls": total_reviews,
            "total_users": users_res.count if hasattr(users_res, 'count') else 0,
            "pending_feedbacks": feedback_res.count if hasattr(feedback_res, 'count') else 0,
            "global_positive_ratio": round((positive_count / total_reviews) * 100, 1) if total_reviews > 0 else 0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# API: Thống kê lưu lượng cuộc gọi theo từng ngày phục vụ vẽ biểu đồ đường (Line Chart)

@app.get("/api/admin/metrics/sentiment-chart")
async def get_admin_sentiment_chart(admin_id: str, days: int = 7):
    from collections import defaultdict
    from datetime import datetime, timedelta, timezone
    from fastapi import HTTPException as FastAPIHTTPException

    try:
        safe_days = max(int(days), 1)
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=safe_days - 1)

        response = (
            supabase
            .table("scraped_reviews")
            .select("ai_label, created_at")
            .gte("created_at", start_date.isoformat())
            .lte("created_at", end_date.isoformat())
            .execute()
        )

        rows = response.data or []

        grouped = defaultdict(lambda: {
            "positive": 0,
            "negative": 0,
            "total": 0,
        })

        for index in range(safe_days):
            day = (start_date + timedelta(days=index)).date().isoformat()
            grouped[day]

        for row in rows:
            created_at = row.get("created_at")
            if not created_at:
                continue

            date_key = str(created_at)[:10]
            label = row.get("ai_label")

            if int(label or 0) == 1:
                grouped[date_key]["positive"] += 1
            else:
                grouped[date_key]["negative"] += 1

            grouped[date_key]["total"] += 1

        chart_data = [
            {
                "date": date,
                "positive": values["positive"],
                "negative": values["negative"],
                "total": values["total"],
            }
            for date, values in sorted(grouped.items())
        ]

        return {
            "chart_data": chart_data,
        }

    except Exception as error:
        raise FastAPIHTTPException(status_code=500, detail=str(error))
    
        # =====================================================================
# 7. NHÓM API MỞ RỘNG CHO "QUẢN LÝ PHẢN HỒI":
#    Modal chi tiết, Hành động hàng loạt, Xuất CSV theo lựa chọn,
#    và liên kết Confidence (Cách A: join qua scraped_review_id).
#    -> TOÀN BỘ PHẦN NÀY LÀ THÊM MỚI, KHÔNG ĐỤNG CODE CŨ Ở TRÊN.
#
#    Yêu cầu Supabase (chạy 1 lần trong SQL Editor):
#    ALTER TABLE feedback_data ADD COLUMN IF NOT EXISTS review_history jsonb DEFAULT '[]'::jsonb;
#    ALTER TABLE feedback_data ADD COLUMN IF NOT EXISTS scraped_review_id uuid REFERENCES scraped_reviews(id);
# =====================================================================

class AdminFeedbackDetailReview(BaseModel):
    admin_id: str
    feedback_id: str
    action: str                        # "approve" | "reject" | "edit_label"
    reason: Optional[str] = None       # bắt buộc khi reject/edit_label
    new_label: Optional[int] = None    # dùng khi action = "edit_label"


class AdminFeedbackBulkReview(BaseModel):
    admin_id: str
    feedback_ids: list[str]
    action: str                        # "approve" | "reject" | "edit_label" | "delete"
    reason: Optional[str] = None
    new_label: Optional[int] = None


class AdminFeedbackExportSelected(BaseModel):
    admin_id: str
    feedback_ids: list[str]


# ====== MỚI (Cách A): model cho việc FE gắn scraped_review_id sau khi tạo feedback ======
class FeedbackLinkSource(BaseModel):
    user_id: str
    scraped_review_id: str


def _append_review_history(feedback_id: str, entry: dict):
    """Đọc review_history hiện có rồi nối thêm entry mới.
    Nếu cột review_history chưa được tạo trên Supabase, hàm bỏ qua êm
    để không làm vỡ luồng duyệt/từ chối chính."""
    try:
        current = supabase.table('feedback_data').select('review_history').eq('id', feedback_id).single().execute()
        history = (current.data or {}).get('review_history') or []
        history.append(entry)
        supabase.table('feedback_data').update({"review_history": history}).eq('id', feedback_id).execute()
    except Exception as e:
        print(f"⚠️ Không thể ghi review_history (có thể cột chưa tồn tại trên Supabase): {e}")


# ====== MỚI (Cách A): API để FE gọi ngay sau khi POST /feedback thành công,
#         gắn scraped_review_id vào dòng feedback vừa tạo -> cho phép join confidence sau này.
#         Không đụng gì tới endpoint /feedback cũ. ======
@app.put("/api/feedback/{feedback_id}/link-source")
async def link_feedback_source(feedback_id: str, request: FeedbackLinkSource):
    try:
        current = supabase.table('feedback_data').select('user_id').eq('id', feedback_id).single().execute()
        if not current.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy phản hồi này.")

        # Chỉ cho phép chính chủ phản hồi gắn nguồn cho dòng của mình (không phải admin-only)
        if current.data.get('user_id') != request.user_id:
            raise HTTPException(status_code=403, detail="Bạn không có quyền cập nhật phản hồi này.")

        supabase.table('feedback_data').update({
            "scraped_review_id": request.scraped_review_id
        }).eq('id', feedback_id).execute()

        return {"status": "success", "message": "Đã liên kết nguồn gốc phản hồi thành công."}
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))


# ====== MỚI (Cách A): trả về map { feedback_id: confidence } cho toàn bộ phản hồi có scraped_review_id
#         -> FE dùng để hiển thị cột "Độ tin cậy" cho cả bảng, không cần sửa loadFeedback cũ. ======
@app.get("/api/admin/feedback/confidence-map")
async def get_feedback_confidence_map(admin_id: str):
    check_is_admin(admin_id)
    try:
        feedback_res = (
            supabase.table('feedback_data')
            .select('id, scraped_review_id')
            .not_.is_('scraped_review_id', 'null')
            .execute()
        )
        rows = feedback_res.data or []
        review_ids = list({row['scraped_review_id'] for row in rows if row.get('scraped_review_id')})

        if not review_ids:
            return {}

        reviews_res = supabase.table('scraped_reviews').select('id, confidence').in_('id', review_ids).execute()
        confidence_by_review = {r['id']: r.get('confidence') for r in (reviews_res.data or [])}

        result = {}
        for row in rows:
            rid = row.get('scraped_review_id')
            if rid and rid in confidence_by_review:
                result[row['id']] = confidence_by_review[rid]

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
# =====================================================================
# 5. NHÓM API Để Admin lấy danh sách Giao dịch
# =====================================================================
@app.get("/api/admin/transactions")
async def get_admin_transactions(admin_id: str):
    try:
        # 1. Trạm gác: Kiểm tra quyền Admin
        profile = supabase.table('profiles').select('role').eq('id', admin_id).single().execute()
        if not profile.data or profile.data.get('role') != 'admin':
            raise HTTPException(status_code=403, detail="Chỉ Admin mới có quyền xem giao dịch.")

        # 2. Lấy dữ liệu giao dịch kèm thông tin người dùng
        # Cú pháp profiles(...) giúp lấy chéo dữ liệu từ bảng profiles
        res = supabase.table('transactions') \
            .select('id, amount, status, created_at, profiles(email, full_name)') \
            .order('created_at', desc=True) \
            .execute()
            
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# API: Lấy chi tiết đầy đủ 1 phản hồi cho Modal (kèm review_history + confidence join qua scraped_review_id)
@app.get("/api/admin/feedback/{feedback_id}/detail")
async def get_admin_feedback_detail(feedback_id: str, admin_id: str):
    check_is_admin(admin_id)

    try:
        res = (
            supabase
            .table("feedback_data")
            .select("*")
            .eq("id", feedback_id)
            .single()
            .execute()
        )

        if not res.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy phản hồi này.")

        item = res.data

        profile_res = (
            supabase
            .table("profiles")
            .select("id, email, full_name")
            .eq("id", item.get("user_id"))
            .execute()
        )

        item["profiles"] = profile_res.data[0] if profile_res.data else None
        item["review_history"] = item.get("review_history") or []
        item["ai_confidence"] = None

        # Cách 1: lấy theo scraped_review_id nếu có
        if item.get("scraped_review_id"):
            review_res = (
                supabase
                .table("scraped_reviews")
                .select("confidence")
                .eq("id", item.get("scraped_review_id"))
                .execute()
            )

            if review_res.data:
                item["ai_confidence"] = review_res.data[0].get("confidence")

        # Cách 2: fallback theo user_id + nội dung + nhãn AI cũ
        if item["ai_confidence"] is None:
            review_res = (
                supabase
                .table("scraped_reviews")
                .select("confidence, created_at")
                .eq("user_id", item.get("user_id"))
                .eq("content", item.get("original_content"))
                .eq("ai_label", item.get("old_ai_label"))
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )

            if review_res.data:
                item["ai_confidence"] = review_res.data[0].get("confidence")

        # Cách 3: fallback cuối nếu label không khớp kiểu dữ liệu
        if item["ai_confidence"] is None:
            review_res = (
                supabase
                .table("scraped_reviews")
                .select("confidence, created_at")
                .eq("user_id", item.get("user_id"))
                .eq("content", item.get("original_content"))
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )

            if review_res.data:
                item["ai_confidence"] = review_res.data[0].get("confidence")

        return item

    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))

# API: Duyệt / Từ chối / Sửa nhãn có lý do (dùng cho Modal chi tiết) + ghi lịch sử
@app.put("/api/admin/feedback/review-detailed")
async def review_feedback_detailed(request: AdminFeedbackDetailReview):
    check_is_admin(request.admin_id)

    if request.action in ("reject", "edit_label") and not (request.reason and request.reason.strip()):
        raise HTTPException(status_code=400, detail="Vui lòng nhập lý do trước khi từ chối hoặc sửa nhãn.")

    try:
        current = supabase.table('feedback_data').select('corrected_label, status').eq('id', request.feedback_id).single().execute()
        if not current.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy phản hồi này.")

        previous_label = current.data.get('corrected_label')
        previous_status = current.data.get('status')

        update_payload = {}
        if request.action == "approve":
            update_payload["status"] = "approved"
        elif request.action == "reject":
            update_payload["status"] = "rejected"
        elif request.action == "edit_label":
            if request.new_label is None:
                raise HTTPException(status_code=400, detail="Thiếu nhãn mới (new_label).")
            update_payload["corrected_label"] = request.new_label
        else:
            raise HTTPException(status_code=400, detail="Hành động không hợp lệ!")

        supabase.table('feedback_data').update(update_payload).eq('id', request.feedback_id).execute()

        _append_review_history(request.feedback_id, {
            "admin_id": request.admin_id,
            "action": request.action,
            "reason": request.reason,
            "previous_label": previous_label,
            "previous_status": previous_status,
            "new_label": request.new_label,
            "timestamp": datetime.utcnow().isoformat(),
        })

        return {"status": "success", "message": "Đã cập nhật phản hồi thành công."}
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))


# API: Hành động hàng loạt (duyệt / từ chối / sửa nhãn / xóa nhiều mục cùng lúc)
@app.put("/api/admin/feedback/bulk-review")
async def bulk_review_feedback(request: AdminFeedbackBulkReview):
    check_is_admin(request.admin_id)

    if not request.feedback_ids:
        raise HTTPException(status_code=400, detail="Chưa chọn phản hồi nào.")

    if request.action in ("reject", "edit_label") and not (request.reason and request.reason.strip()):
        raise HTTPException(status_code=400, detail="Vui lòng nhập lý do trước khi từ chối/sửa nhãn hàng loạt.")

    try:
        if request.action == "delete":
            supabase.table('feedback_data').delete().in_('id', request.feedback_ids).execute()
            return {"status": "success", "message": f"Đã xóa {len(request.feedback_ids)} phản hồi."}

        update_payload = {}
        if request.action == "approve":
            update_payload["status"] = "approved"
        elif request.action == "reject":
            update_payload["status"] = "rejected"
        elif request.action == "edit_label":
            if request.new_label is None:
                raise HTTPException(status_code=400, detail="Thiếu nhãn mới (new_label).")
            update_payload["corrected_label"] = request.new_label
        else:
            raise HTTPException(status_code=400, detail="Hành động không hợp lệ!")

        supabase.table('feedback_data').update(update_payload).in_('id', request.feedback_ids).execute()

        for fid in request.feedback_ids:
            _append_review_history(fid, {
                "admin_id": request.admin_id,
                "action": f"bulk_{request.action}",
                "reason": request.reason,
                "new_label": request.new_label,
                "timestamp": datetime.utcnow().isoformat(),
            })

        return {"status": "success", "message": f"Đã xử lý {len(request.feedback_ids)} phản hồi ({request.action})."}
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))


# API: Xuất CSV chỉ những phản hồi được chọn tick (khác export dataset retrain vốn chỉ lấy approved)
@app.post("/api/admin/feedback/export-selected")
async def export_selected_feedback(request: AdminFeedbackExportSelected):
    check_is_admin(request.admin_id)
    try:
        if not request.feedback_ids:
            raise HTTPException(status_code=400, detail="Chưa chọn phản hồi nào để xuất.")

        response = supabase.table('feedback_data').select('*').in_('id', request.feedback_ids).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy dữ liệu để xuất.")

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['id', 'original_content', 'old_ai_label', 'corrected_label', 'status', 'user_id', 'created_at'])
        for item in response.data:
            writer.writerow([
                item.get('id'), item.get('original_content'), item.get('old_ai_label'),
                item.get('corrected_label'), item.get('status'), item.get('user_id'), item.get('created_at'),
            ])
        output.seek(0)

        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=selected_feedback_export.csv"}
        )
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))
    # =====================================================================
# API BỔ SUNG: LẤY ĐỘ TIN CẬY CHO ADMIN FEEDBACK
# Chỉ thêm mới, không đổi UI / logic cũ
# =====================================================================

# =====================================================================
# API BỔ SUNG: RETRAIN FLAG + EXPORT DATASET NÂNG CAO
# =====================================================================

class AdminRetrainFlagRequest(BaseModel):
    admin_id: str
    feedback_id: str
    include_retrain: bool


class AdminAdvancedDatasetExportRequest(BaseModel):
    admin_id: str
    mode: str = "all"  # all | mismatch | low_confidence
    low_confidence_threshold: float = 0.5


@app.put("/api/admin/feedback/retrain-flag")
async def update_feedback_retrain_flag(request: AdminRetrainFlagRequest):
    check_is_admin(request.admin_id)

    try:
        supabase.table("feedback_data").update({
            "include_retrain": request.include_retrain
        }).eq("id", request.feedback_id).execute()

        return {
            "status": "success",
            "message": "Đã cập nhật cờ retrain."
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# API BỔ SUNG CHO TRANG ADMIN USERS
# - Thống kê hoạt động dữ liệu theo từng user
# - Lịch sử thao tác quản trị theo từng user
# Thêm đoạn này vào CUỐI file main.py
# =====================================================================

@app.get("/api/admin/users/activity-summary")
async def get_admin_users_activity_summary(admin_id: str):
    check_is_admin(admin_id)

    try:
        summary = {}

        reviews_res = (
            supabase
            .table("scraped_reviews")
            .select("user_id, created_at")
            .execute()
        )

        for row in reviews_res.data or []:
            user_id = row.get("user_id")
            if not user_id:
                continue

            if user_id not in summary:
                summary[user_id] = {
                    "review_count": 0,
                    "feedback_count": 0,
                    "last_activity_at": None,
                }

            summary[user_id]["review_count"] += 1

            created_at = row.get("created_at")
            if created_at and (
                not summary[user_id]["last_activity_at"]
                or str(created_at) > str(summary[user_id]["last_activity_at"])
            ):
                summary[user_id]["last_activity_at"] = created_at

        feedback_res = (
            supabase
            .table("feedback_data")
            .select("user_id, created_at")
            .execute()
        )

        for row in feedback_res.data or []:
            user_id = row.get("user_id")
            if not user_id:
                continue

            if user_id not in summary:
                summary[user_id] = {
                    "review_count": 0,
                    "feedback_count": 0,
                    "last_activity_at": None,
                }

            summary[user_id]["feedback_count"] += 1

            created_at = row.get("created_at")
            if created_at and (
                not summary[user_id]["last_activity_at"]
                or str(created_at) > str(summary[user_id]["last_activity_at"])
            ):
                summary[user_id]["last_activity_at"] = created_at

        return {"summary": summary}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/admin/users/{user_id}/activity-history")
async def get_admin_user_activity_history(user_id: str, admin_id: str, limit: int = 20):
    check_is_admin(admin_id)

    try:
        safe_limit = max(1, min(int(limit or 20), 50))

        logs_res = (
            supabase
            .table("admin_activity_logs")
            .select("id, admin_id, admin_name, action_type, target_type, target_id, description, created_at")
            .eq("target_id", user_id)
            .order("created_at", desc=True)
            .limit(safe_limit)
            .execute()
        )

        return {"logs": logs_res.data or []}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
