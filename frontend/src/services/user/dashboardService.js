import {
  fetchDashboardAlerts,
  fetchKeywordAnalytics,
} from '../api';
import { fetchUserReviews } from '../reviews';

import {
  extractAlerts,
  uniqueAlerts,
} from '../../utils/user/dashboardUtils';

export async function fetchDashboardReviews(userId) {
  return fetchUserReviews(userId);
}

export async function fetchDashboardKeywordAnalytics({ userId, sourceUrl }) {
  return fetchKeywordAnalytics({ userId, sourceUrl });
}

export async function fetchAlertsForSources(userId, reviews) {
  const sources = [...new Set(reviews.map((item) => item.source_url).filter(Boolean))];

  if (!sources.length) return [];

  const responses = await Promise.allSettled(
    sources.map((sourceUrl) => fetchDashboardAlerts({ userId, sourceUrl })),
  );

  const alerts = responses
    .filter((result) => result.status === 'fulfilled')
    .flatMap((result) => extractAlerts(result.value));

  return uniqueAlerts(alerts)
    .sort((a, b) => new Date(b.review_date || b.created_at || 0) - new Date(a.review_date || a.created_at || 0));
}
