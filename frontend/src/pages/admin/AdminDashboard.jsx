import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Activity, CreditCard, Download, MessageSquare, RefreshCcw, TrendingUp, Users, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../services/supabaseClient';

import AdminActivityLog from './AdminActivityLog';
const emptyStats = {
  apiCalls: 0,
  users: 0,
  pendingFeedback: 0,
  positiveRate: 0,
};

const emptyTransactionStats = {
  revenue: 0,
  paidCount: 0,
  todayCount: 0,
};

const fallbackTheme = {
  card: 'border-slate-700 bg-slate-900/80 shadow-slate-950/30',
  cardSoft: 'border-slate-700 bg-slate-950/70',
  text: 'text-white',
  muted: 'text-slate-400',
  faint: 'text-slate-500',
  buttonGhost: 'border-slate-700 bg-slate-900 text-slate-200 hover:border-indigo-400 hover:text-white',
};

function formatNumber(value) {
  return Number(value || 0).toLocaleString('vi-VN');
}

function formatCurrency(value) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value || 0));
}

function isToday(value) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();
  return (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
}

const AdminDashboard = () => {
  const { theme = fallbackTheme } = useOutletContext() || {};

  const [stats, setStats] = useState(emptyStats);
  const [weeklyData, setWeeklyData] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [transactionStats, setTransactionStats] = useState(emptyTransactionStats);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
  setIsLoading(true);

  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData?.user) {
      throw new Error('Không tìm thấy thông tin đăng nhập.');
    }

    const adminId = authData.user.id;

    const [metricsRes, chartRes, usersRes, transactionsRes] = await Promise.all([
      fetch(`http://localhost:8000/api/admin/metrics?admin_id=${adminId}`),
      fetch(`http://localhost:8000/api/admin/metrics/sentiment-chart?admin_id=${adminId}&days=7`),
      fetch(`http://localhost:8000/api/admin/users?admin_id=${adminId}`),
      fetch(`http://localhost:8000/api/admin/transactions?admin_id=${adminId}`),
    ]);

    if (!metricsRes.ok || !chartRes.ok || !usersRes.ok || !transactionsRes.ok) {
      throw new Error('Lỗi server khi tải dữ liệu dashboard.');
    }

    const metricsData = await metricsRes.json();
    const chartDataResponse = await chartRes.json();
    const usersData = await usersRes.json();
    const transactionsData = await transactionsRes.json();

    setStats({
      apiCalls: metricsData.total_api_calls || 0,
      users: metricsData.total_users || 0,
      pendingFeedback: metricsData.pending_feedbacks || 0,
      positiveRate: metricsData.global_positive_ratio || 0,
    });

    const formattedChartData = (chartDataResponse.chart_data || []).map((item) => ({
      key: item.date,
      label: item.date,
      positive: Number(item.positive || item.positive_count || 0),
      negative: Number(item.negative || item.negative_count || 0),
      total: Number(item.total || item.api_calls || 0),
    }));

    setWeeklyData(formattedChartData);

    const recent = (usersData || [])
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 6);

    setRecentUsers(recent);

    const paidTransactions = (transactionsData || []).filter((item) => item.status === 'paid');
    setTransactionStats({
      revenue: paidTransactions.reduce((sum, item) => sum + Number(item.amount || 0), 0),
      paidCount: paidTransactions.length,
      todayCount: (transactionsData || []).filter((item) => isToday(item.created_at)).length,
    });
  } catch (error) {
    console.error('Load admin dashboard failed:', error);
    toast.error('Không thể tải dữ liệu thống kê từ máy chủ Backend.', {
      id: 'admin-dashboard-load-error',
    });
  } finally {
    setIsLoading(false);
  }
}, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const chartData = useMemo(
    () =>
      weeklyData.map((item) => ({
        date: item.key,
        positive: item.positive || 0,
        negative: item.negative || 0,
      })),
    [weeklyData]
  );

  const cardConfig = [
    {
      title: 'Tổng phản hồi đã xử lý',
      value: stats.apiCalls,
      icon: <Activity className="h-5 w-5 text-indigo-400" />,
      formatter: formatNumber,
    },
    {
      title: 'Tổng người dùng',
      value: stats.users,
      icon: <Users className="h-5 w-5 text-indigo-400" />,
      formatter: formatNumber,
    },
    {
      title: 'Phản hồi chờ xử lý',
      value: stats.pendingFeedback,
      icon: <MessageSquare className="h-5 w-5 text-indigo-400" />,
      formatter: formatNumber,
    },
    {
      title: 'Tỉ lệ tích cực',
      value: stats.positiveRate,
      icon: <TrendingUp className="h-5 w-5 text-indigo-400" />,
      formatter: (value) => `${Number(value || 0).toFixed(0)}%`,
    },
  ];

  const transactionCardConfig = [
    {
      title: 'Tổng doanh thu VIP',
      value: transactionStats.revenue,
      icon: <Wallet className="h-5 w-5 text-emerald-400" />,
      formatter: formatCurrency,
    },
    {
      title: 'Giao dịch thành công',
      value: transactionStats.paidCount,
      icon: <CreditCard className="h-5 w-5 text-indigo-400" />,
      formatter: formatNumber,
    },
    {
      title: 'Giao dịch hôm nay',
      value: transactionStats.todayCount,
      icon: <TrendingUp className="h-5 w-5 text-amber-400" />,
      formatter: formatNumber,
    },
  ];
const handleExportPdf = useCallback(() => {
  try {
    const exportedAt = new Date().toLocaleString('vi-VN');

    const escapeHtml = (value) =>
      String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');

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
            `
          )
          .join('')
      : `<tr><td colspan="4">Chưa có dữ liệu phân hóa phản hồi.</td></tr>`;

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
            `
          )
          .join('')
      : `<tr><td colspan="4">Chưa có dữ liệu người dùng gần đây.</td></tr>`;

    const html = `
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

            .cards-3 {
              grid-template-columns: repeat(3, 1fr);
            }

            .card {
              border: 1px solid #334155;
              background: #111827;
              border-radius: 16px;
              padding: 18px;
              min-height: 112px;
            }

            .revenue-card {
              border-color: rgba(16, 185, 129, 0.45);
              background: rgba(6, 78, 59, 0.22);
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

            .revenue { color: #34d399; }

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
                <p>Tổng hợp nhanh các chỉ số quản trị, phản hồi, giao dịch VIP và người dùng gần đây.</p>
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
              <h2>Thống kê giao dịch VIP</h2>
              <div class="cards cards-3">
                <div class="card revenue-card">
                  <div class="label">Tổng doanh thu VIP</div>
                  <div class="value revenue">${formatCurrency(transactionStats.revenue)}</div>
                </div>

                <div class="card">
                  <div class="label">Giao dịch thành công</div>
                  <div class="value">${formatNumber(transactionStats.paidCount)}</div>
                </div>

                <div class="card">
                  <div class="label">Giao dịch hôm nay</div>
                  <div class="value">${formatNumber(transactionStats.todayCount)}</div>
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

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const reportUrl = URL.createObjectURL(blob);
    const reportWindow = window.open(reportUrl, '_blank', 'width=1100,height=800');

    if (!reportWindow) {
      URL.revokeObjectURL(reportUrl);
      toast.error('Trình duyệt đang chặn cửa sổ xuất PDF. Vui lòng cho phép popup.');
      return;
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

    toast.success('Đã mở bản báo cáo. Chọn Save as PDF để lưu file.');
  } catch (error) {
    console.error('Export admin report failed:', error);
    toast.error(`Không thể xuất báo cáo: ${error.message}`);
  }
}, [chartData, recentUsers, stats, transactionStats]);

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500 font-sans">
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-wide text-white">Tổng quan hệ thống</h1>
          <p className="text-sm text-slate-400">
            Theo dõi các chỉ số quan trọng của toàn bộ hệ thống.
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 md:mt-0">
          <button
            type="button"
            onClick={handleExportPdf}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-black text-slate-200 shadow-lg transition hover:border-indigo-400 hover:text-white"
          >
            <Download className="h-4 w-4" />
            Xuất Báo cáo PDF
          </button>

          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-500 disabled:opacity-60"
          >
            <RefreshCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Làm mới dữ liệu
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array(4)
            .fill(0)
            .map((_, index) => (
              <div
                key={index}
                className="flex flex-col justify-between rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-md"
              >
                <div className="flex items-center justify-between">
                  <div className="w-24 h-4 bg-slate-700 rounded animate-pulse" />
                  <div className="w-5 h-5 bg-slate-700 rounded animate-pulse" />
                </div>
                <div className="mt-4">
                  <div className="w-32 h-10 bg-slate-700 rounded animate-pulse" />
                </div>
              </div>
            ))
        ) : (
          cardConfig.map((card, index) => (
            <div
              key={index}
              className="flex flex-col justify-between rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-md transition-colors hover:bg-slate-800"
            >
              <div className="flex items-start justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {card.title}
                </h3>
                {card.icon}
              </div>
              <div className="mt-4 flex items-end justify-between">
                <div className="text-4xl font-bold text-white">{card.formatter(card.value)}</div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {isLoading ? (
          Array(3)
            .fill(0)
            .map((_, index) => (
              <div
                key={index}
                className="flex flex-col justify-between rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-md"
              >
                <div className="flex items-center justify-between">
                  <div className="w-28 h-4 bg-slate-700 rounded animate-pulse" />
                  <div className="w-5 h-5 bg-slate-700 rounded animate-pulse" />
                </div>
                <div className="mt-4">
                  <div className="w-36 h-9 bg-slate-700 rounded animate-pulse" />
                </div>
              </div>
            ))
        ) : (
          transactionCardConfig.map((card, index) => (
            <div
              key={index}
              className="flex flex-col justify-between rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 backdrop-blur-md transition-colors hover:bg-emerald-500/10"
            >
              <div className="flex items-start justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {card.title}
                </h3>
                {card.icon}
              </div>
              <div className="mt-4 flex items-end justify-between">
                <div className="text-3xl font-bold text-white">{card.formatter(card.value)}</div>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-md">
        <h3 className="mb-2 text-sm font-medium text-slate-200">
          Phân hóa phản hồi 7 ngày qua
        </h3>
        <p className="mb-6 text-xs text-slate-500">
          Đường xanh là phản hồi tích cực, đường đỏ là phản hồi tiêu cực.
        </p>

        <div className="h-64 w-full">
          {isLoading ? (
            <div className="w-full h-full relative overflow-hidden flex items-end pb-8 px-8 gap-4 justify-between">
              <div className="absolute inset-0 flex flex-col justify-between py-8">
                {Array(5)
                  .fill(0)
                  .map((_, index) => (
                    <div key={index} className="w-full h-px bg-slate-700/50" />
                  ))}
              </div>
              {[40, 70, 45, 90, 65, 30, 80].map((height, index) => (
                <div
                  key={index}
                  className="w-full bg-slate-700/50 rounded-t-sm animate-pulse z-10"
                  style={{ height: `${height}%`, animationDelay: `${index * 0.1}s` }}
                />
              ))}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid stroke="#334155" strokeDasharray="4 4" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="#94a3b8"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return Number.isNaN(date.getTime())
                      ? value
                      : `${date.getDate()}/${date.getMonth() + 1}`;
                  }}
                />
                <YAxis
                  stroke="#94a3b8"
                  tick={{ fontSize: 12 }}
                  allowDecimals={false}
                  tickFormatter={(value) => (value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value)}
                />
                <Tooltip
                  contentStyle={{
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 12,
                    color: '#e2e8f0',
                  }}
                  labelStyle={{ color: '#f8fafc' }}
                />
                <Line
                  type="monotone"
                  dataKey="positive"
                  name="Tích cực"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#10b981' }}
                  activeDot={{ r: 6, fill: '#10b981', stroke: '#0f172a', strokeWidth: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="negative"
                  name="Tiêu cực"
                  stroke="#f43f5e"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#f43f5e' }}
                  activeDot={{ r: 6, fill: '#f43f5e', stroke: '#0f172a', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
          <AdminActivityLog />
      <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-md">
        <h3 className="mb-2 text-sm font-medium text-slate-200">Người dùng mới gần đây</h3>
        <p className="mb-6 text-xs text-slate-500">
          6 tài khoản mới nhất trong bảng profiles.
        </p>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            Array(6)
              .fill(0)
              .map((_, index) => (
                <div key={index} className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                  <div className="w-32 h-4 bg-slate-700 rounded animate-pulse" />
                  <div className="mt-2 w-24 h-3 bg-slate-700 rounded animate-pulse" />
                </div>
              ))
          ) : recentUsers.length ? (
            recentUsers.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                <p className="truncate font-bold text-white">
                  {item.full_name || item.email || 'Chưa có tên'}
                </p>
                <p className="mt-1 truncate text-sm text-slate-400">{item.email || '-'}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${
                      String(item.role).toLowerCase() === 'admin'
                        ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30'
                        : 'bg-indigo-500/15 text-indigo-300 ring-indigo-500/30'
                    }`}
                  >
                    {String(item.role).toLowerCase() === 'admin' ? 'Admin' : 'Người dùng'}
                  </span>
                  <span className="rounded-full bg-slate-500/15 px-2.5 py-1 text-xs font-bold text-slate-300 ring-1 ring-slate-500/30">
                    {item.status || 'active'}
                  </span>
                  <span className="rounded-full bg-slate-500/15 px-2.5 py-1 text-xs font-bold text-slate-300 ring-1 ring-slate-500/30">
                    {item.tier || 'free'}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="col-span-full rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">
              Chưa có người dùng nào.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;