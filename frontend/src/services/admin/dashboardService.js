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

export function exportAdminDashboardReport({ stats, chartData, recentUsers, formatNumber }) {
  const exportedAt = new Date().toLocaleString('vi-VN');

  const chartRows = chartData.length
    ? chartData
        .map(
          (item) => `
            <tr>
              <td>${escapeHtml(item.date)}</td>
              <td class="positive">${formatNumber(item.positive)}</td>
              <td class="negative">${formatNumber(item.negative)}</td>
              <td>${formatNumber(Number(item.positive || 0) + Number(item.negative || 0))}</td>
            </tr>
          `,
        )
        .join('')
    : '<tr><td colspan="4">Chưa có dữ liệu phân hóa phản hồi.</td></tr>';

  const userRows = recentUsers.length
    ? recentUsers
        .map(
          (user, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${escapeHtml(user.full_name || user.email || 'Người dùng')}</td>
              <td>${escapeHtml(user.email || '-')}</td>
              <td>${escapeHtml(user.role === 'admin' ? 'Quản trị viên' : 'Người dùng')}</td>
            </tr>
          `,
        )
        .join('')
    : '<tr><td colspan="4">Chưa có dữ liệu người dùng gần đây.</td></tr>';

  const html = buildAdminReportHtml({
    exportedAt,
    stats,
    chartRows,
    userRows,
    formatNumber,
  });

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const reportUrl = URL.createObjectURL(blob);
  const reportWindow = window.open(reportUrl, '_blank', 'width=1100,height=800');

  if (!reportWindow) {
    URL.revokeObjectURL(reportUrl);
    throw new Error('Trình duyệt đang chặn cửa sổ xuất PDF. Vui lòng cho phép popup.');
  }

  const printReport = () => {
    try {
      reportWindow.focus();
      reportWindow.print();
    } finally {
      setTimeout(() => URL.revokeObjectURL(reportUrl), 3000);
    }
  };

  reportWindow.addEventListener('load', () => {
    setTimeout(printReport, 800);
  });
}

function buildAdminReportHtml({ exportedAt, stats, chartRows, userRows, formatNumber }) {
  return `
    <!doctype html>
    <html lang="vi">
      <head>
        <meta charset="UTF-8" />
        <title>Báo cáo nhanh Almotion</title>
        <style>
          * { box-sizing: border-box; }

          html,
          body {
            margin: 0;
            padding: 0;
            font-family: Inter, Arial, sans-serif;
            background: #020617;
            color: #e5e7eb;
          }

          .page { padding: 32px; }

          .header {
            display: flex;
            justify-content: space-between;
            gap: 24px;
            border-bottom: 1px solid #334155;
            padding-bottom: 20px;
            margin-bottom: 24px;
          }

          h1 {
            margin: 0 0 8px;
            font-size: 28px;
            color: #ffffff;
          }

          h2 {
            margin: 0 0 14px;
            font-size: 18px;
            color: #ffffff;
          }

          p {
            margin: 0;
            color: #94a3b8;
          }

          .badge {
            display: inline-flex;
            align-items: center;
            border: 1px solid #4f46e5;
            color: #c7d2fe;
            border-radius: 999px;
            padding: 8px 12px;
            font-size: 13px;
            font-weight: 700;
            white-space: nowrap;
          }

          .section {
            border: 1px solid #334155;
            background: #0f172a;
            border-radius: 18px;
            padding: 20px;
            margin-bottom: 22px;
            break-inside: avoid;
          }

          .cards {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 14px;
          }

          .card {
            border: 1px solid #334155;
            background: #111827;
            border-radius: 16px;
            padding: 18px;
            min-height: 112px;
          }

          .label {
            color: #94a3b8;
            font-size: 12px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: .08em;
          }

          .value {
            margin-top: 14px;
            font-size: 30px;
            font-weight: 900;
            color: #ffffff;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
          }

          th,
          td {
            text-align: left;
            padding: 12px;
            border-bottom: 1px solid #1f2937;
          }

          th {
            color: #94a3b8;
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: .08em;
          }

          .positive {
            color: #34d399;
            font-weight: 800;
          }

          .negative {
            color: #fb7185;
            font-weight: 800;
          }

          .footer {
            margin-top: 28px;
            color: #64748b;
            font-size: 12px;
            text-align: right;
          }

          @media print {
            body {
              background: #020617 !important;
              color: #e5e7eb !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .page { padding: 24px; }

            @page {
              size: A4 landscape;
              margin: 8mm;
            }
          }
        </style>
      </head>

      <body>
        <main class="page">
          <div class="header">
            <div>
              <h1>Báo cáo nhanh hệ thống Almotion</h1>
              <p>Tổng hợp nhanh các chỉ số quản trị, phản hồi và người dùng gần đây.</p>
            </div>

            <div>
              <span class="badge">Xuất lúc ${escapeHtml(exportedAt)}</span>
            </div>
          </div>

          <section class="section">
            <h2>Chỉ số hệ thống</h2>
            <div class="cards">
              <div class="card">
                <div class="label">Tổng phản hồi đã xử lý</div>
                <div class="value">${formatNumber(stats.apiCalls)}</div>
              </div>

              <div class="card">
                <div class="label">Tổng người dùng</div>
                <div class="value">${formatNumber(stats.users)}</div>
              </div>

              <div class="card">
                <div class="label">Phản hồi chờ xử lý</div>
                <div class="value">${formatNumber(stats.pendingFeedback)}</div>
              </div>

              <div class="card">
                <div class="label">Tỉ lệ tích cực</div>
                <div class="value">${Number(stats.positiveRate || 0).toFixed(0)}%</div>
              </div>
            </div>
          </section>

          <section class="section">
            <h2>Phân hóa phản hồi 7 ngày qua</h2>
            <table>
              <thead>
                <tr>
                  <th>Ngày</th>
                  <th>Tích cực</th>
                  <th>Tiêu cực</th>
                  <th>Tổng</th>
                </tr>
              </thead>
              <tbody>${chartRows}</tbody>
            </table>
          </section>

          <section class="section">
            <h2>Người dùng mới gần đây</h2>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Tên hiển thị</th>
                  <th>Email</th>
                  <th>Vai trò</th>
                </tr>
              </thead>
              <tbody>${userRows}</tbody>
            </table>
          </section>

          <div class="footer">Almotion Admin Dashboard</div>
        </main>
      </body>
    </html>
  `;
}
