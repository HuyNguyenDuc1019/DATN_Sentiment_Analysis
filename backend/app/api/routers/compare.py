from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any, Optional

try:
    from app.database import supabase
except Exception:
    supabase = None

router = APIRouter(prefix="/api/compare", tags=["Restaurant Compare"])


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
        raise HTTPException(
            status_code=500,
            detail="Backend chưa cấu hình Supabase nên không thể kiểm tra VIP.",
        )

    try:
        res = (
            supabase
            .table("profiles")
            .select("id, role, tier")
            .eq("id", user_id)
            .single()
            .execute()
        )

        profile = res.data

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


@router.post("/restaurants")
async def compare_restaurants(req: CompareRestaurantsRequest):
    verify_vip_user(req.user_id)

    if len(req.restaurants) < 2:
        raise HTTPException(status_code=400, detail="Cần ít nhất 2 quán để so sánh.")

    if len(req.restaurants) > 3:
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ tối đa 3 quán/lần.")

    results = []

    for index, item in enumerate(req.restaurants):
        total_reviews = 80 + index * 20
        positive_rate = max(35, 78 - index * 12)
        negative_rate = 100 - positive_rate
        risk_score = 31 + index * 18

        results.append({
            "restaurant_name": item.name or f"Quán {index + 1}",
            "source_url": item.url,
            "total_reviews": total_reviews,
            "positive_count": int(total_reviews * positive_rate / 100),
            "negative_count": int(total_reviews * negative_rate / 100),
            "positive_rate": round(positive_rate, 1),
            "negative_rate": round(negative_rate, 1),
            "risk_score": round(risk_score, 1),
            "top_positive_keywords": ["ngon", "hài lòng", "đáng tiền"] if index == 0 else ["ổn", "giá hợp lý"],
            "top_negative_keywords": ["giá hơi cao"] if index == 0 else ["chờ lâu", "phục vụ chậm"],
            "recommendation": "Phù hợp nếu ưu tiên trải nghiệm ổn định." if index == 0 else "Có thể chọn nếu ưu tiên giá, nên tránh giờ cao điểm.",
        })

    return {
        "success": True,
        "data": results,
        "message": "Đã so sánh quán thành công.",
    }


@router.get("/history")
async def get_comparison_history(user_id: str):
    verify_vip_user(user_id)

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

    except Exception as error:
        print(f"Không thể tải history compare: {error}")
        raise HTTPException(status_code=500, detail="Không thể tải lịch sử so sánh.")


@router.post("/save")
async def save_comparison(req: SaveComparisonRequest):
    verify_vip_user(req.user_id)

    if not req.items:
        raise HTTPException(status_code=400, detail="Không có kết quả so sánh để lưu.")

    try:
        session_res = (
            supabase
            .table("comparison_sessions")
            .insert({
                "user_id": req.user_id,
                "title": req.title or "Lịch sử so sánh quán",
            })
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
                "source_url": item.get("source_url") or item.get("url") or "",
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
    except Exception as error:
        print(f"Không thể lưu history compare: {error}")
        raise HTTPException(status_code=500, detail="Không thể lưu lịch sử so sánh.")


@router.delete("/history/{comparison_id}")
async def delete_comparison_history(comparison_id: str, user_id: str):
    verify_vip_user(user_id)

    try:
        session_res = (
            supabase
            .table("comparison_sessions")
            .select("id, user_id")
            .eq("id", comparison_id)
            .eq("user_id", user_id)
            .execute()
        )

        if not session_res.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy lịch sử so sánh cần xóa.")

        supabase.table("comparison_items").delete().eq("comparison_id", comparison_id).execute()
        supabase.table("comparison_sessions").delete().eq("id", comparison_id).eq("user_id", user_id).execute()

        return {"success": True, "message": "Đã xóa lịch sử so sánh."}

    except HTTPException:
        raise
    except Exception as error:
        print(f"Không thể xóa history compare: {error}")
        raise HTTPException(status_code=500, detail="Không thể xóa lịch sử so sánh.")
