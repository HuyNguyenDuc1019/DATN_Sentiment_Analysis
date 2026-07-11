from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
from datetime import datetime, timedelta
import time
import os
from app.database import supabase
from app.api.routers.vnpay_helper import VNPayHelper # Import vũ khí bí mật

router = APIRouter(prefix="/payment", tags=["Payment"])

# --- Các Schema kiểm tra dữ liệu đầu vào ---
class CreatePaymentRequest(BaseModel):
    user_id: str
    amount: int = 99000 # Mặc định gói VIP 99k

# ==========================================
# API 1: TẠO ĐƠN HÀNG VÀ CHUYỂN HƯỚNG VNPAY
# ==========================================
@router.post("/create")
async def create_payment(req: CreatePaymentRequest, request: Request):
    try:
        # Lấy thông tin cấu hình từ file .env
        vnp_TmnCode = os.getenv("VNPAY_TMN_CODE")
        vnp_HashSecret = os.getenv("VNPAY_HASH_SECRET")
        vnp_Url = os.getenv("VNPAY_PAYMENT_URL")
        vnp_ReturnUrl = os.getenv("VNPAY_RETURN_URL")

        if not vnp_TmnCode or not vnp_HashSecret:
            raise HTTPException(status_code=500, detail="Chưa cấu hình VNPay trong .env")

        # 1. Tạo mã đơn hàng duy nhất
        order_id = int(time.time() * 1000) # VD: 1718923481234 (VNPay bắt buộc là số nguyên/chuỗi số)
        amount = req.amount
        order_desc = f"Nang cap VIP 30 ngay cho user {req.user_id}"
        ipaddr = request.client.host # Lấy IP của người dùng

        # 2. Lưu giao dịch pending vào Supabase
        tx_data = {
            "user_id": req.user_id,
            "amount": amount,
            "status": "pending",
            "plan_name": "VIP 30 Ngày",
            "duration_days": 30,
            "payment_code": str(order_id),
            "payment_method": "VNPAY"
        }
        
        res_db = supabase.table("transactions").insert(tx_data).execute()
        if not res_db.data:
            raise HTTPException(status_code=500, detail="Lỗi lưu giao dịch vào DB")

        # 3. Tạo định dạng ngày giờ theo chuẩn VNPay (yyyyMMddHHmmss)
        curr_time = datetime.now()
        expire_time = curr_time + timedelta(minutes=15) # Đơn hàng tồn tại 15 phút
        vnp_CreateDate = curr_time.strftime('%Y%m%d%H%M%S')
        vnp_ExpireDate = expire_time.strftime('%Y%m%d%H%M%S')

        # 4. Sử dụng Helper để sinh link thanh toán
        vnp = VNPayHelper(vnp_TmnCode, vnp_HashSecret, vnp_Url, vnp_ReturnUrl)
        
        payment_url = vnp.get_payment_url(
            ip_address=ipaddr,
            amount=amount,
            order_info=order_desc,
            order_type="other", # Loại hàng hóa
            txn_ref=str(order_id),
            create_date=vnp_CreateDate,
            expire_date=vnp_ExpireDate
        )

        # 5. Trả URL về cho Frontend
        return {
            "success": True,
            "payment_url": payment_url, # Frontend sẽ chuyển hướng user đến URL này
            "order_id": str(order_id)
        }

    except Exception as e:
        print(f"🔥 Lỗi tạo link VNPay: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
# ==========================================
# API 2: VNPAY GỌI VỀ BÁO KẾT QUẢ (WEBHOOK/IPN)
# ==========================================
@router.get("/vnpay-ipn")
async def vnpay_ipn(request: Request):
    try:
        vnp_HashSecret = os.getenv("VNPAY_HASH_SECRET")
        inputData = request.query_params._dict

        if not inputData:
            return {"RspCode": "99", "Message": "Thiếu dữ liệu từ VNPay"}

        # 1. Xác thực chữ ký để đảm bảo hacker không gọi API này giả mạo VNPay
        vnp = VNPayHelper("", vnp_HashSecret, "", "")
        isValid = vnp.validate_response(inputData)

        if not isValid:
            print("❌ Lỗi: Chữ ký VNPay không hợp lệ (Có thể bị tấn công)")
            return {"RspCode": "97", "Message": "Invalid Signature"}

        # 2. Lấy thông tin từ VNPay gửi về
        order_id = inputData.get('vnp_TxnRef')
        vnp_ResponseCode = inputData.get('vnp_ResponseCode')

        # 3. Kiểm tra giao dịch trong DB
        res_tx = supabase.table("transactions").select("*").eq("payment_code", order_id).execute()
        if not res_tx.data or len(res_tx.data) == 0:
            return {"RspCode": "01", "Message": "Order Not Found"}
        
        transaction = res_tx.data[0]
        user_id = transaction["user_id"]
        duration_days = transaction["duration_days"]

        if transaction["status"] == "paid":
            return {"RspCode": "02", "Message": "Order already confirmed"}

        # 4. Nếu giao dịch thành công (Mã 00)
        if vnp_ResponseCode == "00":
            # 4.1 Cập nhật Transaction = Paid
            supabase.table("transactions").update({
                "status": "paid",
                "paid_at": datetime.utcnow().isoformat()
            }).eq("id", transaction["id"]).execute()

            # 4.2 Nâng cấp Profile lên VIP
            expires_at = (datetime.utcnow() + timedelta(days=duration_days)).isoformat()
            supabase.table("profiles").update({
                "role": "VIP",
                "vip_expires_at": expires_at
            }).eq("id", user_id).execute()

            print(f"🎉 IPN: Nâng cấp VIP thành công cho User: {user_id}")
            return {"RspCode": "00", "Message": "Confirm Success"} # VNPay cần nhận đúng dòng này
        
        else:
            # Giao dịch thất bại (Hủy thanh toán, sai mã PIN...)
            supabase.table("transactions").update({"status": "cancelled"}).eq("id", transaction["id"]).execute()
            print(f"⚠️ IPN: Giao dịch thất bại. Mã lỗi: {vnp_ResponseCode}")
            return {"RspCode": "00", "Message": "Confirm Success"} 

    except Exception as e:
        print(f"🔥 Lỗi xử lý IPN: {e}")
        return {"RspCode": "99", "Message": "Unknow error"}