from pydantic import BaseModel, Field

class PredictRequest(BaseModel):
    text: str = Field(..., title="Văn bản cần phân tích", example="Quán phục vụ quá chậm, đồ ăn thì nguội ngắt.")

class PredictResponse(BaseModel):
    label: int = Field(..., title="Nhãn dự đoán (0: Tiêu cực, 1: Tích cực)")
    sentiment: str = Field(..., title="Ý nghĩa nhãn")
    confidence: float = Field(..., title="Độ tự tin của mô hình (%)")