const API_BASE_URL = 'http://localhost:8000';

const getErrorMessage = (data, fallback) => {
  const raw = data?.detail ?? data?.error ?? data?.message ?? data;

  if (!raw) return fallback;
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object') return raw.message || raw.msg || JSON.stringify(raw);

  return String(raw);
};

export const createVnpayPayment = async ({ userId, amount = 50000 }) => {
  const response = await fetch(`${API_BASE_URL}/payment/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: userId,
      amount,
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || data?.success === false) {
    throw new Error(getErrorMessage(data, 'Không thể tạo thanh toán VNPay.'));
  }

  return data;
};