import { confidenceRatio } from '../../services/reviews';

export const PAGE_SIZE = 100;
export const PRIORITY_LIMIT = 100;
export const PRIORITY_SCAN_LIMIT = 300;

export function normalizeLabelToNumber(label) {
  if (typeof label === 'number') return label === 1 ? 1 : 0;
  if (typeof label === 'boolean') return label ? 1 : 0;

  const text = String(label || '').trim().toLowerCase();

  if (['1', 'positive', 'pos', 'tích cực', 'tich cuc', 'hài lòng', 'hai long', 'khách hài lòng'].includes(text)) {
    return 1;
  }

  return 0;
}

export function getConfidenceRatio(confidence) {
  return confidenceRatio(confidence);
}

export function getConfidencePercent(confidence) {
  return (getConfidenceRatio(confidence) * 100).toFixed(1);
}

export function isLowConfidence(confidence, thresholdRatio = 0.7) {
  return getConfidenceRatio(confidence) < thresholdRatio;
}

export function confidenceThresholdStorageKey(userId) {
  return `feedback-confidence-threshold:${userId || 'guest'}`;
}

export function getSavedConfidenceThreshold(userId) {
  try {
    const saved = localStorage.getItem(confidenceThresholdStorageKey(userId));
    const value = Number(saved);

    if (Number.isFinite(value) && value >= 30 && value <= 95) {
      return value;
    }
  } catch {
    // Ignore localStorage errors
  }

  return 70;
}

export function saveConfidenceThreshold(userId, value) {
  try {
    localStorage.setItem(confidenceThresholdStorageKey(userId), String(value));
  } catch {
    // Ignore localStorage errors
  }
}

export function createFeedbackPayload(review, userId, correctedLabel, status = 'corrected') {
  const oldLabel = normalizeLabelToNumber(review.ai_label);

  return {
    original_content: review.content,
    old_ai_label: oldLabel,
    corrected_label: correctedLabel,
    user_id: userId,
    scraped_review_id: review.id,
    status,
    include_retrain: status === 'corrected' && correctedLabel !== oldLabel,
  };
}

export function formatRelativeTime(createdAt) {
  if (!createdAt) return '';

  const createdTime = new Date(createdAt).getTime();
  if (Number.isNaN(createdTime)) return '';

  const diffSeconds = Math.max(0, Math.floor((Date.now() - createdTime) / 1000));
  if (diffSeconds < 60) return 'Vừa xong';

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}p trước`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h trước`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} ngày trước`;

  return new Date(createdAt).toLocaleDateString('vi-VN');
}

export function ignoredStorageKey(userId) {
  return `ignored-feedback-reviews:${userId}`;
}

export function getIgnoredReviewIds(userId) {
  try {
    const saved = JSON.parse(localStorage.getItem(ignoredStorageKey(userId)) || '[]');
    return new Set(Array.isArray(saved) ? saved : []);
  } catch {
    return new Set();
  }
}

export function rememberIgnoredReview(userId, reviewId) {
  const ignoredIds = getIgnoredReviewIds(userId);
  ignoredIds.add(reviewId);
  localStorage.setItem(ignoredStorageKey(userId), JSON.stringify([...ignoredIds]));
}
