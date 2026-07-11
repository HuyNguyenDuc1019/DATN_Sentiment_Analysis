import base64
import random
from datetime import datetime, timedelta, timezone
from io import BytesIO
from typing import Optional

import qrcode
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.database import supabase

router = APIRouter(prefix="/api/payment", tags=["Payment"])


class CreatePaymentRequest(BaseModel):
    user_id: str
    amount: Optional[float] = 99000


class MockWebhookRequest(BaseModel):
    payment_code: str


def now_utc():
    return datetime.now(timezone.utc)


def generate_payment_code():
    return f"VIP-{random.randint(100000, 999999)}"


def generate_qr_image_base64(payment_code: str, amount: float):
    qr_content = f"MOCK_PAYMENT|CODE={payment_code}|AMOUNT={int(amount)}"

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )

    qr.add_data(qr_content)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")

    buffer = BytesIO()
    img.save(buffer, format="PNG")

    base64_image = base64.b64encode(buffer.getvalue()).decode("utf-8")

    return f"data:image/png;base64,{base64_image}"


@router.post("/create")
async def create_payment(req: CreatePaymentRequest):
    try:
        if not req.user_id:
            raise HTTPException(status_code=400, detail="Thiếu user_id.")

        profile_res = (
            supabase
            .table("profiles")
            .select("id, email, full_name, tier")
            .eq("id", req.user_id)
            .maybe_single()
            .execute()
        )

        if not profile_res.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")

        amount = float(req.amount or 99000)
        payment_code = generate_payment_code()
        created_at = now_utc()

        transaction_data = {
            "user_id": req.user_id,
            "amount": amount,
            "status": "pending",
            "payment_code": payment_code,
            "plan_name": "VIP 30 ngày",
            "duration_days": 30,
            "payment_method": "mock_qr",
            "created_at": created_at.isoformat(),
        }

        insert_res = (
            supabase
            .table("transactions")
            .insert(transaction_data)
            .execute()
        )

        if not insert_res.data:
            raise HTTPException(status_code=400, detail="Không thể tạo giao dịch thanh toán.")

        transaction = insert_res.data[0]
        qr_image = generate_qr_image_base64(payment_code, amount)

        return {
            "success": True,
            "status": "success",
            "message": "Đã tạo giao dịch thanh toán VIP.",
            "transaction": transaction,
            "transaction_id": transaction.get("id"),
            "payment_code": payment_code,
            "qr_image": qr_image,
            "amount": amount,
        }

    except HTTPException:
        raise
    except Exception as e:
        print("🔥 Lỗi create payment:", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/mock-webhook")
async def mock_webhook(req: MockWebhookRequest):
    try:
        if not req.payment_code:
            raise HTTPException(status_code=400, detail="Thiếu payment_code.")

        transaction_res = (
            supabase
            .table("transactions")
            .select("*")
            .eq("payment_code", req.payment_code)
            .maybe_single()
            .execute()
        )

        if not transaction_res.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy giao dịch.")

        transaction = transaction_res.data

        if transaction.get("status") == "paid":
            return {
                "success": True,
                "status": "success",
                "message": "Giao dịch này đã được thanh toán trước đó.",
                "transaction": transaction,
            }

        user_id = transaction.get("user_id")

        if not user_id:
            raise HTTPException(status_code=400, detail="Giao dịch thiếu user_id.")

        paid_at = now_utc()
        vip_started_at = paid_at
        vip_expires_at = paid_at + timedelta(days=30)

        update_profile_res = (
            supabase
            .table("profiles")
            .update({
                "tier": "vip",
                "vip_started_at": vip_started_at.isoformat(),
                "vip_expires_at": vip_expires_at.isoformat(),
            })
            .eq("id", user_id)
            .execute()
        )

        if not update_profile_res.data:
            raise HTTPException(status_code=400, detail="Không thể nâng cấp tài khoản VIP.")

        update_transaction_res = (
            supabase
            .table("transactions")
            .update({
                "status": "paid",
                "paid_at": paid_at.isoformat(),
                "expires_at": vip_expires_at.isoformat(),
            })
            .eq("payment_code", req.payment_code)
            .execute()
        )

        updated_transaction = (
            update_transaction_res.data[0]
            if update_transaction_res.data
            else transaction
        )

        return {
            "success": True,
            "status": "success",
            "message": "Thanh toán thành công, tài khoản đã lên VIP!",
            "transaction": updated_transaction,
            "vip_started_at": vip_started_at.isoformat(),
            "vip_expires_at": vip_expires_at.isoformat(),
        }

    except HTTPException:
        raise
    except Exception as e:
        print("🔥 Lỗi mock webhook:", e)
        raise HTTPException(status_code=500, detail=str(e))