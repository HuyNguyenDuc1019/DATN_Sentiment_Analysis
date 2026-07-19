import pandas as pd
import re
from pyvi import ViTokenizer

# 1. Tải danh sách từ dừng
print("⏳ Đang tải danh sách từ dừng...")
try:
    with open('vietnamese-stopwords-dash.txt', 'r', encoding='utf-8') as f:
        stopwords = set([line.strip() for line in f])
except FileNotFoundError:
    print("❌ Lỗi: Không tìm thấy file 'vietnamese-stopwords-dash.txt'.")
    exit()

# 2. Từ điển Chuẩn hóa Teencode
teencode_dict = {
    "ko": "không", "k": "không", "khg": "không", "kh": "không", "hong": "không", "hông": "không",
    "đc": "được", "dc": "được",
    "r": "rồi", "rùi": "rồi",
    "vs": "với", "sp": "sản phẩm", "nv": "nhân viên", "pv": "phục vụ",
    "qán": "quán", "mik": "mình", "m": "mình",
    "oke": "ok", "okela": "ok", "oki": "ok",
    "ngonnn": "ngon", "ngonnnn": "ngon"
}

# 3. Hàm làm sạch cho PhoBERT
def clean_for_phobert(text):
    if pd.isna(text): # An toàn vượt qua các ô Excel bị trống
        return ""
    
    # ÉP KIỂU CHUỖI CỰC MẠNH để tránh lỗi ẩn của Pandas
    text = str(text).lower() 
    
    text = re.sub(r'[^\w\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    
    words = text.split()
    words = [teencode_dict.get(w, w) for w in words]
    text = ' '.join(words)
    
    return ViTokenizer.tokenize(text)

# 4. Hàm xóa từ dừng cho SVM
def remove_stopwords_for_svm(tokenized_text):
    if pd.isna(tokenized_text):
        return ""
    words = str(tokenized_text).split()
    words = [w for w in words if w not in stopwords]
    return ' '.join(words)

# 5. Khởi chạy xử lý file
def process_dataset():
    input_file = 'foody_dataset_retrain2.csv'  
    output_file = 'dataset_final.csv'
    
    # Đã cập nhật đúng tên cột theo ảnh bạn chụp
    column_name = 'Comment'  # Cột chứa bình luận trong file Excel      
    
    print(f"⏳ Đang đọc file Excel: {input_file}...")
    df = pd.read_excel(input_file)
    
    # MÁY ĐO 1: Báo cáo xem file gốc có bao nhiêu dòng
    print(f"📊 Dữ liệu gốc: Tìm thấy {len(df)} dòng") 
    
    if column_name not in df.columns:
        print(f"❌ Lỗi: Không tìm thấy cột '{column_name}'. Các cột đang có: {list(df.columns)}")
        return

    print("🧹 Đang xử lý Teencode và Tách từ (Word Segmentation)...")
    df['PhoBERT_Text'] = df[column_name].apply(clean_for_phobert)
    
    print("✂️ Đang loại bỏ Stopwords cho mô hình SVM...")
    df['SVM_Text'] = df['PhoBERT_Text'].apply(remove_stopwords_for_svm)
    
    # Lọc bỏ các dòng bị rỗng
    df = df[df['PhoBERT_Text'].str.strip() != '']
    
    # MÁY ĐO 2: Báo cáo xem sau khi dọn dẹp còn bao nhiêu dòng
    print(f"📊 Sau khi làm sạch: Còn lại {len(df)} dòng hợp lệ")
    
    df.to_csv(output_file, index=False, encoding='utf-8-sig')
    print(f"✅ HOÀN TẤT! Dữ liệu đã lưu tại: {output_file}")

if __name__ == "__main__":
    # --- 1. ĐOẠN DEMO ĐỂ CHỤP ẢNH BÁO CÁO ---
    cau_goc = "qán pv siêu tệ, sp ko ngon đâu mik đi 1 lần r !!!"
    
    # Gọi hàm xử lý PhoBERT của bạn
    cau_ket_qua = clean_for_phobert(cau_goc)
    
    print("\n" + "="*70)
    print("🚀 KIỂM TRA QUÁ TRÌNH TIỀN XỬ LÝ NLP (PREPROCESSING)")
    print("="*70)
    print(f"🔴 NGUYÊN BẢN (Raw)    : {cau_goc}")
    print("-" * 70)
    print(f"🟢 KẾT QUẢ (Processed) : {cau_ket_qua}")
    print("="*70 + "\n")
    
    # --- 2. CHẠY XỬ LÝ FILE EXCEL CHÍNH ---
    # (Tạm thời comment lại bằng dấu # để Terminal chỉ hiện mỗi cái khung báo cáo cho dễ chụp ảnh. 
    # Khi nào bạn muốn xử lý file Excel thì bỏ dấu # đi nhé)
    
    process_dataset()