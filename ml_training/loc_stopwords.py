# Danh sách các "từ khóa vàng" tuyệt đối KHÔNG ĐƯỢC XÓA khi phân tích cảm xúc
words_to_keep = {
    "không", "chưa", "chẳng", "chớ", "đừng", 
    "nhưng", "tuy_nhiên", "mặc_dù", 
    "chẳng_phải", "không_phải",
    "quá", "rất", "lắm", "cực_kỳ", "hơi" # Giữ lại các từ chỉ mức độ để model biết khen "rất ngon" khác với "hơi ngon"
}

print("⏳ Đang quét và lọc danh sách từ dừng...")

# Đọc file stopwords gốc
with open('vietnamese-stopwords-dash.txt', 'r', encoding='utf-8') as f:
    original_stopwords = [line.strip() for line in f]

# Lọc: Chỉ giữ lại những từ KHÔNG NẰM TRONG danh sách words_to_keep
new_stopwords = [word for word in original_stopwords if word not in words_to_keep]

# Lưu ra một file stopwords mới
with open('vietnamese-stopwords-custom.txt', 'w', encoding='utf-8') as f:
    for word in new_stopwords:
        f.write(word + '\n')

print(f"✅ Đã xong! File ban đầu có {len(original_stopwords)} từ.")
print(f"✅ File mới còn lại {len(new_stopwords)} từ.")
print("👉 Hãy dùng file 'vietnamese-stopwords-custom.txt' cho model SVM của bạn!")