import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Tải các biến môi trường từ file .env
load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")

# Khởi tạo kết nối duy nhất
supabase: Client = create_client(url, key)