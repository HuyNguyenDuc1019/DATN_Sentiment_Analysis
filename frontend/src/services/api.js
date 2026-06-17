import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000',
  timeout: 180000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      (error.code === 'ECONNABORTED'
        ? 'Request timeout. Backend quá lâu phản hồi.'
        : 'Không thể kết nối tới Backend. Kiểm tra uvicorn đã chạy chưa.');

    return Promise.reject(new Error(message));
  }
);

const normalizePrediction = (value) => {
  if (value === 1 || value === '1') return 1;
  if (value === 0 || value === '0') return 0;

  const text = String(value || '').trim().toLowerCase();
  if (['positive', 'pos', 'label_1', 'tích cực', 'tich cuc'].includes(text)) return 1;
  if (['negative', 'neg', 'label_0', 'tiêu cực', 'tieu cuc'].includes(text)) return 0;

  return 0;
};

const normalizeConfidence = (value) => {
  const num = Number(value) || 0;
  return num > 1 ? num / 100 : num;
};

const normalizeResult = (item) => ({
  text: item.text ?? item.content ?? item.comment ?? '',
  prediction: normalizePrediction(item.prediction ?? item.label ?? item.ai_label),
  confidence: normalizeConfidence(item.confidence),
});

export const predictBatch = async (payload) => {
  const { data } = await api.post('/predict/batch', payload);
  const results = Array.isArray(data) ? data : data.results;
  return (results || []).map(normalizeResult);
};

export const analyzeUrl = async (payload) => {
  const { data } = await api.post('/predict/url', payload);
  return data;
};

export const submitFeedback = async (payload) => {
  await api.post('/feedback', payload);
};

export default api;