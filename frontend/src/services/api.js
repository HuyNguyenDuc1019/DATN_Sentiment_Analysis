const PYTHON_API = 'http://localhost:8000';
const SCRAPER_API = 'http://localhost:3000';

const normalizeLabel = (value) => {
  if (value === 1 || value === '1') return 1;
  if (value === 0 || value === '0') return 0;

  const text = String(value ?? '').trim().toLowerCase();
  return ['positive', 'pos', 'label_1', 'tích cực', 'tich cuc'].includes(text) ? 1 : 0;
};

const normalizeResult = (item) => ({
  text: item?.text ?? item?.content ?? item?.comment ?? item?.review ?? '',
  prediction: normalizeLabel(item?.prediction ?? item?.label ?? item?.ai_label),
  confidence:
    Number(item?.confidence || 0) > 1
      ? Number(item.confidence) / 100
      : Number(item?.confidence || 0),
});

const extractResults = (payload, depth = 0) => {
  if (!payload || depth > 5) return [];
  if (Array.isArray(payload)) return payload;

  for (const key of ['results', 'data', 'predictions', 'items', 'reviews', 'comments']) {
    const found = extractResults(payload[key], depth + 1);
    if (found.length) return found;
  }

  return [];
};

const post = async (url, body) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);

  if (!response.ok || data?.success === false) {
    throw new Error(data?.detail || data?.error || data?.message || 'Máy chủ trả về lỗi.');
  }

  return data;
};

const get = async (url, params = {}) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, value);
    }
  });

  const response = await fetch(`${url}?${query.toString()}`);
  const data = await response.json().catch(() => null);

  if (!response.ok || data?.success === false) {
    throw new Error(data?.detail || data?.error || data?.message || 'Không tải được dữ liệu.');
  }

  return data;
};

export const predictBatch = async (payload) => {
  const data = await post(`${PYTHON_API}/predict/batch`, payload);
  return extractResults(data).map(normalizeResult).filter((item) => item.text);
};

export const analyzeUrl = async (payload) => {
  const data = await post(`${SCRAPER_API}/api/scrape`, payload);
  return extractResults(data).map(normalizeResult).filter((item) => item.text);
};

export const submitFeedback = (payload) => post(`${PYTHON_API}/feedback`, payload);

export const fetchDashboardAlerts = ({ userId, sourceUrl = 'all' }) =>
  get(`${PYTHON_API}/api/dashboard/alerts`, {
    user_id: userId,
    source_url: sourceUrl || 'all',
  });

export const fetchKeywordAnalytics = ({ userId, sourceUrl = 'all' }) =>
  get(`${PYTHON_API}/api/dashboard/keyword-analytics`, {
    user_id: userId,
    source_url: sourceUrl || 'all',
  });
