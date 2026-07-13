from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.database import supabase
from app.schemas import FeedbackRequest

router = APIRouter(tags=["Feedback"])


class FeedbackLinkSource(BaseModel):
    user_id: str
    scraped_review_id: str


class FeedbackBulkRequest(BaseModel):
    items: list[FeedbackRequest]


def normalize_label(value) -> int:
    if value in (1, "1", True):
        return 1
    text = str(value or "").strip().lower()
    return 1 if text in {"positive", "pos", "tích cực", "tich cuc", "hài lòng", "hai long"} else 0


@router.post("/feedback")
async def save_feedback(request: FeedbackRequest):
    """Lưu một lần duyệt và không bắt admin duyệt lại xác nhận an toàn."""
    try:
        old_label = normalize_label(request.old_ai_label)
        corrected_label = normalize_label(request.corrected_label)
        is_confirmation = request.status == "confirmed" and old_label == corrected_label

        if request.scraped_review_id:
            source = (
                supabase
                .table("scraped_reviews")
                .select("id, user_id, ai_label")
                .eq("id", request.scraped_review_id)
                .single()
                .execute()
            )

            if not source.data:
                raise HTTPException(status_code=404, detail="Không tìm thấy bình luận nguồn.")

            if source.data.get("user_id") != request.user_id:
                raise HTTPException(status_code=403, detail="Bạn không có quyền xử lý bình luận này.")

            if normalize_label(source.data.get("ai_label")) != old_label:
                raise HTTPException(status_code=400, detail="Nhãn AI nguồn không khớp với dữ liệu gửi lên.")

        payload = {
            "original_content": request.original_content,
            "old_ai_label": old_label,
            "corrected_label": corrected_label,
            "user_id": request.user_id,
            "scraped_review_id": request.scraped_review_id,
            # Xác nhận AI đúng được duyệt ngay. Chỉnh nhãn mới cần admin kiểm tra.
            "status": "approved" if is_confirmation else "pending",
            "include_retrain": corrected_label != old_label,
        }

        existing = None
        if request.scraped_review_id:
            existing_res = (
                supabase
                .table("feedback_data")
                .select("id")
                .eq("user_id", request.user_id)
                .eq("scraped_review_id", request.scraped_review_id)
                .limit(1)
                .execute()
            )
            existing = (existing_res.data or [None])[0]

        if existing:
            result = (
                supabase
                .table("feedback_data")
                .update(payload)
                .eq("id", existing["id"])
                .execute()
            )
        else:
            result = supabase.table("feedback_data").insert(payload).execute()

        return {
            "status": "success",
            "review_status": payload["status"],
            "message": (
                "Đã xác nhận kết quả AI và tự động duyệt."
                if is_confirmation
                else "Đã lưu chỉnh sửa và chuyển admin kiểm tra."
            ),
            "data": result.data[0] if result.data else None,
        }
    except Exception as error:
        if isinstance(error, HTTPException):
            raise error
        raise HTTPException(status_code=500, detail=f"Lỗi khi lưu phản hồi: {error}")


@router.post("/feedback/bulk")
async def save_feedback_bulk(request: FeedbackBulkRequest):
    if not request.items:
        raise HTTPException(status_code=400, detail="Chưa chọn bình luận nào.")

    if len(request.items) > 500:
        raise HTTPException(status_code=400, detail="Mỗi lần chỉ xử lý tối đa 500 bình luận.")

    user_ids = {item.user_id for item in request.items}
    if len(user_ids) != 1:
        raise HTTPException(status_code=400, detail="Một lần xử lý chỉ được chứa dữ liệu của một người dùng.")

    user_id = next(iter(user_ids))
    source_ids = list({item.scraped_review_id for item in request.items if item.scraped_review_id})

    try:
        if source_ids:
            sources_res = (
                supabase
                .table("scraped_reviews")
                .select("id, user_id, ai_label")
                .in_("id", source_ids)
                .execute()
            )
            sources = {row["id"]: row for row in (sources_res.data or [])}

            if len(sources) != len(source_ids):
                raise HTTPException(status_code=404, detail="Có bình luận nguồn không còn tồn tại.")

            if any(row.get("user_id") != user_id for row in sources.values()):
                raise HTTPException(status_code=403, detail="Bạn không có quyền xử lý một số bình luận.")

            if any(
                item.scraped_review_id
                and normalize_label(sources[item.scraped_review_id].get("ai_label"))
                != normalize_label(item.old_ai_label)
                for item in request.items
            ):
                raise HTTPException(status_code=400, detail="Có nhãn AI nguồn không khớp dữ liệu gửi lên.")

        existing_by_source = {}
        if source_ids:
            existing_res = (
                supabase
                .table("feedback_data")
                .select("id, scraped_review_id")
                .eq("user_id", user_id)
                .in_("scraped_review_id", source_ids)
                .execute()
            )
            existing_by_source = {
                row["scraped_review_id"]: row["id"]
                for row in (existing_res.data or [])
                if row.get("scraped_review_id")
            }

        new_payloads = []
        update_payloads = []
        approved = 0

        for item in request.items:
            old_label = normalize_label(item.old_ai_label)
            corrected_label = normalize_label(item.corrected_label)
            is_confirmation = item.status == "confirmed" and old_label == corrected_label
            payload = {
                "original_content": item.original_content,
                "old_ai_label": old_label,
                "corrected_label": corrected_label,
                "user_id": item.user_id,
                "scraped_review_id": item.scraped_review_id,
                "status": "approved" if is_confirmation else "pending",
                "include_retrain": corrected_label != old_label,
            }

            if is_confirmation:
                approved += 1

            existing_id = existing_by_source.get(item.scraped_review_id)
            if existing_id:
                update_payloads.append((existing_id, payload))
            else:
                new_payloads.append(payload)

        if new_payloads:
            supabase.table("feedback_data").insert(new_payloads).execute()

        # Hàng chờ phía người dùng đã loại bản ghi cũ, nên nhánh này thường rất nhỏ.
        for feedback_id, payload in update_payloads:
            (
                supabase
                .table("feedback_data")
                .update(payload)
                .eq("id", feedback_id)
                .execute()
            )

        processed = len(request.items)
        return {
            "status": "success",
            "processed": processed,
            "approved": approved,
            "pending": processed - approved,
            "message": f"Đã xử lý {processed} bình luận.",
        }
    except Exception as error:
        if isinstance(error, HTTPException):
            raise error
        raise HTTPException(status_code=500, detail=f"Lỗi xử lý hàng loạt: {error}")


@router.put("/api/feedback/{feedback_id}/link-source")
async def link_feedback_source(feedback_id: str, request: FeedbackLinkSource):
    try:
        current = (
            supabase
            .table("feedback_data")
            .select("user_id")
            .eq("id", feedback_id)
            .single()
            .execute()
        )
        if not current.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy phản hồi này.")

        if current.data.get("user_id") != request.user_id:
            raise HTTPException(status_code=403, detail="Bạn không có quyền cập nhật phản hồi này.")

        (
            supabase
            .table("feedback_data")
            .update({"scraped_review_id": request.scraped_review_id})
            .eq("id", feedback_id)
            .execute()
        )

        return {"status": "success", "message": "Đã liên kết bình luận nguồn."}
    except Exception as error:
        if isinstance(error, HTTPException):
            raise error
        raise HTTPException(status_code=500, detail=str(error))
