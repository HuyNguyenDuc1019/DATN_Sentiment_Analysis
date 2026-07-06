export const emptyStats = {
  apiCalls: 0,
  users: 0,
  pendingFeedback: 0,
  positiveRate: 0,
};

export function formatNumber(value) {
  return Number(value || 0).toLocaleString('vi-VN');
}

export function formatAdminChartData(chartData = []) {
  return chartData.map((item) => ({
    key: item.date,
    label: item.date,
    positive: Number(item.positive || item.positive_count || 0),
    negative: Number(item.negative || item.negative_count || 0),
    total: Number(item.total || item.api_calls || 0),
  }));
}

export function getRecentUsers(usersData = []) {
  return [...usersData]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 6);
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
