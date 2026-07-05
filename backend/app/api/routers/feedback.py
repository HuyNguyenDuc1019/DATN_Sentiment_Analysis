from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from app.database import supabase
from app.schemas import FeedbackRequest

router = APIRouter(tags=["Feedback"])

class FeedbackLinkSource(BaseModel):
    user_id: str
    scraped_review_id: str

@router.post("/feedback")
async def save_feedback(request: FeedbackRequest):
    try:
        data, count = supabase.table("feedback_data").insert({
            "original_content": request.original_content,
            "old_ai_label": request.old_ai_label,
            "corrected_label": request.corrected_label,
            "user_id": request.user_id
        }).execute()
        
        return {
            "status": "success",
            "message": "Đã lưu đính chính thành công, cảm ơn bạn đã đóng góp dữ liệu!",
            "data": data[1] if data else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi lưu dữ liệu vào cơ sở dữ liệu: {str(e)}")

@router.put("/api/feedback/{feedback_id}/link-source")
async def link_feedback_source(feedback_id: str, request: FeedbackLinkSource):
    try:
        current = supabase.table('feedback_data').select('user_id').eq('id', feedback_id).single().execute()
        if not current.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy phản hồi này.")

        if current.data.get('user_id') != request.user_id:
            raise HTTPException(status_code=403, detail="Bạn không có quyền cập nhật phản hồi này.")

        supabase.table('feedback_data').update({
            "scraped_review_id": request.scraped_review_id
        }).eq('id', feedback_id).execute()

        return {"status": "success", "message": "Đã liên kết nguồn gốc phản hồi thành công."}
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))
