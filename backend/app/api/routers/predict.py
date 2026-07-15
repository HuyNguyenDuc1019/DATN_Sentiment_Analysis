from fastapi import APIRouter, HTTPException, Request
import time
from datetime import datetime, timedelta, timezone
from app.database import supabase
from app.schemas import PredictRequest, PredictResponse, BatchPredictRequest

router = APIRouter(prefix="/predict", tags=["AI Prediction"])

def extract_insights(text: str, ai_label: int, dynamic_aspects: dict, sensitive_words_str: str, crisis_enabled: bool):
    text_lower = text.lower()
    found_aspects = set()
    found_keywords = []
    is_action_required = False
    
    sensitive_words = [w.strip().lower() for w in sensitive_words_str.split(",") if w.strip()]
    
    if isinstance(dynamic_aspects, dict):
        for aspect, keywords in dynamic_aspects.items():
            for kw in keywords:
                kw_clean = kw.strip().lower()
                if kw_clean and kw_clean in text_lower:
                    found_aspects.add(aspect)
                    found_keywords.append(kw_clean)
                
    if crisis_enabled and ai_label == 0: 
        if any(bad_word in text_lower for bad_word in sensitive_words):
            is_action_required = True
            
    return list(found_aspects), list(set(found_keywords)), is_action_required

@router.post("/", response_model=PredictResponse)
async def predict_sentiment(req_obj: Request, request: PredictRequest):
    predictor = getattr(req_obj.app.state, 'predictor', None)
    if predictor is None:
        raise HTTPException(status_code=503, detail="Mô hình chưa sẵn sàng.")
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Văn bản không để trống.")

    try:
        user_id = request.user_id 
        profile_res = supabase.table('profiles').select('tier').eq('id', user_id).single().execute()
        is_vip = profile_res.data and profile_res.data.get('tier') == 'vip'

        if not is_vip:
            today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0).isoformat()
            
            count_res = supabase.table('scraped_reviews').select('id', count='exact') \
                .eq('user_id', user_id) \
                .gte('created_at', today_start) \
                .execute()
            
            daily_usage = count_res.count if count_res.count else 0
            
            if daily_usage >= 100:
                raise HTTPException(status_code=429, detail="Bạn đã hết 100 lượt phân tích miễn phí hôm nay. Hãy nâng cấp VIP!")
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e

    try:
        result = predictor.predict(request.text)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi dự đoán: {str(e)}")
        
@router.post("/batch")
async def predict_batch(req_obj: Request, request: BatchPredictRequest):
    predictor = getattr(req_obj.app.state, 'predictor', None)
    if predictor is None:
        raise HTTPException(status_code=503, detail="Mô hình chưa sẵn sàng. Vui lòng thử lại sau.")
        
    profile = supabase.table('profiles').select('tier').eq('id', request.user_id).single().execute()
    is_vip = profile.data and profile.data.get('tier') == 'vip'

    if not is_vip and len(request.reviews) > 50:
        raise HTTPException(status_code=403, detail="Tài khoản Free chỉ phân tích tối đa 50 bình luận/lần. Vui lòng nâng cấp VIP!")

    try:
        settings_res = supabase.table("system_settings").select("*").eq("id", 1).single().execute()
        sys_settings = settings_res.data
        admin_aspects = sys_settings.get("aspect_dictionary", {})
        admin_sensitive = sys_settings.get("custom_dictionary", "")
        crisis_enabled = sys_settings.get("crisis_alert_enabled", True)
        
        dynamic_aspects = admin_aspects.copy()
        sensitive_words_str = admin_sensitive
        retention_days = 7 

        if is_vip:
            user_res = supabase.table('user_settings').select('*').eq('user_id', request.user_id).execute()
            
            if user_res.data and len(user_res.data) > 0:
                user_settings = user_res.data[0]
                
                user_sensitive = user_settings.get("custom_sensitive_words", "")
                if user_sensitive:
                    sensitive_words_str = f"{admin_sensitive}, {user_sensitive}"
                
                user_aspects = user_settings.get("custom_aspects", {})
                if isinstance(user_aspects, dict):
                    for aspect, keywords in user_aspects.items():
                        if aspect in dynamic_aspects:
                            dynamic_aspects[aspect] = f"{dynamic_aspects[aspect]}, {keywords}" 
                        else:
                            dynamic_aspects[aspect] = keywords 
                
                retention_days = user_settings.get("retention_days", 30)
                
                user_threshold = user_settings.get("custom_threshold", 50) / 100.0

        else:
            dynamic_aspects = {}      
            sensitive_words_str = ""  
            crisis_enabled = False    
            
    except Exception as e:
        print(f"⚠️ Lỗi khi tải cấu hình từ DB, dùng mặc định. Chi tiết: {e}")
        dynamic_aspects = {}
        sensitive_words_str = ""
        crisis_enabled = is_vip
        retention_days = 7

    try:
        cutoff_date = (datetime.now() - timedelta(days=retention_days)).isoformat()
        supabase.table("scraped_reviews").delete().eq("user_id", request.user_id).lt("created_at", cutoff_date).execute()
        print(f"🧹 Đã dọn dẹp các dữ liệu cũ hơn {retention_days} ngày của user {request.user_id}.")
    except Exception as cleanup_error:
        print(f"⚠️ Lỗi khi dọn rác: {cleanup_error}")

    start_time = time.time()
    results = []
    db_records = []

    try:
        for item in request.reviews:
            if not item.content.strip():
                continue
                
            pred_result = predictor.predict(item.content)
            label = pred_result.label if hasattr(pred_result, 'label') else pred_result['label']
            confidence = pred_result.confidence if hasattr(pred_result, 'confidence') else pred_result['confidence']
            
            if is_vip and 'user_threshold' in locals():
                if confidence < user_threshold and label == "Tích cực":
                    label = "Tiêu cực" 

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

