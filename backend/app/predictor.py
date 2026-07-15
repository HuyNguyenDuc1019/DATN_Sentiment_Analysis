import os
import torch
import torch.nn.functional as F
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from pyvi import ViTokenizer
import re

class SentimentPredictor:
    def __init__(self, model_path: str):
        print(f"Đang khởi tạo mô hình từ {model_path} trên CPU...")
        self.device = torch.device('cpu')
        
        # Load Tokenizer và Model
        self.tokenizer = AutoTokenizer.from_pretrained(model_path)
        self.model = AutoModelForSequenceClassification.from_pretrained(model_path)
        
        # Chuyển mô hình sang chế độ CPU và đánh giá (Inference mode)
        self.model.to(self.device)
        self.model.eval()
        
        # Tích hợp Từ điển Teencode (Đồng bộ với lúc huấn luyện)
        self.teencode_dict = {
            "ko": "không", "k": "không", "khg": "không", "kh": "không", "hong": "không", "hông": "không",
            "đc": "được", "dc": "được",
            "r": "rồi", "rùi": "rồi",
            "vs": "với", "sp": "sản phẩm", "nv": "nhân viên", "pv": "phục vụ",
            "qán": "quán", "mik": "mình", "m": "mình",
            "oke": "ok", "okela": "ok", "oki": "ok",
            "ngonnn": "ngon", "ngonnnn": "ngon"
        }
        
        print("Đã tải mô hình thành công!")

    def preprocess_text(self, text: str) -> str:
        # 1. Chuyển chữ thường
        text = str(text).lower()
        
        # 2. Xóa ký tự đặc biệt (thay bằng khoảng trắng để không dính chữ)
        text = re.sub(r'[^\w\s]', ' ', text)
        text = re.sub(r'\s+', ' ', text).strip()
        
        # 3. Dịch Teencode
        words = text.split()
        words = [self.teencode_dict.get(w, w) for w in words]
        text = ' '.join(words)
        
        # 4. Tách từ bằng PyVi
        text = ViTokenizer.tokenize(text)
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
            max_length=128  # Đã điều chỉnh về 128 để khớp với model Colab
        )
        
        # Đưa tensor lên CPU
        input_ids = inputs["input_ids"].to(self.device)
        attention_mask = inputs["attention_mask"].to(self.device)

        # Chạy dự đoán, tắt gradient
        with torch.no_grad():
            outputs = self.model(input_ids=input_ids, attention_mask=attention_mask)
            logits = outputs.logits
            
            # Tính xác suất (Softmax)
            probabilities = F.softmax(logits, dim=1).squeeze().tolist()
            
            # Lấy nhãn có xác suất cao nhất
            predicted_class = torch.argmax(logits, dim=1).item()
            confidence_score = probabilities[predicted_class] * 100

        # Mapping nhãn (0 = Tiêu cực, 1 = Tích cực)
        sentiment_label = "Tích cực" if predicted_class == 1 else "Tiêu cực"

        return {
            "label": predicted_class,
            "sentiment": sentiment_label,
            "confidence": round(confidence_score, 2)
        }