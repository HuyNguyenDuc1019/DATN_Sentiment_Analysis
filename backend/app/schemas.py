from pydantic import BaseModel, Field
from typing import List

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