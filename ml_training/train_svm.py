import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.svm import SVC
from sklearn.metrics import classification_report, accuracy_score

# ==========================================
# 1. ĐỌC VÀ CHIA TẬP DỮ LIỆU (TRAIN / VAL / TEST)
# ==========================================
print("⏳ Đang đọc dữ liệu sạch...")
df = pd.read_csv('dataset_3000_clean.csv')

# Đảm bảo bỏ các dòng rỗng lọt lưới
df = df.dropna(subset=['SVM_Text', 'Rating'])

# Chia tập Train (80%) và Tập tạm (20%)
df_train, df_temp = train_test_split(df, test_size=0.2, random_state=42, stratify=df['Rating'])

# Chia Tập tạm thành Val (10%) và Test (10%)
df_val, df_test = train_test_split(df_temp, test_size=0.5, random_state=42, stratify=df_temp['Rating'])

# LƯU RA FILE ĐỂ DÀNH CHO PHO-BERT HỌC (Apple-to-Apple comparison)
df_train.to_csv('data_train.csv', index=False, encoding='utf-8-sig')
df_val.to_csv('data_val.csv', index=False, encoding='utf-8-sig')
df_test.to_csv('data_test.csv', index=False, encoding='utf-8-sig')

print(f"📊 Đã chia data: Train ({len(df_train)} dòng), Val ({len(df_val)} dòng), Test ({len(df_test)} dòng)")

# ==========================================
# 2. TRÍCH XUẤT ĐẶC TRƯNG (TF-IDF)
# ==========================================
print("⚙️ Đang chuyển đổi chữ viết thành ma trận số (TF-IDF)...")
# Giới hạn 5000 từ vựng quan trọng nhất để model chạy nhanh
tfidf = TfidfVectorizer(max_features=5000) 

# Cho TF-IDF học từ vựng từ tập Train, sau đó biến đổi cả 2 tập Train và Test
X_train_tfidf = tfidf.fit_transform(df_train['SVM_Text'])
X_test_tfidf = tfidf.transform(df_test['SVM_Text'])

y_train = df_train['Rating']
y_test = df_test['Rating']

# ==========================================
# 3. HUẤN LUYỆN VÀ ĐÁNH GIÁ MÔ HÌNH SVM
# ==========================================
print("🤖 Đang huấn luyện Baseline Model (SVM)...")
svm_model = SVC(kernel='linear') # Kernel 'linear' cực kỳ phù hợp và chạy nhanh với Text
svm_model.fit(X_train_tfidf, y_train)

print("🎯 Đang làm bài thi thật trên tập Test...")
y_pred = svm_model.predict(X_test_tfidf)

# In kết quả báo cáo
print("\n" + "="*50)
print("🏆 KẾT QUẢ MÔ HÌNH TRUYỀN THỐNG (SVM)")
print("="*50)
print(f"Độ chính xác tổng thể (Accuracy): {accuracy_score(y_test, y_pred) * 100:.2f}%\n")
print("Báo cáo chi tiết từng nhãn:")
print(classification_report(y_test, y_pred))