import { submitFeedback, submitFeedbackBatch } from '../api';
import { supabase } from '../supabaseClient';


function toPage(data, pageSize, getCursor) {
  const rows = data || [];
  const hasMore = rows.length > pageSize;
  const queue = hasMore ? rows.slice(0, pageSize) : rows;
  const lastItem = queue[queue.length - 1] || null;

  return {
    queue,
    hasMore,
    nextCursor: lastItem ? getCursor(lastItem) : null,
  };
}


export async function fetchPriorityFeedbackQueue({
  userId,
  thresholdRatio,
  pageSize,
}) {
  const { data, error } = await supabase.rpc('get_priority_feedback_queue', {
    p_user_id: userId,
    p_threshold: thresholdRatio,
    p_limit: pageSize,
  });

  if (error) throw error;

  return toPage(data, pageSize, (review) => ({
    confidence: review.confidence,
    id: review.id,
  }));
}


export async function fetchAllFeedbackQueue({ userId, cursor, pageSize }) {
  const { data, error } = await supabase.rpc('get_all_feedback_queue', {
    p_user_id: userId,
    p_before_created_at: cursor?.createdAt || null,
    p_before_id: cursor?.id || null,
    p_limit: pageSize,
  });

  if (error) throw error;

  return toPage(data, pageSize, (review) => ({
    createdAt: review.created_at,
    id: review.id,
  }));
}


export async function submitReviewFeedback(payload) {
  return submitFeedback(payload);
}


export async function submitReviewFeedbackBatch(payloads) {
  if (!payloads.length) return { processed: 0 };
  return submitFeedbackBatch(payloads);
}
