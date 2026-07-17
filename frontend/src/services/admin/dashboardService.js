import { supabase } from '../supabaseClient';
import { escapeHtml } from '../../utils/admin/dashboardUtils';

const API_BASE_URL =
  import.meta.env.VITE_FASTAPI_URL ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_PYTHON_API ||
  'http://localhost:8000';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function readJson(response) {
  return response.json().catch(() => null);
}

async function fetchJsonWithRetry(url, options = {}, retries = 2) {
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, options);
      const data = await readJson(response);

      if (response.ok) {
        return data;
      }

      lastError = new Error(
        data?.detail ||
          data?.message ||
          data?.error ||
          `Server error ${response.status}`,
      );

      // Chỉ retry lỗi 500. Lỗi 400/401/403 thì không retry.
      if (response.status < 500) {
        throw lastError;
      }
    } catch (error) {
      lastError = error;
    }

    if (attempt < retries) {
      await sleep(500 * (attempt + 1));
    }
  }

  throw lastError || new Error('Không thể kết nối server.');
}

export async function getCurrentAdminId() {
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authData?.user?.id) {
    return authData.user.id;
  }

  const localUserId =
    localStorage.getItem('userId') ||
    localStorage.getItem('user_id') ||
    localStorage.getItem('adminId') ||
    localStorage.getItem('admin_id') ||
    localStorage.getItem('uid');

  if (localUserId) {
    return localUserId;
  }

  if (authError) {
    console.error('Lỗi lấy admin id:', authError);
  }

  throw new Error('Không tìm thấy thông tin đăng nhập.');
}

export async function fetchAdminDashboardData() {
  const adminId = await getCurrentAdminId();
  const encodedAdminId = encodeURIComponent(adminId);

  try {
    const [metricsData, chartDataResponse, usersData] = await Promise.all([
      fetchJsonWithRetry(`${API_BASE_URL}/api/admin/metrics?admin_id=${encodedAdminId}`),
      fetchJsonWithRetry(`${API_BASE_URL}/api/admin/metrics/sentiment-chart?admin_id=${encodedAdminId}&days=7`),
      fetchJsonWithRetry(`${API_BASE_URL}/api/admin/users?admin_id=${encodedAdminId}`),
    ]);

    return {
      metricsData,
      chartDataResponse,
      usersData,
    };
  } catch (error) {
    console.error('Load admin dashboard failed:', error);
    throw new Error('Lỗi server khi tải dữ liệu dashboard.', { cause: error });
  }
}

export async function exportAdminDashboardReport({ stats, chartData, recentUsers, formatNumber }) {
  const exportedAt = new Date().toLocaleString('vi-VN');
  const html = buildCompactAdminReportHtml({
    exportedAt,
    stats,
    chartData,
    recentUsers,
    formatNumber,
  });

  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-100000px';
  host.style.top = '0';
  host.style.width = '1120px';
  host.innerHTML = html;
  document.body.appendChild(host);

  try {
    await document.fonts?.ready;
    const html2pdf = (await import('html2pdf.js')).default;
    const filename = `bao-cao-quan-tri-almotion-${new Date().toISOString().slice(0, 10)}.pdf`;

    await html2pdf()
      .set({
        margin: [5, 5, 5, 5],
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'landscape',
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      })
      .from(host.firstElementChild)
      .save();
  } finally {
    host.remove();
  }
}
function buildSentimentChartSvg(chartData, formatNumber) {
  const rows = Array.isArray(chartData) ? chartData.slice(-7) : [];
  if (!rows.length) {
    return '<div class="empty-chart">Chưa có dữ liệu phản hồi trong 7 ngày gần đây.</div>';
  }

  const width = 650;
  const height = 190;
  const top = 18;
  const bottom = 34;
  const left = 42;
  const right = 18;
  const chartHeight = height - top - bottom;
  const chartWidth = width - left - right;
  const maxValue = Math.max(
    1,
    ...rows.flatMap((item) => [Number(item.positive || 0), Number(item.negative || 0)]),
  );
  const groupWidth = chartWidth / rows.length;
  const barWidth = Math.min(22, groupWidth * 0.28);

  const gridLines = [0, 0.5, 1]
    .map((ratio) => {
      const y = top + chartHeight * (1 - ratio);
      return `
        <line x1="${left}" y1="${y}" x2="${width - right}" y2="${y}" stroke="#e2e8f0" stroke-width="1" />
        <text x="${left - 8}" y="${y + 4}" text-anchor="end" fill="#64748b" font-size="10">${formatNumber(Math.round(maxValue * ratio))}</text>
      `;
    })
    .join('');

  const bars = rows
    .map((item, index) => {
      const center = left + groupWidth * index + groupWidth / 2;
      const positive = Number(item.positive || 0);
      const negative = Number(item.negative || 0);
      const positiveHeight = (positive / maxValue) * chartHeight;
      const negativeHeight = (negative / maxValue) * chartHeight;
      const label = escapeHtml(String(item.date || ''));

      return `
        <rect x="${center - barWidth - 2}" y="${top + chartHeight - positiveHeight}" width="${barWidth}" height="${positiveHeight}" rx="4" fill="#10b981" />
        <rect x="${center + 2}" y="${top + chartHeight - negativeHeight}" width="${barWidth}" height="${negativeHeight}" rx="4" fill="#f43f5e" />
        <text x="${center}" y="${height - 11}" text-anchor="middle" fill="#475569" font-size="10">${label}</text>
      `;
    })
    .join('');

  return `
    <svg class="sentiment-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Biểu đồ phản hồi 7 ngày">
      ${gridLines}
      ${bars}
    </svg>
  `;
}
function buildCompactAdminReportHtml({ exportedAt, stats, chartData, recentUsers, formatNumber }) {
  const chart = buildSentimentChartSvg(chartData, formatNumber);
  const userRows = (Array.isArray(recentUsers) ? recentUsers : [])
    .slice(0, 6)
    .map(
      (user, index) => `
        <tr>
          <td class="index-cell">${index + 1}</td>
          <td><strong>${escapeHtml(user.full_name || user.email || 'Người dùng')}</strong></td>
          <td>${escapeHtml(user.email || '-')}</td>
          <td><span class="role-pill">${escapeHtml(user.role === 'admin' ? 'Quản trị viên' : 'Người dùng')}</span></td>
        </tr>
      `,
    )
    .join('');

  return `
    <article class="admin-report">
      <style>
        .admin-report {
          width: 1120px;
          min-height: 720px;
          padding: 38px 42px 28px;
          background: #ffffff;
          color: #0f172a;
          font-family: Inter, Arial, sans-serif;
          box-sizing: border-box;
        }
        .admin-report * { box-sizing: border-box; }
        .report-header { display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 2px solid #4f46e5; padding-bottom: 16px; }
        .brand { display: flex; align-items: center; gap: 12px; }
        .brand-mark { display: grid; width: 44px; height: 44px; place-items: center; border-radius: 13px; background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; font-size: 23px; font-weight: 900; }
        .brand-name { margin: 0; color: #111827; font-size: 22px; font-weight: 800; }
        .brand-subtitle { margin: 3px 0 0; color: #64748b; font-size: 11px; }
        .report-meta { text-align: right; }
        .report-meta h1 { margin: 0 0 5px; color: #312e81; font-size: 22px; }
        .report-meta p { margin: 0; color: #64748b; font-size: 11px; }
        .metric-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 18px; }
        .metric { border: 1px solid #e2e8f0; border-radius: 13px; padding: 13px 15px; background: #f8fafc; }
        .metric-label { color: #64748b; font-size: 10px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; }
        .metric-value { margin-top: 6px; color: #0f172a; font-size: 25px; font-weight: 900; }
        .metric:nth-child(1) { border-top: 4px solid #4f46e5; }
        .metric:nth-child(2) { border-top: 4px solid #0ea5e9; }
        .metric:nth-child(3) { border-top: 4px solid #f59e0b; }
        .metric:nth-child(4) { border-top: 4px solid #10b981; }
        .content-grid { display: grid; grid-template-columns: 1.75fr 1fr; gap: 14px; margin-top: 15px; }
        .panel { border: 1px solid #e2e8f0; border-radius: 14px; padding: 15px 17px; background: #ffffff; }
        .panel h2 { margin: 0; color: #1e293b; font-size: 14px; }
        .panel-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
        .legend { display: flex; gap: 12px; color: #64748b; font-size: 10px; }
        .legend span::before { display: inline-block; width: 8px; height: 8px; margin-right: 5px; border-radius: 2px; content: ''; }
        .legend .positive::before { background: #10b981; }
        .legend .negative::before { background: #f43f5e; }
        .sentiment-chart { display: block; width: 100%; height: 190px; }
        .empty-chart { display: grid; height: 190px; place-items: center; color: #94a3b8; font-size: 12px; }
        .summary-list { display: grid; gap: 10px; margin-top: 14px; }
        .summary-item { display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 9px; color: #64748b; font-size: 11px; }
        .summary-item strong { color: #0f172a; font-size: 13px; }
        .positive-text { color: #059669 !important; }
        .negative-text { color: #e11d48 !important; }
        .users-panel { margin-top: 14px; padding-top: 13px; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 10px; }
        th { padding: 7px 9px; background: #f1f5f9; color: #475569; text-align: left; text-transform: uppercase; letter-spacing: .04em; }
        td { overflow: hidden; padding: 7px 9px; border-bottom: 1px solid #eef2f7; color: #475569; text-overflow: ellipsis; white-space: nowrap; }
        th:nth-child(1), td:nth-child(1) { width: 5%; }
        th:nth-child(2), td:nth-child(2) { width: 30%; }
        th:nth-child(3), td:nth-child(3) { width: 43%; }
        th:nth-child(4), td:nth-child(4) { width: 22%; }
        .index-cell { color: #94a3b8; }
        .role-pill { display: inline-block; border-radius: 999px; background: #eef2ff; padding: 3px 8px; color: #4338ca; font-weight: 700; }
        .empty-row { padding: 18px; color: #94a3b8; text-align: center; }
        .report-footer { display: flex; justify-content: space-between; margin-top: 13px; border-top: 1px solid #e2e8f0; padding-top: 9px; color: #94a3b8; font-size: 9px; }
      </style>

      <header class="report-header">
        <div class="brand">
          <div class="brand-mark">✦</div>
          <div>
            <p class="brand-name">Almotion</p>
            <p class="brand-subtitle">Customer Intelligence Platform</p>
          </div>
        </div>
        <div class="report-meta">
          <h1>BÁO CÁO TỔNG QUAN HỆ THỐNG</h1>
          <p>Thời điểm xuất: ${escapeHtml(exportedAt)}</p>
        </div>
      </header>

      <section class="metric-grid">
        <div class="metric"><div class="metric-label">Phản hồi đã xử lý</div><div class="metric-value">${formatNumber(stats.apiCalls)}</div></div>
        <div class="metric"><div class="metric-label">Tổng người dùng</div><div class="metric-value">${formatNumber(stats.users)}</div></div>
        <div class="metric"><div class="metric-label">Phản hồi chờ xử lý</div><div class="metric-value">${formatNumber(stats.pendingFeedback)}</div></div>
        <div class="metric"><div class="metric-label">Tỷ lệ tích cực</div><div class="metric-value">${Number(stats.positiveRate || 0).toFixed(0)}%</div></div>
      </section>

      <section class="content-grid">
        <div class="panel">
          <div class="panel-heading">
            <h2>Phân bố cảm xúc trong 7 ngày gần đây</h2>
            <div class="legend"><span class="positive">Tích cực</span><span class="negative">Tiêu cực</span></div>
          </div>
          ${chart}
        </div>
        <div class="panel">
          <h2>Tóm tắt vận hành</h2>
          <div class="summary-list">
            <div class="summary-item"><span>Tổng phản hồi</span><strong>${formatNumber(stats.apiCalls)}</strong></div>
            <div class="summary-item"><span>Đang chờ kiểm tra</span><strong>${formatNumber(stats.pendingFeedback)}</strong></div>
            <div class="summary-item"><span>Tỷ lệ tích cực</span><strong class="positive-text">${Number(stats.positiveRate || 0).toFixed(1)}%</strong></div>
            <div class="summary-item"><span>Tỷ lệ cần lưu ý</span><strong class="negative-text">${Math.max(0, 100 - Number(stats.positiveRate || 0)).toFixed(1)}%</strong></div>
          </div>
        </div>
      </section>

      <section class="panel users-panel">
        <div class="panel-heading"><h2>Người dùng mới gần đây</h2><span class="brand-subtitle">Tối đa 6 tài khoản mới nhất</span></div>
        <table>
          <thead><tr><th>#</th><th>Tên hiển thị</th><th>Email</th><th>Vai trò</th></tr></thead>
          <tbody>${userRows || '<tr><td class="empty-row" colspan="4">Chưa có dữ liệu người dùng mới.</td></tr>'}</tbody>
        </table>
      </section>

      <footer class="report-footer"><span>Almotion · Báo cáo quản trị nội bộ</span><span>Dữ liệu được tổng hợp tại thời điểm xuất báo cáo</span></footer>
    </article>
  `;
}

