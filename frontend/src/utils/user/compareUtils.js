export const EMPTY_RESTAURANT = {
  name: '',
  url: '',
};

export const DEMO_RESULT = [
  {
    id: 'demo-a',
    restaurant_name: 'Quán A',
    source_url: 'https://www.foody.vn/demo/quan-a',
    total_reviews: 120,
    positive_count: 94,
    negative_count: 26,
    positive_rate: 78.3,
    negative_rate: 21.7,
    risk_score: 31,
    top_positive_keywords: ['ngon', 'phục vụ nhanh', 'đáng tiền'],
    top_negative_keywords: ['giá hơi cao', 'hết bàn'],
    recommendation: 'Phù hợp nếu bạn ưu tiên món ăn ngon và trải nghiệm ổn định.',
  },
  {
    id: 'demo-b',
    restaurant_name: 'Quán B',
    source_url: 'https://www.foody.vn/demo/quan-b',
    total_reviews: 96,
    positive_count: 60,
    negative_count: 36,
    positive_rate: 62.5,
    negative_rate: 37.5,
    risk_score: 58,
    top_positive_keywords: ['giá hợp lý', 'nhiều món', 'không gian rộng'],
    top_negative_keywords: ['chờ lâu', 'phục vụ chậm', 'ồn'],
    recommendation: 'Có thể chọn nếu ưu tiên giá, nhưng nên tránh giờ cao điểm.',
  },
];

export function getRiskTone(score) {
  const risk = Number(score || 0);

  if (risk >= 75) {
    return {
      label: 'Rủi ro cao',
      text: 'text-rose-300',
      border: 'border-rose-500/30',
      bg: 'bg-rose-500/10',
      bar: 'bg-rose-500',
    };
  }

  if (risk >= 45) {
    return {
      label: 'Cần cân nhắc',
      text: 'text-amber-300',
      border: 'border-amber-500/30',
      bg: 'bg-amber-500/10',
      bar: 'bg-amber-500',
    };
  }

  return {
    label: 'Khá an toàn',
    text: 'text-emerald-300',
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/10',
    bar: 'bg-emerald-500',
  };
}

export function normalizeUrl(value) {
  return String(value || '').trim();
}

export function getComparableUrl(value) {
  const raw = normalizeUrl(value).toLowerCase();
  return raw.replace(/\/+$/, '');
}

export function inferRestaurantNameFromUrl(url, fallback = '') {
  const cleanUrl = normalizeUrl(url);

  if (!cleanUrl) return fallback;

  try {
    const parsed = new URL(cleanUrl);
    const segments = parsed.pathname
      .split('/')
      .map((item) => item.trim())
      .filter(Boolean);

    const slug = segments[segments.length - 1] || fallback || parsed.hostname;

    return slug
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  } catch {
    const slug = cleanUrl.split('/').filter(Boolean).pop() || fallback;
    return slug
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }
}

export function getDataSourceBadge(source) {
  if (source === 'database') {
    return {
      label: 'Dữ liệu cũ',
      className: 'border-sky-500/25 bg-sky-500/10 text-sky-300',
    };
  }

  if (source === 'scraper') {
    return {
      label: 'Cào mới',
      className: 'border-violet-500/25 bg-violet-500/10 text-violet-300',
    };
  }

  return {
    label: 'Tạm thời',
    className: 'border-slate-500/25 bg-slate-500/10 text-slate-300',
  };
}

export function formatDateTime(value) {
  if (!value) return 'Không rõ thời gian';

  try {
    return new Date(value).toLocaleString('vi-VN');
  } catch {
    return 'Không rõ thời gian';
  }
}

export function normalizeKeywordList(value) {
  if (Array.isArray(value)) return value.filter(Boolean).slice(0, 5);

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 5);
  }

  return [];
}

export function buildRecommendationSummary(items) {
  if (!items.length) return null;

  const bestTaste = [...items].sort((a, b) => Number(b.positive_rate || 0) - Number(a.positive_rate || 0))[0];
  const safest = [...items].sort((a, b) => Number(a.risk_score || 0) - Number(b.risk_score || 0))[0];
  const mostAffordable = items.find((item) =>
    normalizeKeywordList(item.top_positive_keywords).some((word) =>
      ['giá hợp lý', 'giá rẻ', 'rẻ', 'đáng tiền'].some((key) =>
        String(word).toLowerCase().includes(key),
      ),
    ),
  );

  const warning = [...items].sort((a, b) => Number(b.risk_score || 0) - Number(a.risk_score || 0))[0];

  return {
    bestTaste,
    safest,
    mostAffordable,
    warning,
  };
}
