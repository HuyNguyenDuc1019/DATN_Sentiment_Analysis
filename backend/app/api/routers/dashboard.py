from fastapi import APIRouter, HTTPException
from typing import Optional
from collections import Counter
from datetime import datetime
import unicodedata
import re
import time

from app.database import supabase

router = APIRouter(tags=["Dashboard & Alerts"])


def get_dynamic_keywords():
    """Hàm kéo từ khóa động từ bảng system_settings"""
    try:
        res = (
            supabase
            .table("system_settings")
            .select("danger_keywords, positive_keywords, negative_signal_keywords")
            .eq("id", 1)
            .execute()
        )
        if res.data:
            row = res.data[0]
            return (
                row.get("danger_keywords") or [],
                row.get("positive_keywords") or [],
                row.get("negative_signal_keywords") or []
            )
    except Exception as e:
        print(f"Lỗi kéo từ khóa động từ Supabase: {e}")

    # Fallback mặc định an toàn nếu DB chưa có dữ liệu hoặc lỗi mạng
    default_danger = [
        "tệ", "dở", "chán", "bẩn", "mất vệ sinh", "không ngon", "quá lâu",
        "chờ lâu", "đợi lâu", "phục vụ kém", "thái độ", "khó chịu", "đắt",
        "mắc", "không đáng tiền", "thất vọng", "lừa", "sai món", "thiếu món",
        "nguội", "mặn", "nhạt",
    ]
    default_positive = [
        "ngon", "ngon quá", "rất ngon", "tuyệt", "tốt", "hài lòng",
        "đáng tiền", "sạch sẽ", "nhanh", "nhiệt tình", "thân thiện", "sẽ quay lại",
    ]
    default_negative_signal = [
        *default_danger,
        "không ngon", "không sạch", "không hài lòng", "không đáng",
        "không hợp", "không quay lại", "chưa tốt", "quá tệ",
        "thất vọng", "đau bụng", "ngộ độc", "ruồi", "dị vật",
        "hôi", "sống",
    ]
    return default_danger, default_positive, default_negative_signal


def normalize_text(value):
    text = str(value or "").lower().strip()
    text = unicodedata.normalize("NFD", text)
    text = "".join(char for char in text if unicodedata.category(char) != "Mn")
    text = text.replace("đ", "d")
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def normalize_text_with_accents(value):
    text = str(value or "").lower().strip()
    text = re.sub(r"[^\w\sÀ-ỹ]", " ", text, flags=re.UNICODE)
    return re.sub(r"\s+", " ", text).strip()


def contains_normalized_phrase(target, keyword):
    raw_target = normalize_text_with_accents(target)
    raw_keyword = normalize_text_with_accents(keyword)
    normalized_target = normalize_text(target)
    normalized_keyword = normalize_text(keyword)

    if not normalized_target or not normalized_keyword:
        return False

    raw_pattern = rf"(?:^|\s){re.escape(raw_keyword)}(?:$|\s)"
    if re.search(raw_pattern, raw_target) is not None:
        return True

    if len(normalized_keyword) <= 3 and raw_keyword != normalized_keyword:
        return False

    pattern = rf"(?:^|\s){re.escape(normalized_keyword)}(?:$|\s)"
    return re.search(pattern, normalized_target) is not None


def is_negative_label(value):
    if value in [0, "0", False]:
        return True

    text = normalize_text(value)
    return text in [
        "negative", "neg", "label 0", "tieu cuc",
        "khach chua hai long", "chua hai long",
    ]


def is_positive_label(value):
    if value in [1, "1", True]:
        return True

    text = normalize_text(value)
    return text in [
        "positive", "pos", "label 1", "tich cuc",
        "khach hai long", "hai long",
    ]


def get_review_content(item):
    return str(
        item.get("content")
        or item.get("comment")
        or item.get("text")
        or item.get("review")
        or item.get("original_content")
        or ""
    )


def get_content_key(item):
    return normalize_text(get_review_content(item))


def get_keywords(item):
    keywords = item.get("keywords") or []

    if isinstance(keywords, list):
        return keywords

    if isinstance(keywords, str):
        return [keyword.strip() for keyword in keywords.split(",") if keyword.strip()]

    return []


def has_danger_keyword(item, danger_keywords):
    content = get_review_content(item)
    keywords = " ".join(str(keyword) for keyword in get_keywords(item))
    target = f"{content} {keywords}"
    return any(contains_normalized_phrase(target, keyword) for keyword in danger_keywords)


def has_negative_signal(item, negative_signal_keywords):
    content = get_review_content(item)
    keywords = " ".join(str(keyword) for keyword in get_keywords(item))
    target = f"{content} {keywords}"
    return any(contains_normalized_phrase(target, keyword) for keyword in negative_signal_keywords)


def is_clearly_positive(item, positive_keywords, negative_signal_keywords):
    content = get_review_content(item)
    has_positive = any(contains_normalized_phrase(content, keyword) for keyword in positive_keywords)
    return has_positive and not has_negative_signal(item, negative_signal_keywords)


def is_actionable_alert(item, danger_keywords, positive_keywords, negative_signal_keywords):
    if has_danger_keyword(item, danger_keywords):
        return True

    if is_clearly_positive(item, positive_keywords, negative_signal_keywords):
        return False

    return is_negative_label(item.get("ai_label")) and has_negative_signal(item, negative_signal_keywords)


def normalize_confidence(value):
    try:
        number = float(value or 0)
    except Exception:
        return 0

    if number > 1:
        return number / 100

    return number


def parse_time(value):
    if not value:
        return 0
    try:
        value = str(value).replace("Z", "+00:00")
        return datetime.fromisoformat(value).timestamp()
    except Exception:
        return 0


def get_review_time(item):
    return parse_time(
        item.get("review_date")
        or item.get("created_at")
        or item.get("updated_at")
    )


def calculate_alert_score(item, danger_keywords):
    score = 0

    if item.get("is_action_required"):
        score += 100

    if has_danger_keyword(item, danger_keywords):
        score += 40

    confidence = normalize_confidence(item.get("confidence"))
    score += confidence * 20

    review_time = get_review_time(item)

    if review_time:
        age_hours = max(0, (time.time() - review_time) / 3600)
        recency_score = max(0, 10 - age_hours / 24)
        score += recency_score

    return score


def unique_by_content(items):
    seen = set()
    result = []
    for item in items:
        key = get_content_key(item)
        if not key or key in seen:
            continue
        seen.add(key)
        result.append(item)
    return result


def build_alerts(rows, danger_keywords, positive_keywords, negative_signal_keywords, limit=20):
    negative_rows = [
        item for item in rows
        if is_actionable_alert(item, danger_keywords, positive_keywords, negative_signal_keywords) and get_content_key(item)
    ]

    tier_1 = [
        item for item in negative_rows
        if item.get("is_action_required")
    ]

    tier_2 = [
        item for item in negative_rows
        if not item.get("is_action_required") and has_danger_keyword(item, danger_keywords)
    ]

    tier_3 = [
        item for item in negative_rows
        if not item.get("is_action_required") and not has_danger_keyword(item, danger_keywords)
    ]

    picked = []
    seen = set()

    def add_items(items):
        nonlocal picked

        # Định nghĩa hàm sắp xếp bên trong để có thể dùng biến danger_keywords
        def sort_key(item):
            return (
                -calculate_alert_score(item, danger_keywords),
                -get_review_time(item),
                -normalize_confidence(item.get("confidence")),
                str(item.get("id") or ""),
                get_content_key(item),
            )

        for item in sorted(items, key=sort_key):
            if len(picked) >= limit:
                return

            key = get_content_key(item)

            if not key or key in seen:
                continue

            seen.add(key)
            picked.append(item)

    add_items(tier_1)
    add_items(tier_2)
    add_items(tier_3)

    return picked[:limit]


@router.get("/api/last-scraped")
async def get_last_scraped(source_url: str, user_id: str):
    try:
        response = (
            supabase
            .table("scraped_reviews")
            .select("review_date")
            .eq("source_url", source_url)
            .eq("user_id", user_id)
            .order("review_date", desc=True)
            .limit(1)
            .execute()
        )

        if response.data and len(response.data) > 0:
            return {"last_scraped_date": response.data[0].get("review_date")}

        return {"last_scraped_date": None}

    except Exception as e:
        print("Lỗi truy vấn ngày cào:", e)
        return {"last_scraped_date": None}


@router.get("/api/dashboard/alerts")
async def get_dashboard_alerts(source_url: str, user_id: str):
    try:
        # Bước 1: Kéo danh sách từ khóa động từ Database
        danger_kws, positive_kws, negative_signal_kws = get_dynamic_keywords()

        # Bước 2: Kéo dữ liệu bình luận của user
        query = (
            supabase
            .table("scraped_reviews")
            .select(
                "id, content, review_date, created_at, keywords, "
                "ai_label, confidence, is_action_required, source_url, "
                "dataset_type, dataset_name"
            )
            .eq("user_id", user_id)
            .order("review_date", desc=True)
            .limit(300)
        )

        if source_url and source_url != "all":
            query = query.eq("source_url", source_url)

        response = query.execute()
        rows = response.data or []

        # Bước 3: Đưa từ khóa động vào thuật toán để phân loại
        alerts = build_alerts(rows, danger_kws, positive_kws, negative_signal_kws, limit=20)

        return {"alerts": alerts}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Lỗi API dashboard alerts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/dashboard/keyword-analytics")
async def get_keyword_analytics(user_id: str, source_url: Optional[str] = None):
    try:
        query = (
            supabase
            .table("scraped_reviews")
            .select("ai_label, keywords")
            .eq("user_id", user_id)
        )

        if source_url and source_url != "all":
            query = query.eq("source_url", source_url)

        response = query.execute()
        data = response.data or []

        pos_keywords = []
        neg_keywords = []

        for item in data:
            kws = item.get("keywords") or []

            if isinstance(kws, str):
                kws = [keyword.strip() for keyword in kws.split(",") if keyword.strip()]

            if not isinstance(kws, list):
                kws = []

            if is_positive_label(item.get("ai_label")):
                pos_keywords.extend(kws)
            elif is_negative_label(item.get("ai_label")):
                neg_keywords.extend(kws)

        pos_counts = Counter(pos_keywords)
        neg_counts = Counter(neg_keywords)

        leaderboard_data = {
            "top_positive": [{"keyword": k.capitalize(), "count": v} for k, v in pos_counts.most_common(5)],
            "top_negative": [{"keyword": k.capitalize(), "count": v} for k, v in neg_counts.most_common(5)],
        }

        wordcloud_data = []

        for kw, count in pos_counts.most_common(20):
            wordcloud_data.append({"text": kw.capitalize(), "value": count * 10, "sentiment": "positive"})

        for kw, count in neg_counts.most_common(20):
            wordcloud_data.append({"text": kw.capitalize(), "value": count * 10, "sentiment": "negative"})

        return {
            "leaderboard": leaderboard_data,
            "wordcloud": wordcloud_data,
        }

    except Exception as e:
        print(f"Lỗi API keyword analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))