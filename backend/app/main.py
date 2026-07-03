from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import time
from collections import Counter  # Thêm thư viện để đếm từ khóa cho Leaderboard
from typing import Optional
# Import cấu trúc dữ liệu từ file schemas.py
from .schemas import PredictRequest, PredictResponse, BatchPredictRequest, FeedbackRequest 
from .database import supabase
from .predictor import SentimentPredictor
from datetime import datetime, timedelta
from collections import defaultdict
from fastapi.responses import StreamingResponse
import io
import csv

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
# API 3: XỬ LÝ HÀNG LOẠT & LƯU DATABASE (CHUẨN SAAS)
# =====================================================================
@app.post("/predict/batch")
async def predict_batch(request: BatchPredictRequest):
    if predictor is None:
        raise HTTPException(status_code=503, detail="Mô hình chưa sẵn sàng. Vui lòng thử lại sau.")
    # 1. Trạm gác
    profile = supabase.table('profiles').select('tier').eq('id', request.user_id).single().execute()
    is_vip = profile.data and profile.data.get('tier') == 'vip'

    # Chặn nếu file quá dài (Free max 50 dòng)
    if not is_vip and len(request.reviews) > 50:
        raise HTTPException(status_code=403, detail="Tài khoản Free chỉ phân tích tối đa 50 bình luận/lần. Vui lòng nâng cấp VIP!")
    # 1. NẠP CẤU HÌNH HỆ THỐNG TỪ DATABASE
    try:
        settings_res = supabase.table("system_settings").select("*").eq("id", 1).single().execute()
        sys_settings = settings_res.data
        dynamic_aspects = sys_settings.get("aspect_dictionary", {})
        sensitive_words_str = sys_settings.get("custom_dictionary", "")
        crisis_enabled = sys_settings.get("crisis_alert_enabled", True)
        retention_days = sys_settings.get("data_retention_days", 30) # Lấy cấu hình số ngày dọn rác
    except Exception as e:
        print(f"⚠️ Lỗi khi tải cấu hình từ DB, dùng mặc định. Chi tiết: {e}")
        dynamic_aspects = {}
        sensitive_words_str = ""
        crisis_enabled = True
        retention_days = 30

    # ==========================================
    # 🧹 TÍNH NĂNG DỌN RÁC TỰ ĐỘNG (DATA RETENTION)
    # ==========================================
    try:
        from datetime import datetime, timedelta
        # Tính ra mốc thời gian quá khứ (Ví dụ: Ngày hiện tại trừ đi 30 ngày)
        cutoff_date = (datetime.now() - timedelta(days=retention_days)).isoformat()
        
        # Lệnh dọn dẹp: Tìm những dòng của user này có ngày tạo nhỏ hơn mốc thời gian và xóa sạch
        supabase.table("scraped_reviews").delete().eq("user_id", request.user_id).lt("created_at", cutoff_date).execute()
        print(f"🧹 Đã dọn dẹp các dữ liệu cũ hơn {retention_days} ngày của user {request.user_id}.")
    except Exception as cleanup_error:
        print(f"⚠️ Lỗi khi dọn rác (không ảnh hưởng luồng chính): {cleanup_error}")
    # 2. Xử lý logic bóc lột quyền lợi của User Free
    if not is_vip:
        dynamic_aspects = {}      # Tịch thu từ điển khía cạnh
        sensitive_words_str = ""  # Tịch thu từ cấm
        crisis_enabled = False    # Tắt cảnh báo đỏ
        retention_days = 7        # Chỉ lưu data 7 ngày thay vì 30 ngày
    # ==========================================
    # QUÁ TRÌNH PHÂN TÍCH AI (Giữ nguyên như cũ)
    # ==========================================
    start_time = time.time()
    all_reviews = request.reviews
    total_reviews = len(all_reviews)
    results = []
    db_records = []
    CHUNK_SIZE = 10 

    try:
        for i in range(0, total_reviews, CHUNK_SIZE):
            chunk_reviews = all_reviews[i : i + CHUNK_SIZE]
            
            for item in chunk_reviews:
                if not item.content.strip():
                    continue
                    
                # Gọi AI dự đoán
                pred_result = predictor.predict(item.content)
                label = pred_result.label if hasattr(pred_result, 'label') else pred_result['label']
                confidence = pred_result.confidence if hasattr(pred_result, 'confidence') else pred_result['confidence']
                
                # Bóc tách thông tin truyền cấu hình động vào
                aspects, keywords, is_action = extract_insights(
                    item.content, label, dynamic_aspects, sensitive_words_str, crisis_enabled
                )
                
                results.append({
                    "text": item.content,
                    "label": label,
                    "confidence": confidence
                })
                
                # Gom dữ liệu vào Record
                db_records.append({
                    "content": item.content, 
                    "review_date": item.review_date,
                    "ai_label": label, 
                    "confidence": confidence,
                    "aspects": aspects,
                    "keywords": keywords,
                    "is_action_required": is_action,
                    "user_id": request.user_id,
                    "source_url": request.source_url 
                })

        # Bắn hàng loạt vào bảng scraped_reviews
        if db_records:
            try:
                supabase.table("scraped_reviews").insert(db_records).execute()
                print(f"✅ Đã lưu thành công {len(db_records)} bình luận vào Database!")
            except Exception as db_error:
                print(f"❌ Lỗi khi lưu vào Supabase: {str(db_error)}")
                raise HTTPException(status_code=400, detail=f"Lỗi Database: {str(db_error)}")
                
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Lỗi trong quá trình xử lý mảng: {str(e)}")

    end_time = time.time()
    processing_time = round(end_time - start_time, 2)

    return {
        "results": results,
        "total_processed": len(results),
        "processing_time": f"{processing_time}s",
        "message": "Phân tích và bóc tách dữ liệu thành công với cấu hình động!"
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
        # 1. Cập nhật tier thành 'vip'
        update_res = supabase.table('profiles').update({'tier': 'vip'}).eq('id', req.user_id).execute()
        if not update_res.data:
            raise HTTPException(status_code=400, detail="Không tìm thấy người dùng.")
            
        # 2. Ghi nhận giao dịch vào bảng transactions
        transaction_data = {
            "user_id": req.user_id,
            "amount": req.amount,
            "status": "paid"
        }
        supabase.table('transactions').insert(transaction_data).execute()
            
        return {"status": "success", "message": "Nâng cấp VIP thành công!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
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
        # 1. Lấy toàn bộ phản hồi
        feedback_res = supabase.table('feedback_data').select('*').order('created_at', desc=True).execute()
        
        # 2. Lấy toàn bộ user để lấy Email và Tên
        profiles_res = supabase.table('profiles').select('id, email, full_name').execute()
        
        # 3. Biến danh sách user thành một cuốn từ điển để tìm kiếm cho nhanh
        profiles_dict = {p['id']: p for p in profiles_res.data} if profiles_res.data else {}
        
        # 4. Gắn thông tin profile vào từng cái feedback
        result = []
        if feedback_res.data:
            for item in feedback_res.data:
                # Tạo ra một trường 'profiles' ảo để Frontend đọc được
                item['profiles'] = profiles_dict.get(item.get('user_id'))
                result.append(item)
                
        return result
    except Exception as e:
        # In lỗi ra Terminal để nếu có sai sót mình còn dễ bắt bệnh
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
@app.get("/api/admin/metrics/chart")
async def get_admin_metrics_chart(admin_id: str, days: int = 7):
    check_is_admin(admin_id)
    try:
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        start_date_iso = start_date.isoformat()

        response = supabase.table('scraped_reviews') \
            .select('review_date') \
            .gte('review_date', start_date_iso) \
            .execute()
            
        data = response.data
        daily_counts = defaultdict(int)
        
        # Khởi tạo giá trị nền bằng 0 để tránh đứt gãy dữ liệu ngày trống
        for i in range(days):
            day_str = (end_date - timedelta(days=i)).strftime('%Y-%m-%d')
            daily_counts[day_str] = 0
            
        for item in data:
            if item.get('review_date'):
                date_str = str(item['review_date'])[:10] 
                if date_str in daily_counts:
                    daily_counts[date_str] += 1
                    
        chart_data = [
            {"date": date, "api_calls": count} 
            for date, count in sorted(daily_counts.items())
        ]
        
        return {"chart_data": chart_data}
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