from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Any, Optional
import httpx
import asyncio
from collections import Counter
from datetime import datetime, timezone
from urllib.parse import urlsplit, urlunsplit

try:
    from app.database import supabase
except Exception:
    supabase = None

router = APIRouter(prefix="/api/compare", tags=["Restaurant Compare"])

# Cấu hình địa chỉ của máy chủ Node.js Scraping
NODE_SCRAPER_URL = "http://localhost:3000/api/compare/scrape"
COMPARE_MAX_REVIEWS = 300
MIN_DATABASE_REVIEWS = 5

# Chỉ dò các dấu hiệu này trong những bình luận đã được PhoBERT phân loại
# là tiêu cực. Nhờ vậy phần "Điểm cần lưu ý" mô tả đúng vấn đề thay vì
# lặp lại các từ chung chung như "ngon" ở cả hai nhóm.
NEGATIVE_ISSUE_PATTERNS = {
    "Phục vụ chậm": ["phục vụ chậm", "chờ lâu", "đợi lâu", "lên món lâu"],
    "Thái độ phục vụ": ["thái độ", "khó chịu", "không nhiệt tình", "thiếu thân thiện"],
    "Giá cao": ["giá cao", "mắc", "đắt", "không đáng tiền"],
    "Món chưa ngon": ["không ngon", "dở", "khó ăn", "nhạt", "quá mặn", "quá ngọt"],
    "Món nguội": ["nguội", "không nóng", "món lạnh"],
    "Vệ sinh chưa tốt": ["dơ", "bẩn", "mất vệ sinh", "ruồi", "tóc trong"],
    "Không gian chưa tốt": ["ồn", "chật", "nóng", "ám mùi"],
    "Giao sai hoặc thiếu món": ["giao sai", "thiếu món", "sai món", "giao thiếu"],
}


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


def verify_user(user_id: str):
    if supabase is None:
        raise HTTPException(status_code=500, detail="Backend chưa cấu hình Supabase.")

    try:
        res = supabase.table("profiles").select("id, role").eq("id", user_id).single().execute()
        profile = res.data

        if not profile:
            raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản.")

        return profile

    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail="Không thể kiểm tra tài khoản.")


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


def normalize_ai_label(value):
    if value in (1, "1", True):
        return 1
    if value in (0, "0", False):
        return 0

    normalized = str(value or "").strip().lower()
    if normalized in {"tích cực", "tich cuc", "positive", "hài lòng", "hai long"}:
        return 1
    if normalized in {"tiêu cực", "tieu cuc", "negative", "chưa hài lòng", "chua hai long"}:
        return 0
    return None


def normalize_aspect_dictionary(aspect_dict):
    normalized = {}

    for aspect, keywords in (aspect_dict or {}).items():
        if isinstance(keywords, str):
            values = keywords.split(",")
        elif isinstance(keywords, list):
            values = keywords
        else:
            values = []

        clean_values = [
            str(keyword).strip().lower()
            for keyword in values
            if str(keyword).strip()
        ]
        if clean_values:
            normalized[str(aspect)] = clean_values

    return normalized


def analyze_reviews_with_model(reviews, aspect_dict, restaurant_name, predictor, data_source):
    valid_reviews = [
        review for review in reviews
        if str(review.get("content") or "").strip()
    ][:COMPARE_MAX_REVIEWS]

    if not valid_reviews:
        return None

    missing_indexes = []
    missing_texts = []
    predictions = [None] * len(valid_reviews)

    for index, review in enumerate(valid_reviews):
        label = normalize_ai_label(review.get("ai_label"))
        if label is None:
            missing_indexes.append(index)
            missing_texts.append(review.get("content"))
            continue

        predictions[index] = {
            "label": label,
            "confidence": safe_float(review.get("confidence")),
        }

    if missing_texts:
        if predictor is None:
            raise RuntimeError("Mô hình PhoBERT chưa sẵn sàng để phân tích dữ liệu mới.")

        model_results = predictor.predict_many(missing_texts)
        for index, prediction in zip(missing_indexes, model_results):
            predictions[index] = prediction

    positive_count = sum(1 for item in predictions if item and item.get("label") == 1)
    negative_count = len(predictions) - positive_count
    total = len(predictions)
    positive_rate = positive_count / total * 100
    negative_rate = negative_count / total * 100

    normalized_aspects = normalize_aspect_dictionary(aspect_dict)
    aspect_stats = {
        aspect: {"positive": 0, "negative": 0}
        for aspect in normalized_aspects
    }
    positive_keywords = Counter()
    negative_keywords = Counter()
    negative_issues = Counter()

    for review, prediction in zip(valid_reviews, predictions):
        content = str(review.get("content") or "").lower()
        label = prediction.get("label") if prediction else 0
        stored_keywords = review.get("keywords") or []

        if isinstance(stored_keywords, str):
            stored_keywords = stored_keywords.split(",")

        for keyword in stored_keywords:
            clean_keyword = str(keyword).strip().lower()
            if clean_keyword:
                (positive_keywords if label == 1 else negative_keywords)[clean_keyword] += 1

        for aspect, keywords in normalized_aspects.items():
            matched = [keyword for keyword in keywords if keyword in content]
            if not matched:
                continue

            bucket = "positive" if label == 1 else "negative"
            aspect_stats[aspect][bucket] += 1
            for keyword in matched:
                (positive_keywords if label == 1 else negative_keywords)[keyword] += 1

        if label == 0:
            for issue, patterns in NEGATIVE_ISSUE_PATTERNS.items():
                if any(pattern in content for pattern in patterns):
                    negative_issues[issue] += 1

    aspects_data = {}
    for aspect, stats in aspect_stats.items():
        mentions = stats["positive"] + stats["negative"]
        aspects_data[aspect] = {
            "positive": round(stats["positive"] / mentions * 100, 1) if mentions else 0,
            "negative": round(stats["negative"] / mentions * 100, 1) if mentions else 0,
            "mentions": mentions,
        }

    strongest_aspect = None
    if aspects_data:
        strongest_aspect = max(
            aspects_data.items(),
            key=lambda item: (item[1]["positive"], item[1]["mentions"]),
        )[0]

    if positive_rate >= 70:
        recommendation = (
            f"Phần lớn khách hàng hài lòng ({positive_rate:.1f}%)."
            + (f" Khía cạnh nổi bật: {strongest_aspect}." if strongest_aspect else "")
        )
    elif positive_rate >= 45:
        recommendation = (
            f"Mức hài lòng trung bình ({positive_rate:.1f}%). "
            "Nên đọc thêm các phản hồi tiêu cực trước khi lựa chọn."
        )
    else:
        recommendation = (
            f"Tỷ lệ phản hồi tiêu cực đang cao ({negative_rate:.1f}%). "
            "Nên cân nhắc kỹ trước khi lựa chọn."
        )

    confidences = [
        safe_float(item.get("confidence"))
        for item in predictions
        if item and item.get("confidence") is not None
    ]

    # Một từ chỉ thuộc về nhóm mà nó xuất hiện nổi trội hơn. Trường hợp bằng
    # nhau ưu tiên nhóm cần lưu ý để không che mất tín hiệu rủi ro hiếm gặp.
    top_positive = [
        keyword
        for keyword, count in positive_keywords.most_common()
        if count > negative_keywords.get(keyword, 0)
    ][:5]
    top_negative = [issue for issue, _ in negative_issues.most_common(5)]

    if len(top_negative) < 5:
        for keyword, count in negative_keywords.most_common():
            if count < positive_keywords.get(keyword, 0):
                continue
            if keyword in top_positive or keyword in top_negative:
                continue
            top_negative.append(keyword)
            if len(top_negative) == 5:
                break

    # Vẫn phải báo cho người dùng biết có phản hồi tiêu cực dù nội dung đó
    # không khớp từ điển khía cạnh hoặc danh sách dấu hiệu phổ biến.
    if negative_count > 0 and not top_negative:
        top_negative = [f"Cần xem {negative_count} phản hồi chưa hài lòng"]

    return {
        "restaurant_name": restaurant_name,
        "total_reviews": total,
        "positive_count": positive_count,
        "negative_count": negative_count,
        "positive_rate": round(positive_rate, 1),
        "negative_rate": round(negative_rate, 1),
        "risk_score": round(negative_rate, 1),
        "average_confidence": round(sum(confidences) / len(confidences), 1) if confidences else 0,
        "top_positive_keywords": top_positive,
        "top_negative_keywords": top_negative,
        "aspects": aspects_data,
        "recommendation": recommendation,
        "data_source": data_source,
        "analyzed_at": datetime.now(timezone.utc).isoformat(),
    }


def fetch_reviews_from_database(url: str, user_id: str):
    if supabase is None:
        return []

    try:
        raw_url = str(url or "").strip()
        candidates = {raw_url, raw_url.rstrip("/")}

        try:
            parsed = urlsplit(raw_url)
            clean_path = parsed.path.rstrip("/")
            clean_url = urlunsplit((parsed.scheme, parsed.netloc, clean_path, "", ""))
            candidates.update({clean_url, f"{clean_url}/"})

            if "foody.vn" in parsed.netloc.lower():
                host = parsed.netloc.lower().removeprefix("www.")
                for scheme in ("http", "https"):
                    for hostname in (host, f"www.{host}"):
                        variant = urlunsplit((scheme, hostname, clean_path, "", ""))
                        candidates.update({variant, f"{variant}/"})
        except Exception:
            pass

        response = (
            supabase
            .table("scraped_reviews")
            .select("content, ai_label, confidence, keywords, aspects, review_date")
            .eq("user_id", user_id)
            .in_("source_url", [item for item in candidates if item])
            .order("review_date", desc=True)
            .limit(COMPARE_MAX_REVIEWS)
            .execute()
        )
        return response.data or []
    except Exception as error:
        print(f"Không thể tải dữ liệu đã cào cho {url}: {error}")
        return []


async def fetch_reviews_from_node(url: str, name: str, client: httpx.AsyncClient):
    try:
        # Gọi sang file index.js (Node.js) để cào dữ liệu
        response = await client.post(
            NODE_SCRAPER_URL,
            json={
                "url": url,
                "max_reviews": COMPARE_MAX_REVIEWS,
                "force_refresh": True,
            },
            timeout=300.0,
        )
        response.raise_for_status()
        data = response.json()
        
        if not data.get("success"):
            raise Exception(data.get("error", "Lỗi không xác định từ Node.js"))
            
        return {
            "url": url,
            "name": name,
            "reviews": data.get("reviews", []),
            "data_source": "scraper",
        }
    except Exception as e:
        print(f"Lỗi cào dữ liệu URL {url}: {e}")
        return {"url": url, "name": name, "reviews": [], "error": str(e)}


@router.post("/restaurants")
async def compare_restaurants(req_obj: Request, req: CompareRestaurantsRequest):
    """
    API so sánh chất lượng giữa 2 hoặc 3 quán ăn dựa trên bình luận.
    Ưu tiên lấy dữ liệu đã có trong CSDL, nếu thiếu sẽ gọi Node.js Scraper cào mới.
    Sau đó phân tích bằng PhoBERT và đánh giá trên các khía cạnh (Món ăn, Phục vụ, Không gian...).
    """
    verify_user(req.user_id)

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

    predictor = getattr(req_obj.app.state, "predictor", None)

    # 2. Ưu tiên dữ liệu thật đã lưu; link mới sẽ được cào trực tiếp.
    prepared_by_url = {}
    pending_items = []

    for item in req.restaurants:
        stored_reviews = await asyncio.to_thread(
            fetch_reviews_from_database,
            item.url,
            req.user_id,
        )

        if len(stored_reviews) >= MIN_DATABASE_REVIEWS:
            prepared_by_url[item.url] = {
                "url": item.url,
                "name": item.name or "Không rõ tên quán",
                "reviews": stored_reviews,
                "data_source": "database",
            }
        else:
            pending_items.append(item)

    async with httpx.AsyncClient() as client:
        tasks = [
            fetch_reviews_from_node(item.url, item.name or f"Quán {idx+1}", client)
            for idx, item in enumerate(pending_items)
        ]
        if tasks:
            scraped_items = await asyncio.gather(*tasks)
            for scraped_item in scraped_items:
                prepared_by_url[scraped_item["url"]] = scraped_item

    prepared_data = [
        prepared_by_url[item.url]
        for item in req.restaurants
        if item.url in prepared_by_url
    ]

    # 3. Phân tích Dữ liệu thật và tổng hợp kết quả
    results = []
    for item in prepared_data:
        reviews = item["reviews"]
        
        if not reviews:
            raise HTTPException(status_code=400, detail=f"Không thể lấy bình luận từ quán {item['name']}. Lỗi: {item.get('error', 'Trang trống')}")
            
        analysis_result = await asyncio.to_thread(
            analyze_reviews_with_model,
            reviews,
            aspect_dict,
            item["name"],
            predictor,
            item.get("data_source", "scraper"),
        )
        analysis_result["source_url"] = item["url"]
        
        results.append(analysis_result)

    return {
        "success": True,
        "data": results,
        "message": "Đã dùng dữ liệu thật và mô hình PhoBERT để so sánh.",
    }


# ==========================================
# CÁC HÀM LỊCH SỬ (GIỮ NGUYÊN KHÔNG ĐỔI)
# ==========================================

@router.get("/history")
async def get_comparison_history(user_id: str):
    """
    Lấy danh sách các phiên so sánh (lịch sử) đã lưu của người dùng.
    Dùng để hiển thị trong mục "Lịch sử so sánh".
    """
    verify_user(user_id)
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
            item["data_source"] = "database"
            items_by_session.setdefault(item.get("comparison_id"), []).append(item)

        data = [{**session, "items": items_by_session.get(session["id"], [])} for session in sessions]
        return {"success": True, "data": data}
    except Exception:
        raise HTTPException(status_code=500, detail="Không thể tải lịch sử so sánh.")


@router.post("/save")
async def save_comparison(req: SaveComparisonRequest):
    """
    Lưu lại một phiên so sánh vào lịch sử để xem lại sau này (tính năng "Lưu kết quả").
    """
    verify_user(req.user_id)
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
    verify_user(user_id)
    try:
        session_res = supabase.table("comparison_sessions").select("id").eq("id", comparison_id).eq("user_id", user_id).execute()
        if not session_res.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy lịch sử cần xóa.")

        supabase.table("comparison_items").delete().eq("comparison_id", comparison_id).execute()
        supabase.table("comparison_sessions").delete().eq("id", comparison_id).eq("user_id", user_id).execute()

        return {"success": True, "message": "Đã xóa lịch sử so sánh."}
    except Exception:
        raise HTTPException(status_code=500, detail="Không thể xóa lịch sử so sánh.")
