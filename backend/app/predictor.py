import os
import torch
import torch.nn.functional as F
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from pyvi import ViTokenizer
import re

class SentimentPredictor:
    def __init__(self, model_path: str):
        print("Đang khởi tạo mô hình trên CPU...")
        self.device = torch.device('cpu')
        
        # Load Tokenizer và Model từ thư mục local
        self.tokenizer = AutoTokenizer.from_pretrained(model_path)
        self.model = AutoModelForSequenceClassification.from_pretrained(model_path)
        
        # Chuyển mô hình sang chế độ CPU và đánh giá (Inference mode)
        self.model.to(self.device)
        self.model.eval()
        print("Đã tải mô hình thành công!")

    def preprocess_text(self, text: str) -> str:
        # 1. Chuyển chữ thường
        text = text.lower()
        # 2. Xóa ký tự đặc biệt (chỉ giữ lại chữ cái và khoảng trắng)
        text = re.sub(r'[^\w\s]', '', text)
        # 3. Tách từ bằng PyVi (tạo các dấu gạch dưới như món_ăn)
        text = ViTokenizer.tokenize(text)
        
        # Lưu ý: Nếu quá trình train bạn loại bỏ stopwords, bạn có thể 
        # thêm logic đọc file vietnamese-stopwords-dash.txt và filter tại đây.
        return text

    def predict(self, text: str):
        # Tiền xử lý văn bản
        clean_text = self.preprocess_text(text)
        
        # Mã hóa (Tokenize) văn bản đầu vào
        inputs = self.tokenizer(
            clean_text,
            return_tensors="pt",
            truncation=True,
            padding="max_length",
            max_length=256 # Có thể chỉnh lại theo max_length lúc bạn train
        )
        
        # Đưa tensor lên CPU
        input_ids = inputs["input_ids"].to(self.device)
        attention_mask = inputs["attention_mask"].to(self.device)

        # Chạy dự đoán, tắt gradient để tiết kiệm RAM
        with torch.no_grad():
            outputs = self.model(input_ids=input_ids, attention_mask=attention_mask)
            logits = outputs.logits
            
            # Tính xác suất (Softmax)
            probabilities = F.softmax(logits, dim=1).squeeze().tolist()
            
            # Lấy nhãn có xác suất cao nhất
            predicted_class = torch.argmax(logits, dim=1).item()
            confidence_score = probabilities[predicted_class] * 100

        # Mapping nhãn
        sentiment_label = "Tích cực" if predicted_class == 1 else "Tiêu cực"

        return {
            "label": predicted_class,
            "sentiment": sentiment_label,
            "confidence": round(confidence_score, 2)
        }