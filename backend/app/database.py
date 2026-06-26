import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Tải các biến môi trường từ file .env
load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")  # Sử dụng SERVICE_ROLE_KEY để có quyền ghi vào database

# Khởi tạo kết nối duy nhất
supabase: Client = create_client(url, key)