const PYTHON_API = 'http://localhost:8000';
const SCRAPER_API = 'http://localhost:3000';

const normalizeLabel = (value) => {
  if (value === 1 || value === '1') return 1;
  if (value === 0 || value === '0') return 0;

  const text = String(value ?? '').trim().toLowerCase();

  return [
    'positive',
    'pos',
    'label_1',
    'tích cực',
    'tich cuc',
    'khách hài lòng',
    'khach hai long',
  ].includes(text)
    ? 1
    : 0;
};

const normalizeConfidence = (value) => {
  const number = Number(value || 0);
  return number > 1 ? number / 100 : number;
};

const normalizeResult = (item) => ({
  text: item?.text ?? item?.content ?? item?.comment ?? item?.review ?? item?.original_content ?? '',
  prediction: normalizeLabel(item?.prediction ?? item?.label ?? item?.ai_label ?? item?.sentiment),
  confidence: normalizeConfidence(item?.confidence ?? item?.score ?? item?.probability),
});

const extractResults = (payload, depth = 0) => {
  if (!payload || depth > 6) return [];
  if (Array.isArray(payload)) return payload;

  for (const key of ['results', 'data', 'predictions', 'items', 'reviews', 'comments', 'outputs']) {
    const found = extractResults(payload[key], depth + 1);
    if (found.length) return found;
  }

  return [];
};

const extractCount = (payload, depth = 0) => {
  if (!payload || depth > 6) return 0;
  if (Array.isArray(payload)) return payload.length;

  for (const key of [
    'count',
    'total',
    'saved_count',
    'savedCount',
    'inserted',
    'inserted_count',
    'review_count',
  ]) {
    const value = Number(payload[key]);
    if (Number.isFinite(value) && value >= 0) return value;
  }

  for (const key of ['data', 'result', 'payload', 'summary']) {
    const value = extractCount(payload[key], depth + 1);
    if (value > 0) return value;
  }

  return 0;
};

const getErrorMessage = (data, fallback) => {
  const raw = data?.detail ?? data?.error ?? data?.message ?? data;

  if (!raw) return fallback;
  if (typeof raw === 'string') return raw;

  if (Array.isArray(raw)) {
    return raw
      .map((item) => {
        if (typeof item === 'string') return item;
        return item?.msg || item?.message || JSON.stringify(item);
      })
      .join('\n');
  }

  if (typeof raw === 'object') {
    return raw.msg || raw.message || JSON.stringify(raw);
  }

  return String(raw);
};

const post = async (url, body, options = {}) => {
  let response;
  let data;

  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: options.signal,
    });

    data = await response.json().catch(() => null);
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }

    throw new Error(
      'Không kết nối được server. Vui lòng kiểm tra dịch vụ đã chạy chưa.',
      { cause: error },
    );
  }

  if (!response.ok || data?.success === false) {
    const error = new Error(getErrorMessage(data, 'Máy chủ trả về lỗi.'));
    error.status = response.status;
    error.data = data;
    throw error;
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

  let response;
  let data;

  try {
    const queryString = query.toString();
    const finalUrl = queryString ? `${url}?${queryString}` : url;

    response = await fetch(finalUrl);
    data = await response.json().catch(() => null);
  } catch {
    throw new Error('Không kết nối được server. Vui lòng kiểm tra dịch vụ đã chạy chưa.');
  }

  if (!response.ok || data?.success === false) {
    const error = new Error(getErrorMessage(data, 'Không tải được dữ liệu.'));
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

export const predictBatch = async (payload, options = {}) => {
  const data = await post(`${PYTHON_API}/predict/batch`, payload, options);

  return extractResults(data)
    .map(normalizeResult)
    .filter((item) => item.text);
};

export const analyzeUrl = async (payload, options = {}) => {
  const data = await post(`${SCRAPER_API}/api/scrape`, payload, options);

  const results = extractResults(data)
    .map(normalizeResult)
    .filter((item) => item.text);

  const count = results.length || extractCount(data);

  return {
    results,
    count,
    raw: data,
  };
};

export const stopScrapeTask = async (taskId) => {
  if (!taskId) return null;

  return post(`${SCRAPER_API}/api/scrape/stop`, {
    task_id: taskId,
  });
};

export const submitFeedback = (payload) => {
  return post(`${PYTHON_API}/feedback`, payload);
};

export const submitFeedbackBatch = (payloads) => {
  return post(`${PYTHON_API}/feedback/batch`, {
    items: payloads,
  });
};

export const fetchDashboardAlerts = ({ userId, sourceUrl = 'all', force = false }) => {
  return get(`${PYTHON_API}/api/dashboard/alerts`, {
    user_id: userId,
    source_url: sourceUrl || 'all',
    refresh: force ? 'true' : '',
  });
};

export const fetchDashboardRestaurants = ({ userId, force = false }) => {
  return get(`${PYTHON_API}/api/dashboard/restaurants`, {
    user_id: userId,
    refresh: force ? 'true' : '',
  });
};

export const fetchDashboardSummary = ({ userId, sourceUrls = [], force = false }) => {
  return get(`${PYTHON_API}/api/dashboard/summary`, {
    user_id: userId,
    source_urls: sourceUrls.join(','),
    refresh: force ? 'true' : '',
  });
};

export const fetchReportSummary = ({ userId, startDate, endDate, source = 'all', sourceUrls = [], force = false }) => {
  return get(`${PYTHON_API}/api/report/summary`, {
    user_id: userId,
    start_date: startDate,
    end_date: endDate,
    source,
    source_urls: sourceUrls.join(','),
    refresh: force ? 'true' : '',
  });
};

export const fetchKeywordAnalytics = ({ userId, sourceUrl = 'all', force = false }) => {
  return get(`${PYTHON_API}/api/dashboard/keyword-analytics`, {
    user_id: userId,
    source_url: sourceUrl || 'all',
    refresh: force ? 'true' : '',
  });
};
