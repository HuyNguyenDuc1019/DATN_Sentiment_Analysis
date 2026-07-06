from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Any, Optional
from app.database import supabase
import requests
from collections import Counter

router = APIRouter(prefix="/api/compare", tags=["Restaurant Compare"])

SCRAPER_COMPARE_URL = "http://localhost:3000/api/compare/scrape"
MAX_REVIEWS_PER_RESTAURANT = 25
MIN_DB_REVIEWS = 10
SCRAPER_TIMEOUT_SECONDS = 120


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


POSITIVE_WORDS = [
    "ngon", "ổn", "tốt", "thích", "đáng tiền", "rẻ", "hợp lý", "sạch",
    "nhanh", "nhiệt tình", "dễ thương", "tươi", "đậm đà", "chất lượng",
    "thoáng", "đẹp", "ok", "oke", "recommend", "quay lại"
]

NEGATIVE_WORDS = [
    "dở", "tệ", "chậm", "lâu", "đắt", "mắc", "bẩn", "ồn", "khó chịu",
    "nguội", "nhạt", "ít", "thất vọng", "không ngon", "phục vụ kém",
    "chờ", "chen", "đông", "hôi", "không quay lại"
]


def normalize_keywords(value):
    if not value:
        return []

    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()][:5]

    if isinstance(value, str):
        return [item.strip() for item in value.split(",") if item.strip()][:5]

    return []


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


def get_predictor(request: Request):
    predictor = getattr(request.app.state, "predictor", None)

    if predictor is None:
        raise HTTPException(status_code=500, detail="AI model chưa sẵn sàng.")

    return predictor


def extract_label(prediction):
    if isinstance(prediction, dict):
        raw_label = (
            prediction.get("ai_label")
            if prediction.get("ai_label") is not None
            else prediction.get("label")
            if prediction.get("label") is not None
            else prediction.get("sentiment")
            if prediction.get("sentiment") is not None
            else prediction.get("prediction")
        )
    else:
        raw_label = prediction

    if isinstance(raw_label, bool):
        return 1 if raw_label else 0

    if isinstance(raw_label, int):
        return 1 if raw_label == 1 else 0

    text = str(raw_label or "").lower().strip()

    if text in ["1", "positive", "pos", "tích cực", "tich cuc", "hai long", "hài lòng", "satisfied"]:
        return 1

    return 0


def predict_one(predictor, content: str):
    if hasattr(predictor, "predict"):
        return predictor.predict(content)

    if hasattr(predictor, "predict_sentiment"):
        return predictor.predict_sentiment(content)

    if hasattr(predictor, "__call__"):
        return predictor(content)

    raise HTTPException(status_code=500, detail="Predictor không có hàm predict phù hợp.")


def extract_keywords(reviews, word_list):
    counter = Counter()

    for review in reviews:
        text = str(review.get("content") or "").lower()
        for word in word_list:
            if word in text:
                counter[word] += 1

    return [word for word, _ in counter.most_common(5)]


def build_recommendation(restaurant_name, positive_rate, negative_rate, risk_score, top_positive, top_negative):
    name = restaurant_name or "Quán này"

    if positive_rate >= 75 and risk_score < 45:
        if "ngon" in top_positive:
            return f"{name} đáng chọn nếu bạn ưu tiên đồ ăn ngon và trải nghiệm ổn định."
        return f"{name} là lựa chọn khá an toàn, tỷ lệ hài lòng cao."

    if positive_rate >= 60 and risk_score < 65:
        if any(word in top_positive for word in ["rẻ", "hợp lý", "đáng tiền"]):
            return f"{name} phù hợp nếu bạn ưu tiên giá hợp lý, nhưng vẫn nên xem thêm điểm trừ."
        return f"{name} có thể thử, nhưng nên cân nhắc các phản hồi chưa hài lòng."

    if any(word in top_negative for word in ["chờ", "lâu", "chậm", "đông"]):
        return f"{name} nên tránh giờ cao điểm vì có nhiều tín hiệu về chờ lâu hoặc phục vụ chậm."

    if negative_rate >= 45:
        return f"{name} cần cân nhắc kỹ vì tỷ lệ phản hồi chưa hài lòng khá cao."

    return f"{name} có dữ liệu trung bình, nên chọn nếu các điểm mạnh phù hợp nhu cầu của bạn."


def calculate_risk_score(negative_rate, total_reviews, top_negative):
    risk = negative_rate

    if total_reviews < 20:
        risk += 10

    if any(word in top_negative for word in ["bẩn", "hôi", "phục vụ kém", "thất vọng"]):
        risk += 15

    if any(word in top_negative for word in ["chờ", "lâu", "chậm", "đông"]):
        risk += 8

    return round(min(100, max(0, risk)), 1)


def get_existing_reviews_from_db(user_id: str, source_url: str):
    try:
        res = (
            supabase
            .table("scraped_reviews")
            .select("content,ai_label,confidence,review_date,source_url,created_at")
            .eq("user_id", user_id)
            .eq("source_url", source_url)
            .order("created_at", desc=True)
            .limit(MAX_REVIEWS_PER_RESTAURANT)
            .execute()
        )

        rows = res.data or []

        reviews = []
        for row in rows:
            content = row.get("content") or ""
            if not content.strip():
                continue

            reviews.append({
                "content": content,
                "review_date": row.get("review_date") or row.get("created_at"),
                "ai_label": row.get("ai_label"),
                "confidence": row.get("confidence"),
                "from_db": True,
            })

        return reviews

    except Exception as e:
        print(f"⚠️ Không lấy được dữ liệu cũ từ scraped_reviews: {e}")
        return []


def scrape_reviews_for_compare(url: str):
    try:
        response = requests.post(
            SCRAPER_COMPARE_URL,
            json={"url": url},
            timeout=SCRAPER_TIMEOUT_SECONDS
        )

        data = response.json()

        if response.status_code >= 400 or data.get("success") is False:
            message = data.get("detail") or data.get("error") or data.get("message") or "Không thể cào dữ liệu so sánh."
            raise HTTPException(status_code=response.status_code, detail=message)

        return (data.get("reviews") or [])[:MAX_REVIEWS_PER_RESTAURANT]

    except HTTPException:
        raise
    except requests.exceptions.ConnectionError:
        raise HTTPException(
            status_code=503,
            detail="Không kết nối được Scraper Backend ở http://localhost:3000. Hãy chạy scraper trước."
        )
    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="Scraper xử lý quá lâu, vui lòng thử lại.")
    except Exception as e:
        print(f"Lỗi scrape_reviews_for_compare: {e}")
        raise HTTPException(status_code=500, detail="Không thể lấy bình luận từ scraper.")


def analyze_reviews_for_compare(reviews, predictor):
    positive_count = 0
    negative_count = 0

    for review in reviews:
        content = review.get("content") or ""

        if not content.strip():
            continue

        if review.get("from_db") and review.get("ai_label") is not None:
            label = extract_label(review.get("ai_label"))
        else:
            prediction = predict_one(predictor, content)
            label = extract_label(prediction)

        if label == 1:
            positive_count += 1
        else:
            negative_count += 1

    return positive_count, negative_count


@router.post("/restaurants")
async def compare_restaurants(req: CompareRestaurantsRequest, request: Request):
    try:
        if len(req.restaurants) < 2:
            raise HTTPException(status_code=400, detail="Cần ít nhất 2 quán để so sánh.")

        if len(req.restaurants) > 3:
            raise HTTPException(status_code=400, detail="Chỉ hỗ trợ tối đa 3 quán/lần.")

        predictor = get_predictor(request)
        results = []

        for index, item in enumerate(req.restaurants):
            restaurant_name = item.name or f"Quán {index + 1}"

            db_reviews = get_existing_reviews_from_db(req.user_id, item.url)

            if len(db_reviews) >= MIN_DB_REVIEWS:
                reviews = db_reviews[:MAX_REVIEWS_PER_RESTAURANT]
                data_source = "database"
                print(f"⚡ Compare dùng dữ liệu DB: {restaurant_name} - {len(reviews)} reviews")
            else:
                reviews = scrape_reviews_for_compare(item.url)[:MAX_REVIEWS_PER_RESTAURANT]
                data_source = "scraper"
                print(f"🕷️ Compare dùng scraper: {restaurant_name} - {len(reviews)} reviews")

            if not reviews:
                results.append({
                    "restaurant_name": restaurant_name,
                    "source_url": item.url,
                    "total_reviews": 0,
                    "positive_count": 0,
                    "negative_count": 0,
                    "positive_rate": 0,
                    "negative_rate": 0,
                    "risk_score": 100,
                    "top_positive_keywords": [],
                    "top_negative_keywords": [],
                    "recommendation": "Không lấy được bình luận hợp lệ để so sánh.",
                    "data_source": data_source,
                })
                continue

            positive_count, negative_count = analyze_reviews_for_compare(reviews, predictor)
            total_reviews = positive_count + negative_count

            if total_reviews == 0:
                positive_rate = 0
                negative_rate = 0
            else:
                positive_rate = round((positive_count / total_reviews) * 100, 1)
                negative_rate = round((negative_count / total_reviews) * 100, 1)

            top_positive_keywords = extract_keywords(reviews, POSITIVE_WORDS)
            top_negative_keywords = extract_keywords(reviews, NEGATIVE_WORDS)
            risk_score = calculate_risk_score(negative_rate, total_reviews, top_negative_keywords)

            results.append({
                "restaurant_name": restaurant_name,
                "source_url": item.url,
                "total_reviews": total_reviews,
                "positive_count": positive_count,
                "negative_count": negative_count,
                "positive_rate": positive_rate,
                "negative_rate": negative_rate,
                "risk_score": risk_score,
                "top_positive_keywords": top_positive_keywords,
                "top_negative_keywords": top_negative_keywords,
                "recommendation": build_recommendation(
                    restaurant_name,
                    positive_rate,
                    negative_rate,
                    risk_score,
                    top_positive_keywords,
                    top_negative_keywords
                ),
                "data_source": data_source,
            })

        return {
            "success": True,
            "data": results,
            "message": "Đã so sánh tạm thời. Dữ liệu này không lưu vào Dashboard.",
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Lỗi compare_restaurants: {e}")
        raise HTTPException(status_code=500, detail="Không thể so sánh quán.")


@router.post("/save")
async def save_comparison(req: SaveComparisonRequest):
    try:
        if not req.items:
            raise HTTPException(status_code=400, detail="Không có kết quả so sánh để lưu.")

        session_payload = {
            "user_id": req.user_id,
            "title": req.title or "Lịch sử so sánh quán",
        }

        session_res = (
            supabase
            .table("comparison_sessions")
            .insert(session_payload)
            .execute()
        )

        if not session_res.data:
            raise HTTPException(status_code=500, detail="Không thể tạo phiên so sánh.")

        comparison_id = session_res.data[0]["id"]

        item_payloads = []
        for item in req.items:
            item_payloads.append({
                "comparison_id": comparison_id,
                "restaurant_name": item.get("restaurant_name") or item.get("name") or "Không rõ tên quán",
                "source_url": item.get("source_url") or item.get("url"),
                "total_reviews": safe_int(item.get("total_reviews")),
                "positive_count": safe_int(item.get("positive_count")),
                "negative_count": safe_int(item.get("negative_count")),
                "positive_rate": safe_float(item.get("positive_rate")),
                "negative_rate": safe_float(item.get("negative_rate")),
                "risk_score": safe_float(item.get("risk_score")),
                "top_positive_keywords": normalize_keywords(item.get("top_positive_keywords")),
                "top_negative_keywords": normalize_keywords(item.get("top_negative_keywords")),
                "recommendation": item.get("recommendation") or "",
            })

        if item_payloads:
            supabase.table("comparison_items").insert(item_payloads).execute()

        return {
            "success": True,
            "message": "Đã lưu lịch sử so sánh.",
            "comparison_id": comparison_id,
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Lỗi save_comparison: {e}")
        raise HTTPException(status_code=500, detail="Không thể lưu lịch sử so sánh.")


@router.get("/history")
async def get_comparison_history(user_id: str):
    try:
        sessions_res = (
            supabase
            .table("comparison_sessions")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )

        sessions = sessions_res.data or []

        if not sessions:
            return {"success": True, "data": []}

        session_ids = [item["id"] for item in sessions]

        items_res = (
            supabase
            .table("comparison_items")
            .select("*")
            .in_("comparison_id", session_ids)
            .execute()
        )

        items = items_res.data or []
        items_by_session = {}

        for item in items:
            items_by_session.setdefault(item.get("comparison_id"), []).append(item)

        data = []
        for session in sessions:
            data.append({
                **session,
                "items": items_by_session.get(session["id"], []),
            })

        return {"success": True, "data": data}

    except Exception as e:
        print(f"Lỗi get_comparison_history: {e}")
        raise HTTPException(status_code=500, detail="Không thể tải lịch sử so sánh.")


@router.delete("/history/{comparison_id}")
async def delete_comparison_history(comparison_id: str, user_id: str):
    try:
        session_res = (
            supabase
            .table("comparison_sessions")
            .select("id,user_id")
            .eq("id", comparison_id)
            .eq("user_id", user_id)
            .execute()
        )

        if not session_res.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy lịch sử so sánh.")

        supabase.table("comparison_sessions").delete().eq("id", comparison_id).eq("user_id", user_id).execute()

        return {"success": True, "message": "Đã xóa lịch sử so sánh."}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Lỗi delete_comparison_history: {e}")
        raise HTTPException(status_code=500, detail="Không thể xóa lịch sử so sánh.")
