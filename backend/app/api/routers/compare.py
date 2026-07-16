from collections import Counter
import asyncio
import json
import os
import re
import unicodedata
from typing import Any, Optional
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit, urlunsplit
from urllib.request import Request as UrlRequest, urlopen
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

try:
    from app.database import supabase
except Exception:
    supabase = None


router = APIRouter(prefix="/api/compare", tags=["Restaurant Compare"])

PAGE_SIZE = 1000
MAX_REVIEWS_PER_RESTAURANT = 20000
SCRAPER_API_URL = os.getenv("SCRAPER_API_URL", "http://localhost:3000").rstrip("/")
AUTO_SCRAPE_TIMEOUT_SECONDS = 900


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
    except (TypeError, ValueError):
        return default


def safe_int(value, default=0):
    try:
        return int(value or default)
    except (TypeError, ValueError):
        return default


def normalize_keywords(value):
    if not value:
        return []

    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]

    if isinstance(value, dict):
        return [str(item).strip() for item in value.values() if str(item).strip()]

    if isinstance(value, str):
        raw = value.strip()
        if not raw:
            return []

        try:
            decoded = json.loads(raw)
            if decoded != value:
                return normalize_keywords(decoded)
        except (TypeError, ValueError, json.JSONDecodeError):
            pass

        return [item.strip() for item in re.split(r"[,;|]", raw) if item.strip()]

    return []


def strip_accents(value: Any) -> str:
    text = str(value or "").strip().lower()
    text = unicodedata.normalize("NFD", text)
    return "".join(char for char in text if unicodedata.category(char) != "Mn")


def normalize_label(value: Any) -> Optional[int]:
    if isinstance(value, bool):
        return 1 if value else 0

    if isinstance(value, (int, float)):
        numeric = int(value)
        return numeric if numeric in (0, 1) else None

    text = strip_accents(value)
    positive_labels = {
        "1", "positive", "positive (1)", "tich cuc", "hai long",
        "khach hai long", "tot",
    }
    negative_labels = {
        "0", "negative", "negative (0)", "tieu cuc", "khong hai long",
        "chua hai long", "khach chua hai long", "xau",
    }

    if text in positive_labels:
        return 1
    if text in negative_labels:
        return 0
    return None


def canonicalize_url(value: str) -> str:
    raw = str(value or "").strip()
    if not raw:
        return ""

    try:
        parsed = urlsplit(raw)
        path = re.sub(r"/+$", "", parsed.path) or "/"
        return urlunsplit((
            parsed.scheme.lower(),
            parsed.netloc.lower(),
            path,
            parsed.query,
            "",
        ))
    except ValueError:
        return raw.rstrip("/")


def build_url_candidates(value: str) -> list[str]:
    raw = str(value or "").strip()
    canonical = canonicalize_url(raw)
    candidates = [raw, raw.rstrip("/"), canonical, canonical.rstrip("/")]

    if canonical:
        candidates.append(f"{canonical.rstrip('/')}/")

    unique = []
    seen = set()
    for item in candidates:
        if item and item not in seen:
            seen.add(item)
            unique.append(item)
    return unique


def verify_vip_user(user_id: str):
    if supabase is None:
        raise HTTPException(
            status_code=500,
            detail="Backend chưa cấu hình Supabase nên không thể kiểm tra VIP.",
        )

    try:
        response = (
            supabase.table("profiles")
            .select("id, role, tier")
            .eq("id", user_id)
            .single()
            .execute()
        )
        profile = response.data

        if not profile:
            raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản người dùng.")

        role = str(profile.get("role") or "").lower()
        tier = str(profile.get("tier") or "").lower()
        if role == "admin" or tier == "vip":
            return profile

        raise HTTPException(
            status_code=403,
            detail="So sánh quán là tính năng VIP. Vui lòng nâng cấp để sử dụng.",
        )
    except HTTPException:
        raise
    except Exception as error:
        print(f"Không thể kiểm tra VIP compare: {error}")
        raise HTTPException(status_code=500, detail="Không thể kiểm tra trạng thái VIP.")


def fetch_reviews_for_restaurant(user_id: str, source_url: str) -> list[dict[str, Any]]:
    reviews_by_id: dict[str, dict[str, Any]] = {}
    select_columns = (
        "id, content, ai_label, confidence, keywords, aspects, "
        "is_action_required, source_url, review_date, created_at"
    )

    for candidate in build_url_candidates(source_url):
        offset = 0

        while len(reviews_by_id) < MAX_REVIEWS_PER_RESTAURANT:
            response = (
                supabase.table("scraped_reviews")
                .select(select_columns)
                .eq("user_id", user_id)
                .eq("source_url", candidate)
                .order("created_at", desc=False)
                .range(offset, offset + PAGE_SIZE - 1)
                .execute()
            )
            batch = response.data or []

            for review in batch:
                review_id = str(review.get("id") or "")
                if review_id:
                    reviews_by_id[review_id] = review

                if len(reviews_by_id) >= MAX_REVIEWS_PER_RESTAURANT:
                    break

            if len(batch) < PAGE_SIZE:
                break
            offset += PAGE_SIZE

    return list(reviews_by_id.values())


def detect_dataset_type(source_url: str) -> str:
    host = urlsplit(source_url).netloc.lower()
    if "foody.vn" in host:
        return "foody"
    if "google." in host or "goo.gl" in host or "maps.app.goo.gl" in host:
        return "google_maps"
    return "unknown"


def read_scraper_error(error: HTTPError) -> str:
    try:
        payload = json.loads(error.read().decode("utf-8"))
        return str(payload.get("detail") or payload.get("error") or payload.get("message") or error.reason)
    except Exception:
        return str(error.reason or "Dịch vụ cào dữ liệu trả về lỗi.")


def request_auto_scrape(user_id: str, item: CompareRestaurantItem, index: int) -> dict[str, Any]:
    dataset_type = detect_dataset_type(item.url)
    if dataset_type == "unknown":
        raise HTTPException(
            status_code=400,
            detail="Link mới chỉ được hỗ trợ tự động cào từ Foody hoặc Google Maps.",
        )

    restaurant_name = item.name or f"Quán {index + 1}"
    payload = {
        "task_id": f"compare-{uuid4()}",
        "url": item.url,
        "user_id": user_id,
        "dataset_name": restaurant_name,
        "dataset_type": dataset_type,
    }
    request = UrlRequest(
        f"{SCRAPER_API_URL}/api/scrape",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urlopen(request, timeout=AUTO_SCRAPE_TIMEOUT_SECONDS) as response:
            result = json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        raise HTTPException(status_code=502, detail=f"Không thể cào '{restaurant_name}': {read_scraper_error(error)}")
    except URLError as error:
        reason = getattr(error, "reason", error)
        raise HTTPException(
            status_code=503,
            detail=(
                f"Không kết nối được dịch vụ cào dữ liệu tại {SCRAPER_API_URL}. "
                f"Hãy chạy scraper trước. Chi tiết: {reason}"
            ),
        )
    except TimeoutError:
        raise HTTPException(
            status_code=504,
            detail=f"Cào '{restaurant_name}' quá thời gian {AUTO_SCRAPE_TIMEOUT_SECONDS // 60} phút.",
        )
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="Dịch vụ cào dữ liệu trả về nội dung không hợp lệ.")

    if result.get("success") is False:
        message = result.get("detail") or result.get("error") or "Không thể cào dữ liệu."
        raise HTTPException(status_code=502, detail=f"Không thể cào '{restaurant_name}': {message}")

    return result


async def get_or_collect_reviews(
    user_id: str,
    item: CompareRestaurantItem,
    index: int,
) -> tuple[list[dict[str, Any]], bool]:
    reviews = await asyncio.to_thread(fetch_reviews_for_restaurant, user_id, item.url)
    if reviews:
        return reviews, False

    await asyncio.to_thread(request_auto_scrape, user_id, item, index)
    reviews = await asyncio.to_thread(fetch_reviews_for_restaurant, user_id, item.url)

    if not reviews:
        restaurant_name = item.name or f"Quán {index + 1}"
        raise HTTPException(
            status_code=422,
            detail=(
                f"Đã cào '{restaurant_name}' nhưng không nhận được bình luận hợp lệ. "
                "Hãy kiểm tra link hoặc thử lại sau."
            ),
        )

    return reviews, True


def most_common_keywords(counter: Counter, limit: int = 5) -> list[str]:
    return [keyword for keyword, _ in counter.most_common(limit)]


def build_recommendation(positive_rate: float, risk_score: float) -> str:
    if positive_rate >= 80 and risk_score < 30:
        return "Phản hồi nhìn chung rất tích cực, mức rủi ro thấp và phù hợp để ưu tiên lựa chọn."
    if positive_rate >= 65 and risk_score < 45:
        return "Phản hồi nhìn chung tích cực; nên xem thêm các từ khóa tiêu cực trước khi quyết định."
    if positive_rate >= 50:
        return "Đánh giá đang phân hóa; nên kiểm tra các phản hồi cần xử lý và vấn đề lặp lại."
    return "Tỷ lệ phản hồi tiêu cực đang cao; cần thận trọng và xem kỹ các vấn đề nổi bật."


def aggregate_restaurant(item: CompareRestaurantItem, reviews: list[dict[str, Any]], index: int):
    positive_count = 0
    negative_count = 0
    action_required_count = 0
    confidence_total = 0.0
    confidence_count = 0
    positive_keywords: Counter = Counter()
    negative_keywords: Counter = Counter()

    for review in reviews:
        label = normalize_label(review.get("ai_label"))
        if label is None:
            continue

        if label == 1:
            positive_count += 1
            target_counter = positive_keywords
        else:
            negative_count += 1
            target_counter = negative_keywords

        if bool(review.get("is_action_required")):
            action_required_count += 1

        confidence = safe_float(review.get("confidence"), -1)
        if confidence >= 0:
            confidence_total += confidence
            confidence_count += 1

        keyword_values = normalize_keywords(review.get("keywords"))
        if not keyword_values:
            keyword_values = normalize_keywords(review.get("aspects"))

        for keyword in keyword_values:
            normalized_keyword = keyword.strip().lower()
            if normalized_keyword:
                target_counter[normalized_keyword] += 1

    classified_count = positive_count + negative_count
    if classified_count == 0:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Quán '{item.name or f'Quán {index + 1}'}' có dữ liệu nhưng chưa có nhãn AI hợp lệ. "
                "Hãy chạy phân tích cảm xúc cho dữ liệu này trước khi so sánh."
            ),
        )

    positive_rate = positive_count * 100 / classified_count
    negative_rate = negative_count * 100 / classified_count
    action_rate = action_required_count * 100 / classified_count
    risk_score = min(100.0, negative_rate + action_rate * 0.25)

    return {
        "restaurant_name": item.name or f"Quán {index + 1}",
        "source_url": item.url,
        "total_reviews": len(reviews),
        "classified_reviews": classified_count,
        "positive_count": positive_count,
        "negative_count": negative_count,
        "positive_rate": round(positive_rate, 1),
        "negative_rate": round(negative_rate, 1),
        "risk_score": round(risk_score, 1),
        "action_required_count": action_required_count,
        "average_confidence": round(confidence_total / confidence_count, 4) if confidence_count else 0,
        "top_positive_keywords": most_common_keywords(positive_keywords),
        "top_negative_keywords": most_common_keywords(negative_keywords),
        "recommendation": build_recommendation(positive_rate, risk_score),
        "data_source": "scraped_reviews",
    }


@router.post("/restaurants")
async def compare_restaurants(req: CompareRestaurantsRequest):
    verify_vip_user(req.user_id)

    if len(req.restaurants) < 2:
        raise HTTPException(status_code=400, detail="Cần ít nhất 2 quán để so sánh.")
    if len(req.restaurants) > 3:
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ tối đa 3 quán/lần.")

    comparable_urls = [canonicalize_url(item.url) for item in req.restaurants]
    if any(not url for url in comparable_urls):
        raise HTTPException(status_code=400, detail="Đường dẫn quán không hợp lệ.")
    if len(set(comparable_urls)) != len(comparable_urls):
        raise HTTPException(status_code=400, detail="Không thể so sánh hai quán có cùng đường dẫn.")

    results = []
    try:
        for index, item in enumerate(req.restaurants):
            reviews, was_auto_scraped = await get_or_collect_reviews(req.user_id, item, index)
            result = aggregate_restaurant(item, reviews, index)
            result["auto_scraped"] = was_auto_scraped
            results.append(result)
    except HTTPException:
        raise
    except Exception as error:
        print(f"Không thể tổng hợp dữ liệu compare: {error}")
        raise HTTPException(status_code=500, detail="Không thể đọc dữ liệu phản hồi để so sánh.")

    return {
        "success": True,
        "data": results,
        "message": "Đã cào dữ liệu mới khi cần và so sánh bằng dữ liệu thật trong Supabase.",
    }


@router.get("/history")
async def get_comparison_history(user_id: str):
    verify_vip_user(user_id)

    try:
        sessions_response = (
            supabase.table("comparison_sessions")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        sessions = sessions_response.data or []
        if not sessions:
            return {"success": True, "data": []}

        session_ids = [item["id"] for item in sessions]
        items_response = (
            supabase.table("comparison_items")
            .select("*")
            .in_("comparison_id", session_ids)
            .execute()
        )
        items_by_session = {}
        for item in items_response.data or []:
            items_by_session.setdefault(item.get("comparison_id"), []).append(item)

        return {
            "success": True,
            "data": [
                {**session, "items": items_by_session.get(session["id"], [])}
                for session in sessions
            ],
        }
    except Exception as error:
        print(f"Không thể tải history compare: {error}")
        raise HTTPException(status_code=500, detail="Không thể tải lịch sử so sánh.")


@router.post("/save")
async def save_comparison(req: SaveComparisonRequest):
    verify_vip_user(req.user_id)

    if not req.items:
        raise HTTPException(status_code=400, detail="Không có kết quả so sánh để lưu.")

    try:
        session_response = (
            supabase.table("comparison_sessions")
            .insert({"user_id": req.user_id, "title": req.title or "Lịch sử so sánh quán"})
            .execute()
        )
        if not session_response.data:
            raise HTTPException(status_code=500, detail="Không thể tạo phiên so sánh.")

        comparison_id = session_response.data[0]["id"]
        item_payloads = []
        for item in req.items:
            item_payloads.append({
                "comparison_id": comparison_id,
                "restaurant_name": item.get("restaurant_name") or item.get("name") or "Không rõ tên quán",
                "source_url": item.get("source_url") or item.get("url") or "",
                "total_reviews": safe_int(item.get("total_reviews")),
                "positive_count": safe_int(item.get("positive_count")),
                "negative_count": safe_int(item.get("negative_count")),
                "positive_rate": safe_float(item.get("positive_rate")),
                "negative_rate": safe_float(item.get("negative_rate")),
                "risk_score": safe_float(item.get("risk_score")),
                "top_positive_keywords": normalize_keywords(item.get("top_positive_keywords"))[:5],
                "top_negative_keywords": normalize_keywords(item.get("top_negative_keywords"))[:5],
                "recommendation": item.get("recommendation") or "",
            })

        supabase.table("comparison_items").insert(item_payloads).execute()
        return {
            "success": True,
            "message": "Đã lưu lịch sử so sánh.",
            "comparison_id": comparison_id,
        }
    except HTTPException:
        raise
    except Exception as error:
        print(f"Không thể lưu history compare: {error}")
        raise HTTPException(status_code=500, detail="Không thể lưu lịch sử so sánh.")


@router.delete("/history/{comparison_id}")
async def delete_comparison_history(comparison_id: str, user_id: str):
    verify_vip_user(user_id)

    try:
        session_response = (
            supabase.table("comparison_sessions")
            .select("id, user_id")
            .eq("id", comparison_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not session_response.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy lịch sử so sánh cần xóa.")

        supabase.table("comparison_items").delete().eq("comparison_id", comparison_id).execute()
        supabase.table("comparison_sessions").delete().eq("id", comparison_id).eq("user_id", user_id).execute()
        return {"success": True, "message": "Đã xóa lịch sử so sánh."}
    except HTTPException:
        raise
    except Exception as error:
        print(f"Không thể xóa history compare: {error}")
        raise HTTPException(status_code=500, detail="Không thể xóa lịch sử so sánh.")
