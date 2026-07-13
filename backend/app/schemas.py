from pydantic import BaseModel, Field
from typing import List, Optional


# ==========================================
# CẤU TRÚC DỮ LIỆU DÀNH CHO USER
# ==========================================
class PredictRequest(BaseModel):
    text: str = Field(..., title="Văn bản cần phân tích", example="Quán phục vụ quá chậm, đồ ăn thì nguội ngắt.")

class PredictResponse(BaseModel):
    label: int = Field(..., title="Nhãn dự đoán (0: Tiêu cực, 1: Tích cực)")
    sentiment: str = Field(..., title="Ý nghĩa nhãn")
    confidence: float = Field(..., title="Độ tự tin của mô hình (%)")

# ==========================================
# THÊM MỚI: Định nghĩa cấu trúc của 1 bình luận
# ==========================================
class ReviewItem(BaseModel):
    content: str
    review_date: str # Nhận chuỗi ngày tháng từ Node.js

# ==========================================
# CẬP NHẬT LẠI: BatchPredictRequest
# ==========================================
class BatchPredictRequest(BaseModel):
    reviews: List[ReviewItem]  # 👈 Đổi từ 'texts: List[str]' thành 'reviews: List[ReviewItem]'
    user_id: str  
    source_url: str  

class FeedbackRequest(BaseModel):
    original_content: str
    old_ai_label: int
    corrected_label: int
    user_id: str
    scraped_review_id: Optional[str] = None
    status: str = "corrected"
    include_retrain: bool = False

# ==========================================
# CẤU TRÚC DỮ LIỆU DÀNH CHO ADMIN
# ==========================================
class AdminSettingUpdate(BaseModel):
    admin_id: str
    ai_threshold: float
    max_upload_size_free: int

class AdminActionRequest(BaseModel):
    admin_id: str
    target_user_id: str
    action: str  # Nhận 1 trong 3 giá trị: "ban", "unban", "upgrade_vip"

class AdminFeedbackReview(BaseModel):
    admin_id: str
    feedback_id: int
    action: str  # Nhận 1 trong 2 giá trị: "approve", "reject"
