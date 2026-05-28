import pandas as pd
import re

# 1. Tải danh sách từ dừng (Stopwords)
# File này bạn đã tải từ Kaggle về
print("Đang tải danh sách từ dừng...")
with open('vietnamese-stopwords-dash.txt', 'r', encoding='utf-8') as f:
    stopwords = set([line.strip() for line in f])

def clean_and_remove_stopwords(text):
    # Chuyển về chữ thường
    text = str(text).lower()
    # Xóa các ký tự đặc biệt/dấu câu (giữ lại chữ và số)
    text = re.sub(r'[^\w\s]', '', text)
    # Tách từ và lọc bỏ stopwords
    words = text.split()
    words = [w for w in words if w not in stopwords]
    return ' '.join(words)

# 2. Danh sách 3 file dữ liệu mới của bạn
files = ['foody_train.csv', 'foody_val.csv', 'foody_test.csv']

for file_name in files:
    print(f"--- Đang xử lý file: {file_name} ---")
    # Đọc dữ liệu
    df = pd.read_csv(file_name)
    
    # Kiểm tra nếu file có cột 'Comment'
    if 'Comment' in df.columns:
        # Tiến hành làm sạch và xóa stopwords
        df['Comment'] = df['Comment'].apply(clean_and_remove_stopwords)
        
        # Lưu đè lại file đã sạch để các bước sau dùng luôn
        df.to_csv(file_name, index=False, encoding='utf-8')
        print(f"-> Hoàn tất làm sạch {file_name}!")
    else:
        print(f"-> Lỗi: Không tìm thấy cột 'Comment' trong {file_name}")

print("\n=> TẤT CẢ DỮ LIỆU ĐÃ SẴN SÀNG CHO BƯỚC HUẤN LUYỆN AI!")