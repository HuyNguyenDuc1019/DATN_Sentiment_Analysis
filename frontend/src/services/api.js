import axios from 'axios';

// Base axios instance
const api = axios.create({
  baseURL: 'http://localhost:8000',
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

// Response interceptor for unified error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      (error.code === 'ECONNABORTED' ? 'Request timeout. Backend quá lâu phản hồi.' : 'Không thể kết nối tới Backend. Kiểm tra uvicorn đã chạy chưa.');
    return Promise.reject(new Error(message));
  }
);

/** Batch predict from an array of texts */
export const predictBatch = async (payload) => {
  const { data } = await api.post('/predict/batch', payload);
  return data;
};

/** Analyze comments from a URL (Shopee / Foody) */
export const analyzeUrl = async (payload) => {
  const { data } = await api.post('/predict/url', payload);
  return data;
};

/** Submit correction feedback */
export const submitFeedback = async (payload) => {
  await api.post('/feedback', payload);
};

export default api;