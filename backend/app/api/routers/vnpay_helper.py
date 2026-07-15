import hashlib
import hmac
import urllib.parse


class VNPayHelper:
    def __init__(self, tmn_code, hash_secret, payment_url, return_url):
        self.tmn_code = str(tmn_code or "").strip()
        self.hash_secret = str(hash_secret or "").strip()
        self.payment_url = str(payment_url or "").strip()
        self.return_url = str(return_url or "").strip()

    def hmacsha512(self, data: str) -> str:
        return hmac.new(
            self.hash_secret.encode("utf-8"),
            data.encode("utf-8"),
            hashlib.sha512,
        ).hexdigest()

    def clean_and_sort(self, params: dict):
        clean = {}

        for key, value in params.items():
            if value is None or value == "":
                continue

            clean[str(key)] = str(value)

        return dict(sorted(clean.items()))

    def build_hash_data_raw(self, params: dict) -> str:
        sorted_params = self.clean_and_sort(params)

        return "&".join(
            f"{key}={value}"
            for key, value in sorted_params.items()
        )

    def build_hash_data_quote_plus(self, params: dict) -> str:
        sorted_params = self.clean_and_sort(params)

        return "&".join(
            f"{key}={urllib.parse.quote_plus(value)}"
            for key, value in sorted_params.items()
        )

    def build_hash_data_quote(self, params: dict) -> str:
        sorted_params = self.clean_and_sort(params)

        return "&".join(
            f"{key}={urllib.parse.quote(value, safe='')}"
            for key, value in sorted_params.items()
        )

    def build_query_string(self, params: dict) -> str:
        sorted_params = self.clean_and_sort(params)

        return urllib.parse.urlencode(
            sorted_params,
            quote_via=urllib.parse.quote_plus,
        )

    def get_base_params(
        self,
        ip_address,
        amount,
        order_info,
        order_type,
        txn_ref,
        create_date,
        expire_date,
    ):
        return {
            "vnp_Version": "2.1.0",
            "vnp_Command": "pay",
            "vnp_TmnCode": self.tmn_code,
            "vnp_Amount": str(int(amount) * 100),
            "vnp_CurrCode": "VND",
            "vnp_TxnRef": str(txn_ref),
            "vnp_OrderInfo": str(order_info),
            "vnp_OrderType": str(order_type or "other"),
            "vnp_Locale": "vn",
            "vnp_ReturnUrl": self.return_url,
            "vnp_IpAddr": str(ip_address or "127.0.0.1"),
            "vnp_CreateDate": str(create_date),
            "vnp_ExpireDate": str(expire_date),
        }

    def build_payment_url_by_mode(self, params: dict, mode: str = "raw"):
        if mode == "raw":
            hash_data = self.build_hash_data_raw(params)
        elif mode == "quote_plus":
            hash_data = self.build_hash_data_quote_plus(params)
        elif mode == "quote":
            hash_data = self.build_hash_data_quote(params)
        else:
            raise ValueError("mode không hợp lệ")

        secure_hash = self.hmacsha512(hash_data)
        query_string = self.build_query_string(params)

        return {
            "mode": mode,
            "hash_data": hash_data,
            "secure_hash": secure_hash,
            "payment_url": f"{self.payment_url}?{query_string}&vnp_SecureHash={secure_hash}",
        }

    def build_payment_url(
        self,
        ip_address,
        amount,
        order_info,
        order_type,
        txn_ref,
        create_date,
        expire_date,
    ):
        params = self.get_base_params(
            ip_address=ip_address,
            amount=amount,
            order_info=order_info,
            order_type=order_type,
            txn_ref=txn_ref,
            create_date=create_date,
            expire_date=expire_date,
        )

        # VNPay 2.1.0 calculates the checksum from the URL-encoded field
        # values. Use the same encoding as the query string sent to VNPay;
        # otherwise fields such as vnp_ReturnUrl make the signature differ.
        result = self.build_payment_url_by_mode(params, mode="quote_plus")

        print("========== VNPAY CREATE DEBUG ==========")
        print("TMN_CODE:", self.tmn_code)
        print("HASH_SECRET_LENGTH:", len(self.hash_secret))
        print("MODE:", result["mode"])
        print("HASH_DATA:", result["hash_data"])
        print("SECURE_HASH:", result["secure_hash"])
        print("========================================")

        return result["payment_url"]

    def build_debug_urls(
        self,
        ip_address,
        amount,
        order_info,
        order_type,
        txn_ref,
        create_date,
        expire_date,
    ):
        params = self.get_base_params(
            ip_address=ip_address,
            amount=amount,
            order_info=order_info,
            order_type=order_type,
            txn_ref=txn_ref,
            create_date=create_date,
            expire_date=expire_date,
        )

        return {
            "raw": self.build_payment_url_by_mode(params, "raw"),
            "quote_plus": self.build_payment_url_by_mode(params, "quote_plus"),
            "quote": self.build_payment_url_by_mode(params, "quote"),
        }

    def validate_response(self, response_data):
        data = dict(response_data)

        vnp_secure_hash = data.pop("vnp_SecureHash", None)
        data.pop("vnp_SecureHashType", None)

        if not vnp_secure_hash:
            return False

        vnp_params = {
            key: value
            for key, value in data.items()
            if str(key).startswith("vnp_")
        }

        # Query parameters have already been decoded by the web framework.
        # Re-encode them exactly as when creating the payment URL before
        # calculating the checksum returned by VNPay.
        hash_data = self.build_hash_data_quote_plus(vnp_params)
        secure_hash = self.hmacsha512(hash_data)

        print("========== VNPAY VERIFY DEBUG ==========")
        print("HASH_DATA:", hash_data)
        print("SECURE_HASH_SERVER:", secure_hash)
        print("SECURE_HASH_VNPAY:", vnp_secure_hash)
        print("========================================")

        return secure_hash.lower() == str(vnp_secure_hash).lower()
