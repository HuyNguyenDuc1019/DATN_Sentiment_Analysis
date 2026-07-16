export const EMPTY_RESTAURANT = {
  name: '',
  url: '',
};

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

    const slug = decodeURIComponent(
      segments[segments.length - 1] || fallback || parsed.hostname,
    );

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
