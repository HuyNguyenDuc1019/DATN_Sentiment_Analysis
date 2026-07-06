import { submitFeedback } from '../api';
import { supabase } from '../supabaseClient';

import { isLowConfidence } from '../../utils/user/feedbackUtils';

export async function fetchPriorityFeedbackQueue({
  userId,
  ignoredIds,
  thresholdRatio,
  scanLimit,
  priorityLimit,
}) {
  const { data, error } = await supabase
    .from('scraped_reviews')
    .select('id,content,ai_label,confidence,source_url,created_at')
    .eq('user_id', userId)
    .order('confidence', { ascending: true })
    .limit(scanLimit);

  if (error) throw error;

  return (data || [])
    .filter((review) => !ignoredIds.has(review.id))
    .filter((review) => isLowConfidence(review.confidence, thresholdRatio))
    .slice(0, priorityLimit);
}

export async function fetchAllFeedbackQueue({ userId, ignoredIds, page, pageSize }) {
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
    queue: (data || []).filter((review) => !ignoredIds.has(review.id)),
    count: count || 0,
  };
}

export async function submitReviewFeedback(payload) {
  return submitFeedback(payload);
}
