import hashlib
import hmac
import urllib.parse

class VNPayHelper:
    def __init__(self, tmn_code, hash_secret, payment_url, return_url):
        self.tmn_code = tmn_code
        self.hash_secret = hash_secret
        self.payment_url = payment_url
        self.return_url = return_url
        self.requestData = {}

    def get_payment_url(self, ip_address, amount, order_info, order_type, txn_ref, create_date, expire_date):
        self.requestData['vnp_Version'] = '2.1.0'
        self.requestData['vnp_Command'] = 'pay'
        self.requestData['vnp_TmnCode'] = self.tmn_code
        self.requestData['vnp_Amount'] = str(int(amount) * 100) # VNPay yêu cầu nhân 100
        self.requestData['vnp_CurrCode'] = 'VND'
        self.requestData['vnp_TxnRef'] = txn_ref
        self.requestData['vnp_OrderInfo'] = order_info
        self.requestData['vnp_OrderType'] = order_type
        self.requestData['vnp_Locale'] = 'vn'
        self.requestData['vnp_CreateDate'] = create_date
        self.requestData['vnp_ExpireDate'] = expire_date
        self.requestData['vnp_IpAddr'] = ip_address
        self.requestData['vnp_ReturnUrl'] = self.return_url

        # Sắp xếp theo alphabet
        inputData = sorted(self.requestData.items())
        queryString = ''
        hasData = ''
        seq = 0
        for key, val in inputData:
            if seq == 1:
                queryString = queryString + "&" + key + '=' + urllib.parse.quote_plus(str(val))
            else:
                seq = 1
                queryString = key + '=' + urllib.parse.quote_plus(str(val))

        # Tạo mã băm HMAC SHA512
        hashValue = self.__hmacsha512(self.hash_secret, queryString)
        return self.payment_url + "?" + queryString + '&vnp_SecureHash=' + hashValue

    def __hmacsha512(self, key, data):
        byteKey = key.encode('utf-8')
        byteData = data.encode('utf-8')
        return hmac.new(byteKey, byteData, hashlib.sha512).hexdigest()

    def validate_response(self, response_data):
        vnp_SecureHash = response_data.get('vnp_SecureHash')
        if 'vnp_SecureHash' in response_data:
            response_data.pop('vnp_SecureHash')
        
        if 'vnp_SecureHashType' in response_data:
            response_data.pop('vnp_SecureHashType')

        inputData = sorted(response_data.items())
        hasData = ''
        seq = 0
        for key, val in inputData:
            if str(key).startswith('vnp_'):
                if seq == 1:
                    hasData = hasData + "&" + str(key) + '=' + urllib.parse.quote_plus(str(val))
                else:
                    seq = 1
                    hasData = str(key) + '=' + urllib.parse.quote_plus(str(val))

        hashValue = self.__hmacsha512(self.hash_secret, hasData)
        return hashValue == vnp_SecureHash