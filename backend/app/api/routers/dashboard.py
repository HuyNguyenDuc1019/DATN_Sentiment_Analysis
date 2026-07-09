from fastapi import APIRouter, HTTPException
from typing import Optional
from collections import Counter
import unicodedata
import re
import time
from app.database import supabase

router = APIRouter(tags=["Dashboard & Alerts"])


DANGER_KEYWORDS = [
    "tệ",
    "dở",
    "chán",
    "bẩn",
    "mất vệ sinh",
    "không ngon",
    "quá lâu",
    "chờ lâu",
    "đợi lâu",
    "phục vụ kém",
    "thái độ",
    "khó chịu",
    "đắt",
    "mắc",
    "không đáng tiền",
    "thất vọng",
    "lừa",
    "sai món",
    "thiếu món",
    "nguội",
    "mặn",
    "nhạt",
]


def normalize_text(value):
    text = str(value or "").lower().strip()
    text = unicodedata.normalize("NFD", text)
    text = "".join(char for char in text if unicodedata.category(char) != "Mn")
    text = text.replace("đ", "d")
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def is_negative_label(value):
    """
    Chỉ xem là tiêu cực khi nhãn AI thật sự là negative / 0.
    Không cảnh báo bình luận tích cực dù có keyword nhạy cảm.
    """
    if value in [0, "0", False]:
        return True

    text = normalize_text(value)

    return text in [
        "negative",
        "neg",
        "label 0",
        "tieu cuc",
        "khach chua hai long",
        "chua hai long",
    ]


def is_positive_label(value):
    if value in [1, "1", True]:
        return True

    text = normalize_text(value)

    return text in [
        "positive",
        "pos",
        "label 1",
        "tich cuc",
        "khach hai long",
        "hai long",
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
        return [
            keyword.strip()
            for keyword in keywords.split(",")
            if keyword.strip()
        ]

    return []


def has_danger_keyword(item):
    content = normalize_text(get_review_content(item))
    keywords = " ".join(normalize_text(keyword) for keyword in get_keywords(item))
    target = f"{content} {keywords}"

    return any(
        normalize_text(keyword) in target
        for keyword in DANGER_KEYWORDS
    )


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
        # Supabase thường trả ISO string.
        # Thay Z để Python đọc được timezone UTC.
        value = str(value).replace("Z", "+00:00")
        from datetime import datetime
        return datetime.fromisoformat(value).timestamp()
    except Exception:
        return 0


def get_review_time(item):
    return parse_time(
        item.get("review_date")
        or item.get("created_at")
        or item.get("updated_at")
    )


def calculate_alert_score(item):
    score = 0

    if item.get("is_action_required"):
        score += 100

    if has_danger_keyword(item):
        score += 40

    confidence = normalize_confidence(item.get("confidence"))
    score += confidence * 20

    review_time = get_review_time(item)

    if review_time:
        age_hours = max(0, (time.time() - review_time) / 3600)
        recency_score = max(0, 10 - age_hours / 24)
        score += recency_score

    return score


def sort_alerts_stable(item):
    """
    Sort ổn định:
    - Điểm cảnh báo cao trước
    - Ngày mới trước
    - Confidence cao trước
    - id/content để tránh nhảy lung tung
    """
    return (
        -calculate_alert_score(item),
        -get_review_time(item),
        -normalize_confidence(item.get("confidence")),
        str(item.get("id") or ""),
        get_content_key(item),
    )


def unique_by_content(items):
    seen = set()
    result = []

    for item in items:
        key = get_content_key(item)

        if not key:
            continue

        if key in seen:
            continue

        seen.add(key)
        result.append(item)

    return result


def build_alerts(rows, limit=20):
    """
    Tầng 1: tiêu cực + is_action_required
    Tầng 2: tiêu cực + keyword nguy hiểm
    Tầng 3: tiêu cực còn lại
    """
    negative_rows = [
        item for item in rows
        if is_negative_label(item.get("ai_label")) and get_content_key(item)
    ]

    tier_1 = [
        item for item in negative_rows
        if item.get("is_action_required")
    ]

    tier_2 = [
        item for item in negative_rows
        if not item.get("is_action_required") and has_danger_keyword(item)
    ]

    tier_3 = [
        item for item in negative_rows
        if not item.get("is_action_required") and not has_danger_keyword(item)
    ]

    picked = []
    seen = set()

    def add_items(items):
        nonlocal picked

        for item in sorted(items, key=sort_alerts_stable):
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
            return {
                "last_scraped_date": response.data[0].get("review_date"),
            }

        return {
            "last_scraped_date": None,
        }

    except Exception as e:
        print("Lỗi truy vấn ngày cào:", e)
        return {
            "last_scraped_date": None,
        }


@router.get("/api/dashboard/alerts")
async def get_dashboard_alerts(source_url: str, user_id: str):
    try:
        profile = (
            supabase
            .table("profiles")
            .select("tier")
            .eq("id", user_id)
            .single()
            .execute()
        )

        is_vip = profile.data and profile.data.get("tier") == "vip"

        if not is_vip:
            raise HTTPException(
                status_code=403,
                detail="Tính năng Cảnh báo Đỏ chỉ dành cho tài khoản VIP.",
            )

        # Lấy nhiều hơn 20 để còn lọc trùng, lọc tiêu cực, chấm điểm.
        # Không chỉ lấy is_action_required nữa, vì nếu không đủ thì cần bổ sung
        # các bình luận tiêu cực khác.
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

        alerts = build_alerts(rows, limit=20)

        return {
            "alerts": alerts,
        }

    except HTTPException:
        raise

    except Exception as e:
        print(f"Lỗi API dashboard alerts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/dashboard/keyword-analytics")
async def get_keyword_analytics(user_id: str, source_url: Optional[str] = None):
    try:
        profile_res = (
            supabase
            .table("profiles")
            .select("tier")
            .eq("id", user_id)
            .single()
            .execute()
        )

        is_vip = profile_res.data and profile_res.data.get("tier") == "vip"

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
                kws = [
                    keyword.strip()
                    for keyword in kws.split(",")
                    if keyword.strip()
                ]

            if not isinstance(kws, list):
                kws = []

            if is_positive_label(item.get("ai_label")):
                pos_keywords.extend(kws)
            elif is_negative_label(item.get("ai_label")):
                neg_keywords.extend(kws)

        pos_counts = Counter(pos_keywords)
        neg_counts = Counter(neg_keywords)

        leaderboard_data = {
            "top_positive": [
                {
                    "keyword": k.capitalize(),
                    "count": v,
                }
                for k, v in pos_counts.most_common(5)
            ],
            "top_negative": [
                {
                    "keyword": k.capitalize(),
                    "count": v,
                }
                for k, v in neg_counts.most_common(5)
            ],
        }

        wordcloud_data = []

        if is_vip:
            for kw, count in pos_counts.most_common(20):
                wordcloud_data.append({
                    "text": kw.capitalize(),
                    "value": count * 10,
                    "sentiment": "positive",
                })

            for kw, count in neg_counts.most_common(20):
                wordcloud_data.append({
                    "text": kw.capitalize(),
                    "value": count * 10,
                    "sentiment": "negative",
                })

        return {
            "leaderboard": leaderboard_data,
            "wordcloud": wordcloud_data,
        }

    except Exception as e:
        print(f"Lỗi API keyword analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))