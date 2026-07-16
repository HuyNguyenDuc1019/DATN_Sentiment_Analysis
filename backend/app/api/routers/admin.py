from fastapi import APIRouter, HTTPException, Depends, Query, Request
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta, timezone
from collections import defaultdict
import io
import csv
from fastapi.responses import StreamingResponse
from app.database import supabase

router = APIRouter(prefix="/api/admin", tags=["Admin"])


class AdminActionRequest(BaseModel):
    admin_id: str
    target_user_id: str
    action: str


class AdminFeedbackReview(BaseModel):
    admin_id: str
    feedback_id: str
    action: str


class AdminSettingUpdate(BaseModel):
    admin_id: str
    ai_threshold: float
    max_upload_size: int
    custom_dictionary: str
    crisis_alert_enabled: bool
    aspect_dictionary: dict
    data_retention_days: int


class AdminFeedbackDetailReview(BaseModel):
    admin_id: str
    feedback_id: str
    action: str
    reason: Optional[str] = None
    new_label: Optional[int] = None


class AdminFeedbackBulkReview(BaseModel):
    admin_id: str
    feedback_ids: list[str]
    action: str
    reason: Optional[str] = None
    new_label: Optional[int] = None


class AdminFeedbackExportSelected(BaseModel):
    admin_id: str
    feedback_ids: list[str]


class AdminRetrainFlagRequest(BaseModel):
    admin_id: str
    feedback_id: str
    include_retrain: bool


class AdminAdvancedDatasetExportRequest(BaseModel):
    admin_id: str
    mode: str = "all"
    low_confidence_threshold: float = 0.5


def verify_admin(admin_id: str):
    try:
        response = (
            supabase
            .table("profiles")
            .select("role")
            .eq("id", admin_id)
            .execute()
        )

        if not response.data or response.data[0].get("role") != "admin":
            raise HTTPException(
                status_code=403,
                detail="Cảnh báo: Lĩnh vực tuyệt mật! Bạn không có quyền Admin.",
            )

    except Exception as e:
        if isinstance(e, HTTPException):
            raise e

        raise HTTPException(status_code=500, detail="Lỗi kiểm tra quyền truy cập.")

    return admin_id


def normalize_ai_label(value):
    if value in [1, "1", True, "positive", "POSITIVE", "tích cực", "Tích cực"]:
        return 1

    if value in [0, "0", False, "negative", "NEGATIVE", "tiêu cực", "Tiêu cực"]:
        return 0

    try:
        return 1 if int(value) == 1 else 0
    except Exception:
        return 0


def safe_count_rows(response):
    if hasattr(response, "count") and response.count is not None:
        return response.count

    return len(response.data or [])


def _append_review_history(feedback_id: str, entry: dict):
    try:
        current = (
            supabase
            .table("feedback_data")
            .select("review_history")
            .eq("id", feedback_id)
            .single()
            .execute()
        )

        history = (current.data or {}).get("review_history") or []
        history.append(entry)

        (
            supabase
            .table("feedback_data")
            .update({"review_history": history})
            .eq("id", feedback_id)
            .execute()
        )

    except Exception as e:
        print(f"⚠️ Không thể ghi review_history: {e}")


@router.get("/users")
async def get_admin_users(admin_id: str = Depends(verify_admin)):
    try:
        res = (
            supabase
            .table("profiles")
            .select(
                "id, email, full_name, role, status, created_at"
            )
            .order("created_at", desc=True)
            .execute()
        )

        return res.data or []

    except Exception as e:
        print(f"⚠️ LỖI API ADMIN USERS: {e}")
        return []


@router.put("/users/action")
async def update_user_action(
    request: AdminActionRequest,
    admin_id: str = Depends(verify_admin),
):
    now = datetime.utcnow()
    update_payload = {}

    if request.action == "ban":
        update_payload = {
            "status": "blocked",
        }

    elif request.action == "unban":
        update_payload = {
            "status": "active",
        }

    else:
        raise HTTPException(status_code=400, detail="Hành động không hợp lệ!")

    try:
        res = (
            supabase
            .table("profiles")
            .update(update_payload)
            .eq("id", request.target_user_id)
            .execute()
        )

        if not res.data:
            raise HTTPException(
                status_code=404,
                detail="Không tìm thấy người dùng cần cập nhật.",
            )

        try:
            action_message = {
                "ban": "khóa tài khoản",
                "unban": "mở khóa tài khoản",
            }.get(request.action, request.action)

            supabase.table("admin_activity_logs").insert({
                "admin_id": admin_id,
                "admin_name": "Admin",
                "action_type": request.action,
                "target_type": "user",
                "target_id": request.target_user_id,
                "description": f"Admin đã {action_message} cho người dùng.",
                "created_at": now.isoformat(),
            }).execute()

        except Exception as log_error:
            print(f"⚠️ Không thể ghi admin_activity_logs: {log_error}")

        return {
            "status": "success",
            "message": f"Đã thực hiện thao tác {request.action} thành công.",
            "updated_data": res.data,
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/feedback")
async def get_admin_feedbacks(admin_id: str = Depends(verify_admin)):
    try:
        feedback_res = (
            supabase
            .table("feedback_data")
            .select("*")
            .order("created_at", desc=True)
            .execute()
        )

        feedback_rows = feedback_res.data or []

        profiles_res = (
            supabase
            .table("profiles")
            .select("id, email, full_name")
            .execute()
        )

        profiles_dict = {
            p["id"]: p
            for p in (profiles_res.data or [])
        }

        reviews_res = (
            supabase
            .table("scraped_reviews")
            .select("id, user_id, content, ai_label, confidence, created_at")
            .order("created_at", desc=True)
            .execute()
        )

        reviews = reviews_res.data or []

        review_lookup = {}

        for review in reviews:
            key = (
                review.get("user_id"),
                (review.get("content") or "").strip().lower(),
                str(review.get("ai_label")),
            )

            if key not in review_lookup:
                review_lookup[key] = review.get("confidence")

        result = []

        for item in feedback_rows:
            item["profiles"] = profiles_dict.get(item.get("user_id"))

            key = (
                item.get("user_id"),
                (item.get("original_content") or "").strip().lower(),
                str(item.get("old_ai_label")),
            )

            item["ai_confidence"] = review_lookup.get(key)
            result.append(item)

        return result

    except Exception as e:
        print(f"⚠️ LỖI API FEEDBACK: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/feedback/paged")
async def get_admin_feedbacks_paged(
    status: str = "pending",
    search: Optional[str] = None,
    confidence: str = "all",
    mismatch: str = "all",
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    priority: str = "all",
    cursor_created_at: Optional[str] = None,
    cursor_id: Optional[str] = None,
    limit: int = Query(default=50, ge=1, le=200),
    admin_id: str = Depends(verify_admin),
):
    try:
        response = supabase.rpc(
            "get_admin_feedback_queue",
            {
                "p_status": status,
                "p_search": search,
                "p_confidence": confidence,
                "p_mismatch": mismatch,
                "p_date_from": date_from,
                "p_date_to": date_to,
                "p_priority": priority,
                "p_before_created_at": cursor_created_at,
                "p_before_id": cursor_id,
                "p_limit": limit,
            },
        ).execute()

        rows = response.data or []
        has_more = len(rows) > limit
        page_rows = rows[:limit]

        for item in page_rows:
            item["profiles"] = {
                "id": item.get("user_id"),
                "email": item.pop("profile_email", None),
                "full_name": item.pop("profile_full_name", None),
            }

        last_item = page_rows[-1] if page_rows else None

        return {
            "items": page_rows,
            "has_more": has_more,
            "next_cursor": {
                "created_at": last_item.get("created_at"),
                "id": last_item.get("id"),
            } if last_item else None,
        }

    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error


@router.get("/feedback/stats")
async def get_admin_feedback_stats(admin_id: str = Depends(verify_admin)):
    try:
        response = supabase.rpc("get_admin_feedback_stats").execute()
        data = response.data or {}

        if isinstance(data, list):
            data = data[0] if data else {}

        return data

    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error


@router.put("/feedback/bulk-review-fast")
async def bulk_review_feedback_fast(
    request: AdminFeedbackBulkReview,
    admin_id: str = Depends(verify_admin),
):
    if not request.feedback_ids:
        raise HTTPException(status_code=400, detail="Chưa chọn phản hồi nào.")

    if request.action in ("reject", "edit_label") and not (request.reason and request.reason.strip()):
        raise HTTPException(
            status_code=400,
            detail="Vui lòng nhập lý do trước khi từ chối/sửa nhãn hàng loạt.",
        )

    if request.action == "edit_label" and request.new_label not in (0, 1):
        raise HTTPException(status_code=400, detail="Nhãn mới phải là 0 hoặc 1.")

    try:
        response = supabase.rpc(
            "admin_bulk_review_feedback",
            {
                "p_admin_id": admin_id,
                "p_feedback_ids": request.feedback_ids,
                "p_action": request.action,
                "p_reason": request.reason,
                "p_new_label": request.new_label,
            },
        ).execute()

        affected = response.data or 0
        if isinstance(affected, list):
            affected = affected[0] if affected else 0

        return {
            "status": "success",
            "processed": affected,
            "message": f"Đã xử lý {affected} phản hồi.",
        }

    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error


@router.put("/feedback/review")
async def review_feedback(
    request: AdminFeedbackReview,
    admin_id: str = Depends(verify_admin),
):
    try:
        status = "approved" if request.action == "approve" else "rejected"

        (
            supabase
            .table("feedback_data")
            .update({"status": status})
            .eq("id", request.feedback_id)
            .execute()
        )

        return {
            "status": "success",
            "message": f"Đã thực hiện {status} mẫu dữ liệu này thành công.",
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/dataset/export")
async def export_retrain_dataset(admin_id: str = Depends(verify_admin)):
    try:
        response = (
            supabase
            .table("feedback_data")
            .select("original_content, corrected_label")
            .eq("status", "approved")
            .execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=404,
                detail="Chưa có dữ liệu nào được duyệt để xuất bộ dữ liệu.",
            )

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["text", "label"])

        for item in response.data:
            writer.writerow([
                item["original_content"],
                item["corrected_label"],
            ])

        output.seek(0)

        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={
                "Content-Disposition": "attachment; filename=phobert_retrain_dataset.csv"
            },
        )

    except Exception as e:
        if isinstance(e, HTTPException):
            raise e

        raise HTTPException(status_code=500, detail=str(e))


@router.get("/settings")
async def get_system_settings(admin_id: str = Depends(verify_admin)):
    try:
        res = (
            supabase
            .table("system_settings")
            .select("*")
            .eq("id", 1)
            .execute()
        )

        if not res.data:
            return {
                "ai_threshold": 0.75,
                "max_upload_size": 5,
                "data_retention_days": 30,
                "custom_dictionary": "",
                "crisis_alert_enabled": True,
                "aspect_dictionary": {},
            }

        return res.data[0]

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/settings")
async def update_system_settings(
    request: AdminSettingUpdate,
    admin_id: str = Depends(verify_admin),
):
    try:
        (
            supabase
            .table("system_settings")
            .update({
                "ai_threshold": request.ai_threshold,
                "max_upload_size": request.max_upload_size,
                "custom_dictionary": request.custom_dictionary,
                "crisis_alert_enabled": request.crisis_alert_enabled,
                "aspect_dictionary": request.aspect_dictionary,
                "data_retention_days": request.data_retention_days,
            })
            .eq("id", 1)
            .execute()
        )

        return {
            "status": "success",
            "message": "Đã cập nhật cấu hình hệ thống toàn diện!",
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/metrics")
async def get_admin_metrics(admin_id: str = Depends(verify_admin)):
    try:
        response = supabase.rpc("get_admin_dashboard_metrics").execute()
        data = response.data or {}

        if isinstance(data, list):
            data = data[0] if data else {}

        return {
            "total_analyzed_reviews": int(data.get("total_analyzed_reviews") or 0),
            "total_api_calls": int(data.get("total_analyzed_reviews") or 0),
            "total_users": int(data.get("total_users") or 0),
            "pending_feedbacks": int(data.get("pending_feedbacks") or 0),
            "global_positive_ratio": float(data.get("global_positive_ratio") or 0),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/metrics/sentiment-chart")
async def get_admin_sentiment_chart(
    admin_id: str = Depends(verify_admin),
    days: int = 7,
):
    try:
        safe_days = max(int(days or 7), 1)
        response = (
            supabase
            .rpc("get_admin_sentiment_chart", {"p_days": safe_days})
            .execute()
        )

        chart_data = response.data or []

        return {
            "chart_data": chart_data,
        }

    except Exception as e:
        print(f"⚠️ LỖI API ADMIN SENTIMENT CHART: {e}")

        fallback = []
        safe_days = max(int(days or 7), 1)
        end_date = datetime.now(timezone.utc)

        for index in range(safe_days):
            day = (end_date - timedelta(days=safe_days - 1 - index)).date().isoformat()

            fallback.append({
                "date": day,
                "positive": 0,
                "negative": 0,
                "total": 0,
            })

        return {
            "chart_data": fallback,
        }


@router.get("/feedback/confidence-map")
async def get_feedback_confidence_map(admin_id: str = Depends(verify_admin)):
    try:
        feedback_res = (
            supabase
            .table("feedback_data")
            .select("id, scraped_review_id")
            .not_.is_("scraped_review_id", "null")
            .execute()
        )

        rows = feedback_res.data or []

        review_ids = list({
            row["scraped_review_id"]
            for row in rows
            if row.get("scraped_review_id")
        })

        if not review_ids:
            return {}

        reviews_res = (
            supabase
            .table("scraped_reviews")
            .select("id, confidence")
            .in_("id", review_ids)
            .execute()
        )

        confidence_by_review = {
            r["id"]: r.get("confidence")
            for r in (reviews_res.data or [])
        }

        result = {}

        for row in rows:
            rid = row.get("scraped_review_id")

            if rid and rid in confidence_by_review:
                result[row["id"]] = confidence_by_review[rid]

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))




@router.get("/feedback/{feedback_id}/detail")
async def get_admin_feedback_detail(
    feedback_id: str,
    admin_id: str = Depends(verify_admin),
):
    try:
        res = (
            supabase
            .table("feedback_data")
            .select("*")
            .eq("id", feedback_id)
            .single()
            .execute()
        )

        if not res.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy phản hồi này.")

        item = res.data

        profile_res = (
            supabase
            .table("profiles")
            .select("id, email, full_name")
            .eq("id", item.get("user_id"))
            .execute()
        )

        item["profiles"] = profile_res.data[0] if profile_res.data else None
        item["review_history"] = item.get("review_history") or []
        item["ai_confidence"] = None

        if item.get("scraped_review_id"):
            review_res = (
                supabase
                .table("scraped_reviews")
                .select("confidence")
                .eq("id", item.get("scraped_review_id"))
                .execute()
            )

            if review_res.data:
                item["ai_confidence"] = review_res.data[0].get("confidence")

        if item["ai_confidence"] is None:
            review_res = (
                supabase
                .table("scraped_reviews")
                .select("confidence, created_at")
                .eq("user_id", item.get("user_id"))
                .eq("content", item.get("original_content"))
                .eq("ai_label", item.get("old_ai_label"))
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )

            if review_res.data:
                item["ai_confidence"] = review_res.data[0].get("confidence")

        if item["ai_confidence"] is None:
            review_res = (
                supabase
                .table("scraped_reviews")
                .select("confidence, created_at")
                .eq("user_id", item.get("user_id"))
                .eq("content", item.get("original_content"))
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )

            if review_res.data:
                item["ai_confidence"] = review_res.data[0].get("confidence")

        return item

    except Exception as e:
        if isinstance(e, HTTPException):
            raise e

        raise HTTPException(status_code=500, detail=str(e))


@router.put("/feedback/review-detailed")
async def review_feedback_detailed(
    request: AdminFeedbackDetailReview,
    admin_id: str = Depends(verify_admin),
):
    if request.action in ("reject", "edit_label") and not (request.reason and request.reason.strip()):
        raise HTTPException(
            status_code=400,
            detail="Vui lòng nhập lý do trước khi từ chối hoặc sửa nhãn.",
        )

    try:
        current = (
            supabase
            .table("feedback_data")
            .select("corrected_label, status")
            .eq("id", request.feedback_id)
            .single()
            .execute()
        )

        if not current.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy phản hồi này.")

        previous_label = current.data.get("corrected_label")
        previous_status = current.data.get("status")

        update_payload = {}

        if request.action == "approve":
            update_payload["status"] = "approved"

        elif request.action == "reject":
            update_payload["status"] = "rejected"

        elif request.action == "edit_label":
            if request.new_label is None:
                raise HTTPException(status_code=400, detail="Thiếu nhãn mới (new_label).")

            update_payload["corrected_label"] = request.new_label

        else:
            raise HTTPException(status_code=400, detail="Hành động không hợp lệ!")

        (
            supabase
            .table("feedback_data")
            .update(update_payload)
            .eq("id", request.feedback_id)
            .execute()
        )

        _append_review_history(request.feedback_id, {
            "admin_id": admin_id,
            "action": request.action,
            "reason": request.reason,
            "previous_label": previous_label,
            "previous_status": previous_status,
            "new_label": request.new_label,
            "timestamp": datetime.utcnow().isoformat(),
        })

        return {
            "status": "success",
            "message": "Đã cập nhật phản hồi thành công.",
        }

    except Exception as e:
        if isinstance(e, HTTPException):
            raise e

        raise HTTPException(status_code=500, detail=str(e))


@router.put("/feedback/bulk-review")
async def bulk_review_feedback(
    request: AdminFeedbackBulkReview,
    admin_id: str = Depends(verify_admin),
):
    if not request.feedback_ids:
        raise HTTPException(status_code=400, detail="Chưa chọn phản hồi nào.")

    if request.action in ("reject", "edit_label") and not (request.reason and request.reason.strip()):
        raise HTTPException(
            status_code=400,
            detail="Vui lòng nhập lý do trước khi từ chối/sửa nhãn hàng loạt.",
        )

    try:
        if request.action == "delete":
            (
                supabase
                .table("feedback_data")
                .delete()
                .in_("id", request.feedback_ids)
                .execute()
            )

            return {
                "status": "success",
                "message": f"Đã xóa {len(request.feedback_ids)} phản hồi.",
            }

        update_payload = {}

        if request.action == "approve":
            update_payload["status"] = "approved"

        elif request.action == "reject":
            update_payload["status"] = "rejected"

        elif request.action == "edit_label":
            if request.new_label is None:
                raise HTTPException(status_code=400, detail="Thiếu nhãn mới (new_label).")

            update_payload["corrected_label"] = request.new_label

        else:
            raise HTTPException(status_code=400, detail="Hành động không hợp lệ!")

        (
            supabase
            .table("feedback_data")
            .update(update_payload)
            .in_("id", request.feedback_ids)
            .execute()
        )

        for fid in request.feedback_ids:
            _append_review_history(fid, {
                "admin_id": admin_id,
                "action": f"bulk_{request.action}",
                "reason": request.reason,
                "new_label": request.new_label,
                "timestamp": datetime.utcnow().isoformat(),
            })

        return {
            "status": "success",
            "message": f"Đã xử lý {len(request.feedback_ids)} phản hồi ({request.action}).",
        }

    except Exception as e:
        if isinstance(e, HTTPException):
            raise e

        raise HTTPException(status_code=500, detail=str(e))


@router.post("/feedback/export-selected")
async def export_selected_feedback(
    request: AdminFeedbackExportSelected,
    admin_id: str = Depends(verify_admin),
):
    try:
        if not request.feedback_ids:
            raise HTTPException(
                status_code=400,
                detail="Chưa chọn phản hồi nào để xuất.",
            )

        response = (
            supabase
            .table("feedback_data")
            .select("*")
            .in_("id", request.feedback_ids)
            .execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=404,
                detail="Không tìm thấy dữ liệu để xuất.",
            )

        output = io.StringIO()
        writer = csv.writer(output)

        writer.writerow([
            "id",
            "original_content",
            "old_ai_label",
            "corrected_label",
            "status",
            "user_id",
            "created_at",
        ])

        for item in response.data:
            writer.writerow([
                item.get("id"),
                item.get("original_content"),
                item.get("old_ai_label"),
                item.get("corrected_label"),
                item.get("status"),
                item.get("user_id"),
                item.get("created_at"),
            ])

        output.seek(0)

        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={
                "Content-Disposition": "attachment; filename=selected_feedback_export.csv"
            },
        )

    except Exception as e:
        if isinstance(e, HTTPException):
            raise e

        raise HTTPException(status_code=500, detail=str(e))


@router.put("/feedback/retrain-flag")
async def update_feedback_retrain_flag(
    request: AdminRetrainFlagRequest,
    admin_id: str = Depends(verify_admin),
):
    try:
        (
            supabase
            .table("feedback_data")
            .update({"include_retrain": request.include_retrain})
            .eq("id", request.feedback_id)
            .execute()
        )

        return {
            "status": "success",
            "message": "Đã cập nhật cờ retrain.",
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/users/activity-summary")
async def get_admin_users_activity_summary(admin_id: str = Depends(verify_admin)):
    try:
        summary = {}

        reviews_res = (
            supabase
            .table("scraped_reviews")
            .select("user_id, created_at")
            .execute()
        )

        for row in reviews_res.data or []:
            user_id = row.get("user_id")

            if not user_id:
                continue

            if user_id not in summary:
                summary[user_id] = {
                    "review_count": 0,
                    "feedback_count": 0,
                    "last_activity_at": None,
                }

            summary[user_id]["review_count"] += 1
            created_at = row.get("created_at")

            if created_at and (
                not summary[user_id]["last_activity_at"]
                or str(created_at) > str(summary[user_id]["last_activity_at"])
            ):
                summary[user_id]["last_activity_at"] = created_at

        feedback_res = (
            supabase
            .table("feedback_data")
            .select("user_id, created_at")
            .execute()
        )

        for row in feedback_res.data or []:
            user_id = row.get("user_id")

            if not user_id:
                continue

            if user_id not in summary:
                summary[user_id] = {
                    "review_count": 0,
                    "feedback_count": 0,
                    "last_activity_at": None,
                }

            summary[user_id]["feedback_count"] += 1
            created_at = row.get("created_at")

            if created_at and (
                not summary[user_id]["last_activity_at"]
                or str(created_at) > str(summary[user_id]["last_activity_at"])
            ):
                summary[user_id]["last_activity_at"] = created_at

        return {
            "summary": summary,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/users/{user_id}/activity-history")
async def get_admin_user_activity_history(
    user_id: str,
    admin_id: str = Depends(verify_admin),
    limit: int = 20,
):
    try:
        safe_limit = max(1, min(int(limit or 20), 50))

        logs_res = (
            supabase
            .table("admin_activity_logs")
            .select(
                "id, admin_id, admin_name, action_type, target_type, "
                "target_id, description, created_at"
            )
            .eq("target_id", user_id)
            .order("created_at", desc=True)
            .limit(safe_limit)
            .execute()
        )

        return {
            "logs": logs_res.data or [],
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
