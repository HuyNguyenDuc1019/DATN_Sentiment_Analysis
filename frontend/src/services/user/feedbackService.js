import { submitFeedback } from '../api';
import { supabase } from '../supabaseClient';

import { isLowConfidence } from '../../utils/user/feedbackUtils';

const API_BASE_URL =
  import.meta.env.VITE_FASTAPI_URL ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_PYTHON_API ||
  'http://localhost:8000';

async function fetchProcessedReviewIds(userId) {
  const { data, error } = await supabase
    .from('feedback_data')
    .select('scraped_review_id')
    .eq('user_id', userId)
    .not('scraped_review_id', 'is', null);

  if (error) {
    console.warn('Không thể tải lịch sử duyệt phản hồi:', error);
    return new Set();
  }

  return new Set((data || []).map((item) => item.scraped_review_id).filter(Boolean));
}

async function buildExcludedIds(userId, ignoredIds) {
  const processedIds = await fetchProcessedReviewIds(userId);
  return new Set([...(ignoredIds || []), ...processedIds]);
}

export async function fetchPriorityFeedbackQueue({
  userId,
  ignoredIds,
  thresholdRatio,
  scanLimit,
  priorityLimit,
}) {
  const excludedIds = await buildExcludedIds(userId, ignoredIds);

  const { data, error } = await supabase
    .from('scraped_reviews')
    .select('id,content,ai_label,confidence,source_url,created_at')
    .eq('user_id', userId)
    .order('confidence', { ascending: true })
    .limit(scanLimit);

  if (error) throw error;

  return (data || [])
    .filter((review) => !excludedIds.has(review.id))
    .filter((review) => isLowConfidence(review.confidence, thresholdRatio))
    .slice(0, priorityLimit);
}

export async function fetchAllFeedbackQueue({ userId, ignoredIds, page, pageSize }) {
  const excludedIds = await buildExcludedIds(userId, ignoredIds);
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from('scraped_reviews')
    .select('id,content,ai_label,confidence,source_url,created_at', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;

  return {
    queue: (data || []).filter((review) => !excludedIds.has(review.id)),
    count: Math.max(0, (count || 0) - excludedIds.size),
  };
}

export async function submitReviewFeedback(payload) {
  return submitFeedback(payload);
}

export async function submitReviewFeedbackBatch(items) {
  const response = await fetch(`${API_BASE_URL}/feedback/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.detail || 'Không thể xử lý hàng loạt bình luận.');
  }

  return data;
}
