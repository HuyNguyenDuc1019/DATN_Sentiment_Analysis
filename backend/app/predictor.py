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
            max_length=256
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

    def predict_many(self, texts, batch_size: int = 32):
        """Phân tích nhiều bình luận theo batch để phục vụ so sánh dữ liệu thật."""
        normalized_texts = [str(text or "").strip() for text in texts]
        results = []

        for start in range(0, len(normalized_texts), batch_size):
            batch = normalized_texts[start:start + batch_size]
            clean_batch = [self.preprocess_text(text) for text in batch]

            inputs = self.tokenizer(
                clean_batch,
                return_tensors="pt",
                truncation=True,
                padding=True,
                max_length=256,
            )

            input_ids = inputs["input_ids"].to(self.device)
            attention_mask = inputs["attention_mask"].to(self.device)

            with torch.no_grad():
                outputs = self.model(
                    input_ids=input_ids,
                    attention_mask=attention_mask,
                )
                probabilities = F.softmax(outputs.logits, dim=1)
                confidences, predicted_classes = torch.max(probabilities, dim=1)

            for predicted_class, confidence in zip(
                predicted_classes.tolist(),
                confidences.tolist(),
            ):
                results.append({
                    "label": predicted_class,
                    "sentiment": "Tích cực" if predicted_class == 1 else "Tiêu cực",
                    "confidence": round(confidence * 100, 2),
                })

        return results
