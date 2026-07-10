from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import qrcode
import base64
from io import BytesIO
from datetime import datetime, timedelta
import time
from app.database import supabase

router = APIRouter(prefix="/payment", tags=["Payment"])

# --- Các Schema kiểm tra dữ liệu đầu vào ---
class CreatePaymentRequest(BaseModel):
    user_id: str

class MockWebhookRequest(BaseModel):
    payment_code: str

# ==========================================
# API 1: TẠO ĐƠN HÀNG VÀ SINH MÃ QR
# ==========================================
@router.post("/create")
async def create_payment(req: CreatePaymentRequest):
    try:
        # 1. Tạo mã đơn hàng ngẫu nhiên
        payment_code = f"VIP-{int(time.time() * 1000)}"
        amount = 50000
        duration_days = 30

        # 2. Lưu vào Supabase bảng transactions
        tx_data = {
            "user_id": req.user_id,
            "amount": amount,
            "status": "pending",
            "plan_name": "VIP 30 Ngày",
            "duration_days": duration_days,
            "payment_code": payment_code,
            "payment_method": "MOCK_QR"
        }
        
        res_db = supabase.table("transactions").insert(tx_data).execute()
        
        if not res_db.data:
            raise HTTPException(status_code=500, detail="Không thể lưu giao dịch vào DB")

        # 3. Tạo mã QR ảo (Dưới dạng Base64 để gửi về Frontend hiển thị luôn)
        qr_content = f"Thanh toan don hang: {payment_code} - So tien: {amount} VND"
        qr = qrcode.QRCode(version=1, box_size=10, border=4)
        qr.add_data(qr_content)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Chuyển ảnh QR thành chuỗi Base64
        buffered = BytesIO()
        img.save(buffered, format="PNG")
        qr_base64 = base64.b64encode(buffered.getvalue()).decode("utf-8")
        qr_image_data = f"data:image/png;base64,{qr_base64}"

        return {
            "success": True,
            "payment_code": payment_code,
            "qr_image": qr_image_data,
            "amount": amount,
            "message": "Đã tạo đơn hàng pending thành công"
        }

    except Exception as e:
        print(f"🔥 Lỗi tạo đơn hàng: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# API 2: NÚT CỬA SAU - GIẢ LẬP ĐÃ THANH TOÁN
# ==========================================
@router.post("/mock-webhook")
async def mock_webhook(req: MockWebhookRequest):
    try:
        # 1. Tìm đơn hàng đang pending
        res_tx = (
            supabase.table("transactions")
            .select("*")
            .eq("payment_code", req.payment_code)
            .eq("status", "pending")
            .execute()
        )

        if not res_tx.data or len(res_tx.data) == 0:
            raise HTTPException(status_code=404, detail="Không tìm thấy giao dịch hợp lệ hoặc đã thanh toán")

        transaction = res_tx.data[0]
        user_id = transaction["user_id"]
        duration_days = transaction["duration_days"]

        # 2. Cập nhật transaction thành "paid"
        current_time = datetime.utcnow().isoformat()
        supabase.table("transactions").update({
            "status": "paid",
            "paid_at": current_time
        }).eq("id", transaction["id"]).execute()

        # 3. Tính toán ngày hết hạn VIP (Cộng thêm 30 ngày)
        expires_at = (datetime.utcnow() + timedelta(days=duration_days)).isoformat()

        # 4. Cập nhật quyền VIP cho User vào bảng profiles
        supabase.table("profiles").update({
            "role": "VIP",
            "vip_expires_at": expires_at
        }).eq("id", user_id).execute()

        return {
            "success": True,
            "message": "Thanh toán mô phỏng thành công, tài khoản đã lên VIP!"
        }

    except Exception as e:
        print(f"🔥 Lỗi xử lý Webhook: {e}")
        raise HTTPException(status_code=500, detail=str(e))