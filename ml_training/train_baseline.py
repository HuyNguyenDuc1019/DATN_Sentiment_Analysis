import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report
import pickle

# 1. Đọc dữ liệu đã chuẩn bị từ các file CSV của bạn
print("--- 1. Đang tải dữ liệu ---")
df_train = pd.read_csv('foody_train.csv')
df_test = pd.read_csv('foody_test.csv') # Lưu ý tên file khớp với thư mục của bạn

# Loại bỏ các dòng rỗng phát sinh sau khi xóa stopwords
df_train = df_train.dropna(subset=['Comment'])
df_test = df_test.dropna(subset=['Comment'])

X_train, y_train = df_train['Comment'], df_train['Label']
X_test, y_test = df_test['Comment'], df_test['Label']

# 2. Biến đổi văn bản thành con số (TF-IDF Vectorization)
# AI không đọc được chữ, nó chỉ đọc được ma trận số
print("--- 2. Đang chuyển hóa văn bản thành số (TF-IDF) ---")
vectorizer = TfidfVectorizer(max_features=5000) 
X_train_tfidf = vectorizer.fit_transform(X_train)
X_test_tfidf = vectorizer.transform(X_test)

# 3. Huấn luyện mô hình Baseline (Logistic Regression)
print("--- 3. Đang huấn luyện mô hình AI ---")
model = LogisticRegression(max_iter=1000)
model.fit(X_train_tfidf, y_train)

# 4. Đánh giá kết quả trên tập Test
print("--- 4. Đang đánh giá mô hình ---")
y_pred = model.predict(X_test_tfidf)
acc = accuracy_score(y_test, y_pred)

print(f"\n[!] ĐỘ CHÍNH XÁC (ACCURACY): {acc * 100:.2f}%")
print("\n--- CHI TIẾT BÁO CÁO PHÂN LOẠI ---")
print(classification_report(y_test, y_pred, target_names=['Tiêu cực (0)', 'Tích cực (1)']))

# 5. Lưu mô hình để sau này nhúng vào Web/App (theo yêu cầu của thầy)
print("--- 5. Đang đóng gói mô hình ---")
with open('baseline_model.pkl', 'wb') as f:
    pickle.dump(model, f)
with open('tfidf_vectorizer.pkl', 'wb') as f:
    pickle.dump(vectorizer, f)
print("=> Đã lưu file 'baseline_model.pkl' và 'tfidf_vectorizer.pkl'. Xong!")