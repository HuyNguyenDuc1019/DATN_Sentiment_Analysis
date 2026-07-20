import {
  fetchDashboardAlerts,
  fetchDashboardRestaurants,
  fetchDashboardSummary as fetchDashboardSummaryApi,
  fetchKeywordAnalytics,
} from '../api';
import { cachedRequest } from '../../utils/common/ttlCache';

import {
  extractAlerts,
  uniqueAlerts,
} from '../../utils/user/dashboardUtils';

export async function fetchDashboardRestaurantOptions(userId, options = {}) {
  const payload = await cachedRequest(
    `dashboard:restaurants:${userId}`,
    () => fetchDashboardRestaurants({ userId, force: Boolean(options.force) }),
    options,
  );

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.restaurants)) return payload.restaurants;
  return [];
}

export async function fetchDashboardSummary({ userId, sourceUrls = [], force = false }) {
  const normalizedUrls = [...new Set(sourceUrls.filter(Boolean))].sort();
  const payload = await cachedRequest(
    `dashboard:summary:${userId}:${normalizedUrls.join('|') || 'all'}`,
    () => fetchDashboardSummaryApi({ userId, sourceUrls: normalizedUrls, force }),
    { force },
  );
  return payload?.data || payload || {};
}

function mergeKeywordRows(payloads, key) {
  const counts = new Map();

  payloads.forEach((payload) => {
    const rows = payload?.leaderboard?.[key] || payload?.data?.leaderboard?.[key] || [];

    rows.forEach((item) => {
      const keyword = String(item?.keyword || item?.text || '').trim();
      if (!keyword) return;
      counts.set(keyword, (counts.get(keyword) || 0) + Number(item?.count || 0));
    });
  });

  return [...counts.entries()]
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count || a.keyword.localeCompare(b.keyword, 'vi'))
    .slice(0, 5);
}

export async function fetchDashboardKeywordAnalytics({ userId, sourceUrls = [], force = false }) {
  const urls = [...new Set(sourceUrls.filter(Boolean))];

  if (!urls.length) {
    return cachedRequest(
      `dashboard:keywords:${userId}:all`,
      () => fetchKeywordAnalytics({ userId, sourceUrl: 'all', force }),
      { force },
    );
  }

  const payloads = await Promise.all(
    urls.map((sourceUrl) => cachedRequest(
      `dashboard:keywords:${userId}:${sourceUrl}`,
      () => fetchKeywordAnalytics({ userId, sourceUrl, force }),
      { force },
    )),
  );

  if (payloads.length === 1) return payloads[0];

  return {
    leaderboard: {
      top_positive: mergeKeywordRows(payloads, 'top_positive'),
      top_negative: mergeKeywordRows(payloads, 'top_negative'),
    },
  };
}

export async function fetchAlertsForSources(userId, sourceUrls = [], force = false) {
  const sources = [...new Set(sourceUrls.filter(Boolean))];
  const targets = sources.length ? sources : ['all'];

  const responses = await Promise.allSettled(
    targets.map((sourceUrl) => cachedRequest(
      `dashboard:alerts:${userId}:${sourceUrl}`,
      () => fetchDashboardAlerts({ userId, sourceUrl, force }),
      { force },
    )),
  );

  const alerts = responses
    .filter((result) => result.status === 'fulfilled')
    .flatMap((result) => extractAlerts(result.value));

  return uniqueAlerts(alerts)
    .sort((a, b) => new Date(b.review_date || b.created_at || 0) - new Date(a.review_date || a.created_at || 0));
}
