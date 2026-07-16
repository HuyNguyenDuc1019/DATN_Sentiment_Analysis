from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any, Optional
import httpx
import asyncio

try:
    from app.database import supabase
except Exception:
    supabase = None

router = APIRouter(prefix="/api/compare", tags=["Restaurant Compare"])

# Cấu hình địa chỉ của máy chủ Node.js Scraping
NODE_SCRAPER_URL = "http://localhost:3000/api/compare/scrape"


class CompareRestaurantItem(BaseModel):
    name: Optional[str] = None
    url: str


class CompareRestaurantsRequest(BaseModel):
    user_id: str
    mode: str = "temporary"
    restaurants: list[CompareRestaurantItem]


class SaveComparisonRequest(BaseModel):
    user_id: str
    title: str
    items: list[dict[str, Any]]


def safe_float(value, default=0):
    try:
        return float(value or default)
    except Exception:
        return default


def safe_int(value, default=0):
    try:
        return int(value or default)
    except Exception:
        return default


def normalize_keywords(value):
    if not value:
        return []
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()][:5]
    if isinstance(value, str):
        return [item.strip() for item in value.split(",") if item.strip()][:5]
    return []


def verify_vip_user(user_id: str):
    if supabase is None:
        raise HTTPException(status_code=500, detail="Backend chưa cấu hình Supabase.")

    try:
        res = supabase.table("profiles").select("id, role, tier").eq("id", user_id).single().execute()
        profile = res.data

        if not profile:
            raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản.")

        role = str(profile.get("role") or "").lower()
        tier = str(profile.get("tier") or "").lower()

        if role == "admin" or tier == "vip":
            return profile

        raise HTTPException(status_code=403, detail="So sánh quán là tính năng VIP.")

    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail="Không thể kiểm tra VIP.")


# Thuật toán phân tích nhanh (Quick Scan) trên RAM
def analyze_quick_scan(reviews, aspect_dict, restaurant_name):
    # Bộ từ khóa đánh giá cảm xúc tổng quan
    pos_keywords = ["ngon", "tốt", "tuyệt", "hài lòng", "ok", "ổn", "thích", "đẹp", "rẻ", "sạch", "nhiệt tình", "khen"]
    neg_keywords = ["dở", "tệ", "chậm", "mắc", "đắt", "dơ", "bẩn", "thái độ", "lâu", "nguội", "chua", "ruồi", "chê"]
    
    total = len(reviews)
    if total == 0:
        return None

    pos_count = 0
    neg_count = 0
    found_pos_words = {}
    found_neg_words = {}
    
    aspect_stats = {asp: {"pos": 0, "neg": 0, "total": 0} for asp in aspect_dict.keys()}

    for rev in reviews:
        content = rev.get("content", "").lower()
        if not content:
            continue
            
        # 1. Đánh giá Cảm xúc câu
        p_c = sum(1 for w in pos_keywords if w in content)
        n_c = sum(1 for w in neg_keywords if w in content)
        
        is_pos = p_c >= n_c # Nếu khen nhiều hơn hoặc bằng chê thì tính là tích cực
        if is_pos:
            pos_count += 1
            for w in pos_keywords:
                if w in content:
                    found_pos_words[w] = found_pos_words.get(w, 0) + 1
        else:
            neg_count += 1
            for w in neg_keywords:
                if w in content:
                    found_neg_words[w] = found_neg_words.get(w, 0) + 1
                    
        # 2. Phân loại Khía cạnh
        for asp_name, keywords in aspect_dict.items():
            if any(k.lower() in content for k in keywords):
                aspect_stats[asp_name]["total"] += 1
                if is_pos:
                    aspect_stats[asp_name]["pos"] += 1
                else:
                    aspect_stats[asp_name]["neg"] += 1

    # Tính toán kết quả cuối cùng
    positive_rate = (pos_count / total) * 100
    negative_rate = (neg_count / total) * 100
    risk_score = min(100, (neg_count / max(1, total)) * 100 * 1.2) # Khuếch đại rủi ro nhẹ
    
    # Định dạng dữ liệu khía cạnh cho biểu đồ Radar
    aspects_data = {}
    best_aspect_name = "chất lượng"
    best_aspect_score = 0
    
    for asp, stats in aspect_stats.items():
        if stats["total"] > 0:
            pos_score = (stats["pos"] / stats["total"]) * 100
            if pos_score > best_aspect_score:
                best_aspect_score = pos_score
                best_aspect_name = asp
        else:
            pos_score = 0 # Nếu không ai nhắc đến khía cạnh này, cho điểm 0
            
        aspects_data[asp] = {
            "positive": round(pos_score, 1),
            "negative": round(100 - pos_score if stats["total"] > 0 else 0, 1)
        }

    # Sinh kết luận thông minh
    if positive_rate >= 70:
        recommendation = f"Được đánh giá cao ({round(positive_rate)}% khen), nổi bật nhất ở khía cạnh {best_aspect_name}. Rất đáng thử!"
    elif positive_rate >= 40:
        recommendation = f"Mức độ hài lòng trung bình. Cần lưu ý các bình luận tiêu cực trước khi chọn quán này."
    else:
        recommendation = f"Rủi ro trải nghiệm cao (chỉ {round(positive_rate)}% khen). Chỉ nên cân nhắc nếu có ưu đãi về giá."

    # Sắp xếp top từ khóa
    top_pos = sorted(found_pos_words, key=found_pos_words.get, reverse=True)[:5]
    top_neg = sorted(found_neg_words, key=found_neg_words.get, reverse=True)[:5]

    return {
        "restaurant_name": restaurant_name,
        "total_reviews": total,
        "positive_count": pos_count,
        "negative_count": neg_count,
        "positive_rate": round(positive_rate, 1),
        "negative_rate": round(negative_rate, 1),
        "risk_score": round(risk_score, 1),
        "top_positive_keywords": top_pos if top_pos else ["tạm ổn"],
        "top_negative_keywords": top_neg if top_neg else ["chưa có dữ liệu"],
        "aspects": aspects_data,
        "recommendation": recommendation,
    }


async def fetch_reviews_from_node(url: str, name: str, client: httpx.AsyncClient):
    try:
        # Gọi sang file index.js (Node.js) để cào dữ liệu
        response = await client.post(NODE_SCRAPER_URL, json={"url": url}, timeout=120.0)
        data = response.json()
        
        if not data.get("success"):
            raise Exception(data.get("error", "Lỗi không xác định từ Node.js"))
            
        return {
            "url": url,
            "name": name,
            "reviews": data.get("reviews", [])
        }
    except Exception as e:
        print(f"Lỗi cào dữ liệu URL {url}: {e}")
        return {"url": url, "name": name, "reviews": [], "error": str(e)}


@router.post("/restaurants")
async def compare_restaurants(req: CompareRestaurantsRequest):
    verify_vip_user(req.user_id)

    if len(req.restaurants) < 2 or len(req.restaurants) > 3:
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ so sánh từ 2 đến 3 quán.")

    # 1. Kéo từ điển khía cạnh từ CSDL để chuẩn bị phân tích
    try:
        settings_res = supabase.table("system_settings").select("aspect_dictionary").eq("id", 1).execute()
        aspect_dict = {}
        if settings_res.data and settings_res.data[0].get("aspect_dictionary"):
            aspect_dict = settings_res.data[0]["aspect_dictionary"]
            
        if not aspect_dict:
            # Fallback nếu admin chưa tạo từ điển
            aspect_dict = {"Món ăn": ["ngon", "dở", "mặn", "nhạt"], "Dịch vụ": ["nhân viên", "thái độ", "phục vụ", "chờ lâu"]}
    except Exception:
        aspect_dict = {"Món ăn": ["ngon", "dở"], "Dịch vụ": ["thái độ", "phục vụ"]}

    # 2. Cào dữ liệu song song (Concurrent Scraping) để tăng tốc độ
    scraped_data = []
    async with httpx.AsyncClient() as client:
        tasks = [
            fetch_reviews_from_node(item.url, item.name or f"Quán {idx+1}", client)
            for idx, item in enumerate(req.restaurants)
        ]
        scraped_data = await asyncio.gather(*tasks)

    # 3. Phân tích Dữ liệu thật và tổng hợp kết quả
    results = []
    for item in scraped_data:
        reviews = item["reviews"]
        
        if not reviews:
            raise HTTPException(status_code=400, detail=f"Không thể lấy bình luận từ quán {item['name']}. Lỗi: {item.get('error', 'Trang trống')}")
            
        # Chạy thuật toán Quick Scan trên RAM
        analysis_result = analyze_quick_scan(reviews, aspect_dict, item["name"])
        analysis_result["source_url"] = item["url"]
        
        results.append(analysis_result)

    return {
        "success": True,
        "data": results,
        "message": "Đã cào và phân tích khía cạnh thành công.",
    }


# ==========================================
# CÁC HÀM LỊCH SỬ (GIỮ NGUYÊN KHÔNG ĐỔI)
# ==========================================

@router.get("/history")
async def get_comparison_history(user_id: str):
    verify_vip_user(user_id)
    try:
        sessions_res = supabase.table("comparison_sessions").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        sessions = sessions_res.data or []
        if not sessions:
            return {"success": True, "data": []}

        session_ids = [item["id"] for item in sessions]
        items_res = supabase.table("comparison_items").select("*").in_("comparison_id", session_ids).execute()
        items = items_res.data or []
        
        items_by_session = {}
        for item in items:
            items_by_session.setdefault(item.get("comparison_id"), []).append(item)

        data = [{**session, "items": items_by_session.get(session["id"], [])} for session in sessions]
        return {"success": True, "data": data}
    except Exception:
        raise HTTPException(status_code=500, detail="Không thể tải lịch sử so sánh.")


@router.post("/save")
async def save_comparison(req: SaveComparisonRequest):
    verify_vip_user(req.user_id)
    if not req.items:
        raise HTTPException(status_code=400, detail="Không có kết quả so sánh để lưu.")

    try:
        session_res = supabase.table("comparison_sessions").insert({"user_id": req.user_id, "title": req.title or "Lịch sử so sánh"}).execute()
        comparison_id = session_res.data[0]["id"]

        item_payloads = []
        for item in req.items:
            item_payloads.append({
                "comparison_id": comparison_id,
                "restaurant_name": item.get("restaurant_name") or "Không rõ tên",
                "source_url": item.get("source_url") or "",
                "total_reviews": safe_int(item.get("total_reviews")),
                "positive_count": safe_int(item.get("positive_count")),
                "negative_count": safe_int(item.get("negative_count")),
                "positive_rate": safe_float(item.get("positive_rate")),
                "negative_rate": safe_float(item.get("negative_rate")),
                "risk_score": safe_float(item.get("risk_score")),
                "top_positive_keywords": normalize_keywords(item.get("top_positive_keywords")),
                "top_negative_keywords": normalize_keywords(item.get("top_negative_keywords")),
                "aspects": item.get("aspects") or {}, 
                "recommendation": item.get("recommendation") or "",
            })

        if item_payloads:
            supabase.table("comparison_items").insert(item_payloads).execute()

        return {"success": True, "message": "Đã lưu lịch sử so sánh.", "comparison_id": comparison_id}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Không thể lưu lịch sử so sánh.")


@router.delete("/history/{comparison_id}")
async def delete_comparison_history(comparison_id: str, user_id: str):
    verify_vip_user(user_id)
    try:
        session_res = supabase.table("comparison_sessions").select("id").eq("id", comparison_id).eq("user_id", user_id).execute()
        if not session_res.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy lịch sử cần xóa.")

        supabase.table("comparison_items").delete().eq("comparison_id", comparison_id).execute()
        supabase.table("comparison_sessions").delete().eq("id", comparison_id).eq("user_id", user_id).execute()

        return {"success": True, "message": "Đã xóa lịch sử so sánh."}
    except Exception:
        raise HTTPException(status_code=500, detail="Không thể xóa lịch sử so sánh.")