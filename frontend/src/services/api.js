import axios from 'axios';
// ============== LOGIC MỚI: IMPORT KẾT NỐI SUPABASE ==============
import { supabase } from './supabaseClient'; 
// ===============================================================

// Base axios instance
const api = axios.create({
  baseURL: 'http://127.0.0.1:8000',
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor for logging & TỰ ĐỘNG ĐÍNH KÈM TOKEN SUPABASE (GIỮ NGUYÊN)
api.interceptors.request.use(
  async (config) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
      }
    } catch (authError) {
      console.error('Không thể lấy Token từ Supabase:', authError);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for unified error handling (GIỮ NGUYÊN HOÀN TOÀN CỦA BẠN)
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

/** Analyze comments from a URL (Shopee / Foody) 
 * ĐÃ SỬA ĐỒNG BỘ: Chuyển hướng endpoint ngầm sang /predict/batch để khớp cấu trúc Python của nhóm bạn
*/
export const analyzeUrl = async (payload) => {
  const { data } = await api.post('/predict/batch', payload);
  return data;
};

/** Submit correction feedback */
export const submitFeedback = async (payload) => {
  await api.post('/feedback', payload);
};

export default api;