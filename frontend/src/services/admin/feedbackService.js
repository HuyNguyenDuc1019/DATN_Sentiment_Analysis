import { supabase } from '../supabaseClient';

const API_BASE_URL = 'http://localhost:8000';

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

export async function fetchFeedbackConfidenceMap(adminId) {
  const response = await fetch(`${API_BASE_URL}/api/admin/feedback/confidence-map?admin_id=${adminId}`);

  if (!response.ok) {
    return {};
  }

  return response.json();
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
