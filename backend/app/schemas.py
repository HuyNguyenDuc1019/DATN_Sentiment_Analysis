from pydantic import BaseModel, Field
from typing import List

class PredictRequest(BaseModel):
    text: str = Field(..., title="Văn bản cần phân tích", example="Quán phục vụ quá chậm, đồ ăn thì nguội ngắt.")

class PredictResponse(BaseModel):
    label: int = Field(..., title="Nhãn dự đoán (0: Tiêu cực, 1: Tích cực)")
    sentiment: str = Field(..., title="Ý nghĩa nhãn")
    confidence: float = Field(..., title="Độ tự tin của mô hình (%)")

class BatchPredictRequest(BaseModel):
    texts: List[str]
    user_id: str  # Cổng nhận user_id từ Node.js gửi sang
    source_url: str  # Cổng nhận URL nguồn của bình luận để lưu vào database cùng với feedback

class FeedbackRequest(BaseModel):
    original_content: str
    old_ai_label: int
    corrected_label: int
    user_id: str  # Nhận thêm user_id để biết ai là người đóng góp feedback