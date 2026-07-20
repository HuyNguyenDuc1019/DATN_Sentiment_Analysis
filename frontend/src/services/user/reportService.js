import { fetchReportSummary as fetchReportSummaryApi } from '../api';
import { cachedRequest } from '../../utils/common/ttlCache';

const REPORT_CACHE_TTL = 60_000;

function readSessionCache(key) {
  if (typeof window === 'undefined') return null;

  try {
    const cached = JSON.parse(window.sessionStorage.getItem(key));
    if (!cached || Number(cached.expiresAt || 0) <= Date.now()) {
      window.sessionStorage.removeItem(key);
      return null;
    }
    return cached.value;
  } catch {
    return null;
  }
}

function writeSessionCache(key, value) {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(key, JSON.stringify({
      value,
      expiresAt: Date.now() + REPORT_CACHE_TTL,
    }));
  } catch {
    // Trình duyệt có thể chặn sessionStorage; báo cáo vẫn hoạt động bằng cache bộ nhớ.
  }
}

export async function fetchReportSummary({
  userId,
  startDate = '',
  endDate = '',
  source = 'all',
  sourceUrls = [],
  force = false,
}) {
  const normalizedUrls = [...new Set(sourceUrls.filter(Boolean))].sort();
  const key = `report:summary:${userId}:${startDate}:${endDate}:${source}:${normalizedUrls.join('|') || 'all'}`;
  const sessionKey = `almotion:${key}`;
  const payload = await cachedRequest(
    key,
    async () => {
      if (!force) {
        const cached = readSessionCache(sessionKey);
        if (cached) return cached;
      }

      const value = await fetchReportSummaryApi({
        userId,
        startDate,
        endDate,
        source,
        sourceUrls: normalizedUrls,
        force,
      });
      writeSessionCache(sessionKey, value);
      return value;
    },
    { force, ttl: REPORT_CACHE_TTL },
  );
  return payload?.data || payload || {};
}
