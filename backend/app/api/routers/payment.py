import os
import time
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.database import supabase
from app.api.routers.vnpay_helper import VNPayHelper


router = APIRouter(prefix="/payment", tags=["Payment"])


class CreatePaymentRequest(BaseModel):
    user_id: str
    amount: int = 50000


def now_utc():
    return datetime.now(timezone.utc)


def get_client_ip(request: Request):
    forwarded_for = request.headers.get("x-forwarded-for")

    if forwarded_for:
        return forwarded_for.split(",")[0].strip()

    if request.client and request.client.host:
        client_ip = request.client.host

        if client_ip in ["::1", "localhost"]:
            return "127.0.0.1"

        return client_ip

    return "127.0.0.1"


def get_vnpay_config():
    tmn_code = os.getenv("VNPAY_TMN_CODE")
    hash_secret = os.getenv("VNPAY_HASH_SECRET")
    payment_url = os.getenv("VNPAY_PAYMENT_URL")
    return_url = os.getenv("VNPAY_RETURN_URL")

    missing = []

    if not tmn_code:
        missing.append("VNPAY_TMN_CODE")

    if not hash_secret:
        missing.append("VNPAY_HASH_SECRET")

    if not payment_url:
        missing.append("VNPAY_PAYMENT_URL")

    if not return_url:
        missing.append("VNPAY_RETURN_URL")

    if missing:
        raise HTTPException(
            status_code=500,
            detail=f"Thiếu cấu hình VNPay trong .env: {', '.join(missing)}",
        )

    return (
        tmn_code.strip(),
        hash_secret.strip(),
        payment_url.strip(),
        return_url.strip(),
    )


def find_transaction_by_payment_code(payment_code: str):
    transaction_res = (
        supabase
        .table("transactions")
        .select("*")
        .eq("payment_code", payment_code)
        .execute()
    )

    if not transaction_res.data:
        return None

    return transaction_res.data[0]


def mark_transaction_success(transaction: dict):
    user_id = transaction.get("user_id")
    duration_days = int(transaction.get("duration_days") or 30)

    if not user_id:
        raise Exception("Giao dịch thiếu user_id.")

    paid_at = now_utc()
    vip_started_at = paid_at
    vip_expires_at = paid_at + timedelta(days=duration_days)

    update_transaction_res = (
        supabase
        .table("transactions")
        .update({
            "status": "paid",
            "paid_at": paid_at.isoformat(),
            "expires_at": vip_expires_at.isoformat(),
        })
        .eq("id", transaction.get("id"))
        .execute()
    )

    if not update_transaction_res.data:
        raise Exception("Không thể cập nhật giao dịch.")

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
        raise Exception("Không thể nâng cấp tài khoản VIP.")

    return {
        "paid_at": paid_at.isoformat(),
        "vip_started_at": vip_started_at.isoformat(),
        "vip_expires_at": vip_expires_at.isoformat(),
    }


def mark_transaction_cancelled(transaction: dict):
    (
        supabase
        .table("transactions")
        .update({
            "status": "cancelled",
        })
        .eq("id", transaction.get("id"))
        .execute()
    )


@router.post("/create")
async def create_payment(req: CreatePaymentRequest, request: Request):
    try:
        if not req.user_id:
            raise HTTPException(status_code=400, detail="Thiếu user_id.")

        if req.amount <= 0:
            raise HTTPException(status_code=400, detail="Số tiền không hợp lệ.")

        tmn_code, hash_secret, payment_url, return_url = get_vnpay_config()

        print("========== ENV CHECK ==========")
        print("VNPAY_TMN_CODE:", tmn_code)
        print("VNPAY_HASH_SECRET_LENGTH:", len(hash_secret))
        print("VNPAY_PAYMENT_URL:", payment_url)
        print("VNPAY_RETURN_URL:", return_url)
        print("===============================")

        profile_res = (
            supabase
            .table("profiles")
            .select("id, email, full_name, tier")
            .eq("id", req.user_id)
            .execute()
        )

        if not profile_res.data:
            raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")

        amount = int(req.amount)
        order_id = str(int(time.time() * 1000))
        created_at = now_utc()

        transaction_data = {
            "user_id": req.user_id,
            "amount": amount,
            "status": "pending",
            "plan_name": "VIP 30 ngày",
            "duration_days": 30,
            "payment_code": order_id,
            "payment_method": "vnpay",
            "created_at": created_at.isoformat(),
        }

        insert_res = (
            supabase
            .table("transactions")
            .insert(transaction_data)
            .execute()
        )

        if not insert_res.data:
            raise HTTPException(
                status_code=500,
                detail="Không thể tạo giao dịch thanh toán.",
            )

        current_time = datetime.now()
        expire_time = current_time + timedelta(minutes=15)

        vnp_create_date = current_time.strftime("%Y%m%d%H%M%S")
        vnp_expire_date = expire_time.strftime("%Y%m%d%H%M%S")

        # Để order_info thật ngắn, không dấu, hạn chế lỗi checksum.
        order_info = order_id
        ip_address = get_client_ip(request)

        vnpay = VNPayHelper(
            tmn_code=tmn_code,
            hash_secret=hash_secret,
            payment_url=payment_url,
            return_url=return_url,
        )

        payment_url_result = vnpay.build_payment_url(
            ip_address=ip_address,
            amount=amount,
            order_info=order_info,
            order_type="other",
            txn_ref=order_id,
            create_date=vnp_create_date,
            expire_date=vnp_expire_date,
        )

        return {
            "success": True,
            "message": "Đã tạo URL thanh toán VNPay.",
            "payment_url": payment_url_result,
            "order_id": order_id,
            "amount": amount,
        }

    except HTTPException:
        raise

    except Exception as e:
        print(f"🔥 Lỗi tạo thanh toán VNPay: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/vnpay-ipn")
async def vnpay_ipn(request: Request):
    try:
        _, hash_secret, _, _ = get_vnpay_config()
        input_data = dict(request.query_params)

        if not input_data:
            return {
                "RspCode": "99",
                "Message": "Missing VNPay data",
            }

        vnpay = VNPayHelper(
            tmn_code="",
            hash_secret=hash_secret,
            payment_url="",
            return_url="",
        )

        is_valid = vnpay.validate_response(input_data)

        if not is_valid:
            print("❌ VNPay IPN: Chữ ký không hợp lệ.")
            return {
                "RspCode": "97",
                "Message": "Invalid Signature",
            }

        order_id = input_data.get("vnp_TxnRef")
        response_code = input_data.get("vnp_ResponseCode")
        transaction_status = input_data.get("vnp_TransactionStatus")
        vnp_amount = input_data.get("vnp_Amount")

        if not order_id:
            return {
                "RspCode": "01",
                "Message": "Missing Order ID",
            }

        transaction = find_transaction_by_payment_code(order_id)

        if not transaction:
            return {
                "RspCode": "01",
                "Message": "Order Not Found",
            }

        if transaction.get("status") == "paid":
            return {
                "RspCode": "02",
                "Message": "Order already confirmed",
            }

        expected_amount = int(float(transaction.get("amount") or 0)) * 100

        try:
            received_amount = int(vnp_amount or 0)
        except Exception:
            received_amount = 0

        if received_amount != expected_amount:
            print(
                f"❌ VNPay IPN: Sai số tiền. Expected={expected_amount}, Received={received_amount}"
            )

            return {
                "RspCode": "04",
                "Message": "Invalid Amount",
            }

        is_payment_success = response_code == "00" and transaction_status == "00"

        if is_payment_success:
            mark_transaction_success(transaction)

            print(
                f"🎉 VNPay IPN: Nâng cấp VIP thành công cho user {transaction.get('user_id')}"
            )

            return {
                "RspCode": "00",
                "Message": "Confirm Success",
            }

        mark_transaction_cancelled(transaction)

        print(f"⚠️ VNPay IPN: Giao dịch thất bại. Code={response_code}")

        return {
            "RspCode": "00",
            "Message": "Confirm Success",
        }

    except Exception as e:
        print(f"🔥 Lỗi xử lý VNPay IPN: {e}")

        return {
            "RspCode": "99",
            "Message": "Unknown error",
        }


@router.get("/vnpay-return")
async def vnpay_return(request: Request):
    """Verify the browser return and finalize local-development payments.

    VNPay cannot call an IPN URL hosted on localhost. This endpoint applies
    the same signed-data checks when the customer's browser returns, while
    the IPN endpoint remains the authoritative path in production.
    """
    try:
        _, hash_secret, _, _ = get_vnpay_config()
        input_data = dict(request.query_params)

        vnpay = VNPayHelper(
            tmn_code="",
            hash_secret=hash_secret,
            payment_url="",
            return_url="",
        )

        if not vnpay.validate_response(input_data):
            raise HTTPException(status_code=400, detail="Chữ ký VNPay không hợp lệ.")

        order_id = input_data.get("vnp_TxnRef")
        response_code = input_data.get("vnp_ResponseCode")
        transaction_status = input_data.get("vnp_TransactionStatus")

        if not order_id:
            raise HTTPException(status_code=400, detail="Thiếu mã đơn hàng VNPay.")

        transaction = find_transaction_by_payment_code(order_id)

        if not transaction:
            raise HTTPException(status_code=404, detail="Không tìm thấy giao dịch.")

        expected_amount = int(float(transaction.get("amount") or 0)) * 100

        try:
            received_amount = int(input_data.get("vnp_Amount") or 0)
        except (TypeError, ValueError):
            received_amount = 0

        if received_amount != expected_amount:
            raise HTTPException(status_code=400, detail="Số tiền thanh toán không hợp lệ.")

        if response_code != "00" or transaction_status != "00":
            if transaction.get("status") != "paid":
                mark_transaction_cancelled(transaction)

            return {
                "success": False,
                "message": "Giao dịch VNPay không thành công.",
                "order_id": order_id,
            }

        if transaction.get("status") != "paid":
            vip_data = mark_transaction_success(transaction)
        else:
            vip_data = {
                "paid_at": transaction.get("paid_at"),
                "vip_expires_at": transaction.get("expires_at"),
            }

        return {
            "success": True,
            "message": "Đã xác minh thanh toán và nâng cấp VIP.",
            "order_id": order_id,
            **vip_data,
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Lỗi xác minh VNPay return: {e}")
        raise HTTPException(status_code=500, detail="Không thể xác minh giao dịch VNPay.")



@router.get("/debug-vnpay-urls")
async def debug_vnpay_urls(request: Request):
    try:
        tmn_code, hash_secret, payment_url, return_url = get_vnpay_config()

        order_id = str(int(time.time() * 1000))

        current_time = datetime.now()
        expire_time = current_time + timedelta(minutes=15)

        vnp_create_date = current_time.strftime("%Y%m%d%H%M%S")
        vnp_expire_date = expire_time.strftime("%Y%m%d%H%M%S")

        vnpay = VNPayHelper(
            tmn_code=tmn_code,
            hash_secret=hash_secret,
            payment_url=payment_url,
            return_url=return_url,
        )

        urls = vnpay.build_debug_urls(
            ip_address="127.0.0.1",
            amount=50000,
            order_info=order_id,
            order_type="other",
            txn_ref=order_id,
            create_date=vnp_create_date,
            expire_date=vnp_expire_date,
        )

        return {
            "success": True,
            "tmn_code": tmn_code,
            "hash_secret_length": len(hash_secret),
            "payment_url": payment_url,
            "return_url": return_url,
            "order_id": order_id,
            "urls": urls,
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
        }
