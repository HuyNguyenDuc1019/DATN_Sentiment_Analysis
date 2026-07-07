import { supabase } from '../supabaseClient';

const API_BASE_URL =
  import.meta.env.VITE_FASTAPI_URL ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_PYTHON_API ||
  'http://localhost:8000';

async function readJson(response) {
  return response.json().catch(() => null);
}

function normalizeConfidenceValue(value) {
  if (value === null || value === undefined || value === '') return null;

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) return null;

  return numberValue;
}

function normalizeConfidenceMap(data) {
  const source =
    data?.data ||
    data?.confidence_map ||
    data?.confidenceMap ||
    data?.map ||
    data;

  if (!source) return {};

  if (Array.isArray(source)) {
    return source.reduce((map, item) => {
      const reviewId =
        item.scraped_review_id ||
        item.review_id ||
        item.id ||
        item.feedback_id;

      const confidence =
        item.confidence ??
        item.ai_confidence ??
        item.score ??
        item.probability;

      if (reviewId) {
        map[reviewId] = normalizeConfidenceValue(confidence);
      }

      return map;
    }, {});
  }

  if (typeof source === 'object') {
    return Object.entries(source).reduce((map, [key, value]) => {
      map[key] = normalizeConfidenceValue(value);
      return map;
    }, {});
  }

  return {};
}

export async function getAdminId() {
  const { data: authData } = await supabase.auth.getUser();

  if (authData?.user?.id) {
    return authData.user.id;
  }

  const localUserId =
    localStorage.getItem('userId') ||
    localStorage.getItem('user_id') ||
    localStorage.getItem('adminId') ||
    localStorage.getItem('uid');

  if (localUserId) {
    return localUserId;
  }

  throw new Error('Không tìm thấy thông tin đăng nhập!');
}

export async function fetchAdminFeedback(adminId) {
  const response = await fetch(`${API_BASE_URL}/api/admin/feedback?admin_id=${adminId}`);

  if (!response.ok) {
    throw new Error('Lỗi server');
  }

  return response.json();
}

export async function fetchFeedbackConfidenceMap(input) {
  /**
   * Hỗ trợ 2 kiểu gọi:
   * 1. fetchFeedbackConfidenceMap(adminId)
   * 2. fetchFeedbackConfidenceMap(feedbackItems)
   */

  if (Array.isArray(input)) {
    const reviewIds = [
      ...new Set(
        input
          .map((item) => item.scraped_review_id || item.review_id)
          .filter(Boolean),
      ),
    ];

    if (reviewIds.length === 0) return {};

    const { data, error } = await supabase
      .from('scraped_reviews')
      .select('id, confidence')
      .in('id', reviewIds);

    if (error) {
      console.error('Không thể tải confidence từ scraped_reviews:', error);
      return {};
    }

    return (data || []).reduce((map, item) => {
      map[item.id] = normalizeConfidenceValue(item.confidence);
      return map;
    }, {});
  }

  const adminId = input;

  if (!adminId) return {};

  const response = await fetch(`${API_BASE_URL}/api/admin/feedback/confidence-map?admin_id=${adminId}`);
  const data = await readJson(response);

  if (!response.ok) {
    return {};
  }

  return normalizeConfidenceMap(data);
}

export async function reviewFeedback({ adminId, feedbackId, action }) {
  return fetch(`${API_BASE_URL}/api/admin/feedback/review?admin_id=${encodeURIComponent(adminId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      admin_id: adminId,
      feedback_id: feedbackId,
      action,
    }),
  });
}

export async function exportRetrainDataset(adminId) {
  return fetch(`${API_BASE_URL}/api/admin/dataset/export?admin_id=${adminId}`, {
    method: 'GET',
  });
}

export async function bulkReviewFeedback({ adminId, feedbackIds, action, reason, newLabel }) {
  return fetch(`${API_BASE_URL}/api/admin/feedback/bulk-review?admin_id=${encodeURIComponent(adminId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      admin_id: adminId,
      feedback_ids: feedbackIds,
      action,
      reason: reason || null,
      new_label: action === 'edit_label' ? Number(newLabel) : null,
    }),
  });
}

export async function exportSelectedFeedback({ adminId, feedbackIds }) {
  return fetch(`${API_BASE_URL}/api/admin/feedback/export-selected?admin_id=${encodeURIComponent(adminId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      admin_id: adminId,
      feedback_ids: feedbackIds,
    }),
  });
}

export async function fetchFeedbackDetail({ adminId, feedbackId }) {
  const response = await fetch(`${API_BASE_URL}/api/admin/feedback/${feedbackId}/detail?admin_id=${adminId}`);

  if (!response.ok) {
    throw new Error('Không tải được chi tiết phản hồi');
  }

  return response.json();
}

export async function reviewFeedbackDetailed({ adminId, feedbackId, action, reason, newLabel }) {
  return fetch(`${API_BASE_URL}/api/admin/feedback/review-detailed?admin_id=${encodeURIComponent(adminId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      admin_id: adminId,
      feedback_id: feedbackId,
      action,
      reason: reason || null,
      new_label: action === 'edit_label' ? Number(newLabel) : null,
    }),
  });
}