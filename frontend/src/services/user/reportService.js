import { fetchKeywordAnalytics } from '../api';
import { fetchUserReviews } from '../reviews';

export async function fetchReportReviews(userId, filters) {
  return fetchUserReviews(userId, filters);
}

export async function fetchReportKeywordAnalytics({ userId, sourceUrl }) {
  return fetchKeywordAnalytics({ userId, sourceUrl });
}
