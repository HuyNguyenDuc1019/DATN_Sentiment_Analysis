from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.database import supabase
from app.schemas import FeedbackBatchRequest, FeedbackRequest


router = APIRouter(tags=["Feedback"])


class FeedbackLinkSource(BaseModel):
    user_id: str
    scraped_review_id: str


def _feedback_record(request: FeedbackRequest) -> dict:
    action = request.status
    corrected_label = (
        request.old_ai_label
        if action == "skipped"
        else request.corrected_label
    )

    return {
        "original_content": request.original_content,
        "old_ai_label": request.old_ai_label,
        "corrected_label": corrected_label,
        "user_id": request.user_id,
        "scraped_review_id": request.scraped_review_id,
        # pending/approved/rejected tiep tuc duoc admin su dung.
        # skipped duoc luu de binh luan khong xuat hien lai cho user.
        "status": "skipped" if action == "skipped" else "pending",
        "include_retrain": bool(
            action == "corrected"
            and request.include_retrain
            and corrected_label != request.old_ai_label
        ),
        "review_history": [
            {
                "actor": "user",
                "action": action,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        ],
    }


def _validate_review_ownership(items: list[FeedbackRequest]) -> None:
    user_ids = {item.user_id for item in items}

    if len(user_ids) != 1:
        raise HTTPException(
            status_code=400,
            detail="Một lô chỉ được chứa phản hồi của một người dùng.",
        )

    review_ids = list({
        item.scraped_review_id
        for item in items
        if item.scraped_review_id
    })

    if not review_ids:
        return

    user_id = next(iter(user_ids))
    response = (
        supabase
        .table("scraped_reviews")
        .select("id")
        .eq("user_id", user_id)
        .in_("id", review_ids)
        .execute()
    )
    valid_ids = {row["id"] for row in (response.data or [])}

    if valid_ids != set(review_ids):
        raise HTTPException(
            status_code=403,
            detail="Có bình luận không thuộc người dùng hiện tại.",
        )


def _save_records(records: list[dict]) -> list[dict]:
    linked = [record for record in records if record.get("scraped_review_id")]
    unlinked = [record for record in records if not record.get("scraped_review_id")]
    saved: list[dict] = []

    if linked:
        response = (
            supabase
            .table("feedback_data")
            .upsert(
                linked,
                on_conflict="user_id,scraped_review_id",
            )
            .execute()
        )
        saved.extend(response.data or [])

    if unlinked:
        response = (
            supabase
            .table("feedback_data")
            .insert(unlinked)
            .execute()
        )
        saved.extend(response.data or [])

    return saved


@router.post("/feedback")
async def save_feedback(request: FeedbackRequest):
    """
    Lưu phản hồi đơn lẻ từ người dùng khi họ sửa nhãn của một bình luận
    hoặc đánh dấu bỏ qua. Nếu sửa nhãn, hệ thống có thể dùng dữ liệu này
    để huấn luyện lại model sau này.
    """
    try:
        _validate_review_ownership([request])
        saved = _save_records([_feedback_record(request)])

        return {
            "status": "success",
            "processed": 1,
            "data": saved[0] if saved else None,
        }

    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi khi lưu phản hồi: {error}",
        ) from error


@router.post("/feedback/batch")
async def save_feedback_batch(request: FeedbackBatchRequest):
    """
    Lưu một lô phản hồi hàng loạt từ người dùng (Bulk Action).
    """
    try:
        _validate_review_ownership(request.items)
        records = [_feedback_record(item) for item in request.items]
        saved = _save_records(records)

        return {
            "status": "success",
            "processed": len(records),
            "saved": len(saved),
        }

    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Lỗi khi lưu lô phản hồi: {error}",
        ) from error


@router.put("/api/feedback/{feedback_id}/link-source")
async def link_feedback_source(feedback_id: str, request: FeedbackLinkSource):
    """
    Cập nhật/liên kết nguồn gốc (scraped_review_id) cho một phản hồi đã có.
    Giúp map phản hồi với bình luận gốc được cào về.
    """
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

        return {
            "status": "success",
            "message": "Đã liên kết nguồn gốc phản hồi thành công.",
        }

    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error
