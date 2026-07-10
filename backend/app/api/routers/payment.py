from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime, timedelta
import random
import string

from app.database import supabase

router = APIRouter(prefix="/api/payment", tags=["Payment"])


class CreatePaymentRequest(BaseModel):
    user_id: str
    amount: float = 99000
    plan_name: str = "VIP 30 ngày"
    duration_days: int = 30
    payment_method: str = "mock_bank_transfer"


class ConfirmPaymentRequest(BaseModel):
    transaction_id: str
    user_id: str


def generate_payment_code():
    random_part = "".join(random.choices(string.digits, k=6))
    return f"VIP-{random_part}"


@router.post("/create")
async def create_vip_payment(req: CreatePaymentRequest):
    try:
        if not req.user_id:
            raise HTTPException(status_code=400, detail="Thiếu user_id.")

        profile_res = (
            supabase
            .table("profiles")
            .select("id, email, full_name, tier")
            .eq("id", req.user_id)
            .single()
            .execute()
        )

        if not profile_res.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")

        now = datetime.utcnow()
        payment_code = generate_payment_code()

        transaction_data = {
            "user_id": req.user_id,
            "amount": req.amount,
            "status": "pending",
            "plan_name": req.plan_name,
            "duration_days": req.duration_days,
            "payment_method": req.payment_method,
            "payment_code": payment_code,
            "created_at": now.isoformat(),
        }

        transaction_res = (
            supabase
            .table("transactions")
            .insert(transaction_data)
            .execute()
        )

        if not transaction_res.data:
            raise HTTPException(status_code=500, detail="Không thể tạo giao dịch.")

        transaction = transaction_res.data[0]

        qr_content = (
            f"ALMOTION VIP PAYMENT | "
            f"CODE: {payment_code} | "
            f"AMOUNT: {int(req.amount)} | "
            f"USER: {req.user_id}"
        )

        return {
            "status": "success",
            "message": "Đã tạo giao dịch thanh toán VIP.",
            "transaction": transaction,
            "transaction_id": transaction.get("id"),
            "payment_code": payment_code,
            "amount": req.amount,
            "plan_name": req.plan_name,
            "duration_days": req.duration_days,
            "payment_method": req.payment_method,
            "qr_content": qr_content,
            "bank_info": {
                "bank_name": "MB Bank",
                "account_name": "ALMOTION SYSTEM",
                "account_number": "0123456789",
                "transfer_content": payment_code,
            },
        }

    except HTTPException:
        raise

    except Exception as e:
        print(f"Lỗi API create_vip_payment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/confirm")
async def confirm_vip_payment(req: ConfirmPaymentRequest):
    try:
        if not req.transaction_id or not req.user_id:
            raise HTTPException(status_code=400, detail="Thiếu transaction_id hoặc user_id.")

        transaction_res = (
            supabase
            .table("transactions")
            .select("*")
            .eq("id", req.transaction_id)
            .eq("user_id", req.user_id)
            .single()
            .execute()
        )

        transaction = transaction_res.data

        if not transaction:
            raise HTTPException(status_code=404, detail="Không tìm thấy giao dịch.")

        if transaction.get("status") == "paid":
            return {
                "status": "success",
                "message": "Giao dịch này đã được thanh toán trước đó.",
                "transaction": transaction,
            }

        if transaction.get("status") not in ["pending"]:
            raise HTTPException(
                status_code=400,
                detail=f"Giao dịch không thể xác nhận vì đang ở trạng thái {transaction.get('status')}.",
            )

        now = datetime.utcnow()
        duration_days = int(transaction.get("duration_days") or 30)
        vip_expires_at = now + timedelta(days=duration_days)

        profile_update_res = (
            supabase
            .table("profiles")
            .update({
                "tier": "vip",
                "vip_started_at": now.isoformat(),
                "vip_expires_at": vip_expires_at.isoformat(),
            })
            .eq("id", req.user_id)
            .execute()
        )

        if not profile_update_res.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng để nâng cấp VIP.")

        transaction_update_res = (
            supabase
            .table("transactions")
            .update({
                "status": "paid",
                "paid_at": now.isoformat(),
                "expires_at": vip_expires_at.isoformat(),
            })
            .eq("id", req.transaction_id)
            .execute()
        )

        try:
            supabase.table("admin_activity_logs").insert({
                "admin_id": req.user_id,
                "admin_name": "System Payment",
                "action_type": "vip_payment_confirmed",
                "target_type": "user",
                "target_id": req.user_id,
                "description": f"Kích hoạt VIP {duration_days} ngày qua giao dịch {transaction.get('payment_code')}.",
                "created_at": now.isoformat(),
            }).execute()
        except Exception as log_error:
            print(f"⚠️ Không thể ghi admin_activity_logs: {log_error}")

        return {
            "status": "success",
            "message": f"Thanh toán thành công. Tài khoản VIP có hiệu lực {duration_days} ngày.",
            "profile": profile_update_res.data[0],
            "transaction": transaction_update_res.data[0] if transaction_update_res.data else None,
            "vip_started_at": now.isoformat(),
            "vip_expires_at": vip_expires_at.isoformat(),
            "duration_days": duration_days,
        }

    except HTTPException:
        raise

    except Exception as e:
        print(f"Lỗi API confirm_vip_payment: {e}")
        raise HTTPException(status_code=500, detail=str(e))