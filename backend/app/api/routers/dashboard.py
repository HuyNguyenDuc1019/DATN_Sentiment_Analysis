from fastapi import APIRouter, HTTPException
from typing import Optional
from collections import Counter
from app.database import supabase

router = APIRouter(tags=["Dashboard & Alerts"])

@router.get("/api/last-scraped")
async def get_last_scraped(source_url: str, user_id: str):
    try:
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

@router.get("/api/dashboard/alerts")
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

@router.get("/api/dashboard/keyword-analytics")
async def get_keyword_analytics(user_id: str, source_url: Optional[str] = None):
    try:
        profile_res = supabase.table('profiles').select('tier').eq('id', user_id).single().execute()
        is_vip = profile_res.data and profile_res.data.get('tier') == 'vip'

        query = supabase.table('scraped_reviews').select('ai_label, keywords').eq('user_id', user_id)
        
        if source_url and source_url != "all":
            query = query.eq('source_url', source_url)
            
        response = query.execute()
        data = response.data
        
        pos_keywords = []
        neg_keywords = []
        
        for item in data:
            kws = item.get('keywords') or []
            if item['ai_label'] == 1:
                pos_keywords.extend(kws)
            else:
                neg_keywords.extend(kws)
                
        pos_counts = Counter(pos_keywords)
        neg_counts = Counter(neg_keywords)
        
        leaderboard_data = {
            "top_positive": [{"keyword": k.capitalize(), "count": v} for k, v in pos_counts.most_common(5)],
            "top_negative": [{"keyword": k.capitalize(), "count": v} for k, v in neg_counts.most_common(5)]
        }
        
        wordcloud_data = []
        if is_vip:
            for kw, count in pos_counts.most_common(20):
                wordcloud_data.append({"text": kw.capitalize(), "value": count * 10, "sentiment": "positive"})
                
            for kw, count in neg_counts.most_common(20):
                wordcloud_data.append({"text": kw.capitalize(), "value": count * 10, "sentiment": "negative"})
                
        return {
            "leaderboard": leaderboard_data,
            "wordcloud": wordcloud_data 
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
