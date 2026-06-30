import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Activity, MessageSquare, RefreshCcw, TrendingUp, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../services/supabaseClient';

// ====== Chức năng dữ liệu giữ nguyên từ file Dashboard (Supabase) ======

const emptyStats = {
  apiCalls: 0,
  users: 0,
  pendingFeedback: 0,
  positiveRate: 0,
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

function getPositiveRate(reviews) {
  if (!reviews.length) return 0;
  const positive = reviews.filter((item) => Number(item.ai_label) === 1).length;
  return Math.round((positive / reviews.length) * 100);
}

const AdminDashboard = () => {
  const { theme = fallbackTheme } = useOutletContext() || {};

  const [stats, setStats] = useState(emptyStats);
  const [weeklyData, setWeeklyData] = useState([]); // { key, label, total }
  const [recentUsers, setRecentUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);

    try {
      const since = new Date();
      since.setDate(since.getDate() - 6);
      since.setHours(0, 0, 0, 0);

      const [usersResult, reviewsCountResult, feedbackCountResult, pendingFeedbackResult, recentReviewsResult] =
        await Promise.all([
          supabase
            .from('profiles')
            .select('id,email,full_name,role,status,tier,created_at')
            .order('created_at', { ascending: false }),
          supabase.from('scraped_reviews').select('id', { count: 'exact', head: true }),
          supabase.from('feedback_data').select('id', { count: 'exact', head: true }),
          supabase
            .from('feedback_data')
            .select('id', { count: 'exact', head: true })
            .or('status.is.null,status.eq.pending'),
          supabase.from('scraped_reviews').select('id,ai_label,created_at').gte('created_at', since.toISOString()),
        ]);

      if (usersResult.error) throw usersResult.error;
      if (reviewsCountResult.error) throw reviewsCountResult.error;
      if (feedbackCountResult.error) throw feedbackCountResult.error;
      if (pendingFeedbackResult.error) throw pendingFeedbackResult.error;
      if (recentReviewsResult.error) throw recentReviewsResult.error;

      const reviews = recentReviewsResult.data || [];
      const users = usersResult.data || [];

      setRecentUsers(users.slice(0, 6));
      setStats({
        apiCalls: reviewsCountResult.count || 0,
        users: users.length,
        pendingFeedback: pendingFeedbackResult.count || 0,
        positiveRate: getPositiveRate(reviews),
      });

      const days = Array.from({ length: 7 }, (_, index) => {
        const date = new Date(since);
        date.setDate(since.getDate() + index);
        return {
          key: date.toISOString().slice(0, 10),
          label: date.toLocaleDateString('vi-VN', { weekday: 'short' }),
          total: 0,
        };
      });

      reviews.forEach((item) => {
        const key = new Date(item.created_at).toISOString().slice(0, 10);
        const found = days.find((day) => day.key === key);
        if (found) found.total += 1;
      });

      setWeeklyData(days);
    } catch (error) {
      console.error('Load admin dashboard failed:', error);
      toast.error('Không thể tải dữ liệu thống kê. Vui lòng kiểm tra quyền đọc dữ liệu.', {
        id: 'admin-dashboard-load-error',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Chuyển weeklyData (key/label/total) sang định dạng chartData mà AreaChart của file 1 cần (date/api_calls)
  const chartData = useMemo(
    () => weeklyData.map((item) => ({ date: item.key, api_calls: item.total })),
    [weeklyData]
  );

  // ====== Cấu hình thẻ chỉ số - giữ nguyên 100% từ file 1 (cardConfig) ======
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

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500 font-sans">
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-wide text-white">Tổng quan hệ thống</h1>
          <p className="text-sm text-slate-400">Theo dõi các chỉ số quan trọng của toàn bộ hệ thống.</p>
        </div>
        {/* Nút làm mới - giữ chức năng refresh từ file Dashboard (Supabase) */}
        <button
          type="button"
          onClick={loadData}
          disabled={isLoading}
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-500 disabled:opacity-60 md:mt-0"
        >
          <RefreshCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Làm mới dữ liệu
        </button>
      </div>

      {/* ====== Thẻ chỉ số - giao diện giữ nguyên 100% từ file 1 ====== */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array(4).fill(0).map((_, index) => (
            <div key={index} className="flex flex-col justify-between rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-md">
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
            <div key={index} className="flex flex-col justify-between rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-md transition-colors hover:bg-slate-800">
              <div className="flex items-start justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{card.title}</h3>
                {card.icon}
              </div>
              <div className="mt-4 flex items-end justify-between">
                <div className="text-4xl font-bold text-white">{card.formatter(card.value)}</div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ====== Biểu đồ AreaChart - giao diện giữ nguyên 100% từ file 1 ====== */}
      <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-md">
        <h3 className="mb-2 text-sm font-medium text-slate-200">Lưu lượng phản hồi 7 ngày qua</h3>
        <p className="mb-6 text-xs text-slate-500">Số phản hồi được ghi nhận theo từng ngày.</p>

        <div className="h-64 w-full">
          {isLoading ? (
            <div className="w-full h-full relative overflow-hidden flex items-end pb-8 px-8 gap-4 justify-between">
              <div className="absolute inset-0 flex flex-col justify-between py-8">
                {Array(5).fill(0).map((_, index) => (
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
              <AreaChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorApiCalls" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#334155" strokeDasharray="4 4" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="#94a3b8"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return Number.isNaN(date.getTime()) ? value : `${date.getDate()}/${date.getMonth() + 1}`;
                  }}
                />
                <YAxis
                  stroke="#94a3b8"
                  tick={{ fontSize: 12 }}
                  allowDecimals={false}
                  tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
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
                <Area
                  type="monotone"
                  dataKey="api_calls"
                  name="Phản hồi"
                  stroke="#818cf8"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorApiCalls)"
                  activeDot={{ r: 6, fill: '#818cf8', stroke: '#0f172a', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ====== Danh sách người dùng mới - chức năng giữ từ file Dashboard (Supabase), style theo file 1 ====== */}
      <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-md">
        <h3 className="mb-2 text-sm font-medium text-slate-200">Người dùng mới gần đây</h3>
        <p className="mb-6 text-xs text-slate-500">6 tài khoản mới nhất trong bảng profiles.</p>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            Array(6).fill(0).map((_, index) => (
              <div key={index} className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                <div className="w-32 h-4 bg-slate-700 rounded animate-pulse" />
                <div className="mt-2 w-24 h-3 bg-slate-700 rounded animate-pulse" />
              </div>
            ))
          ) : recentUsers.length ? (
            recentUsers.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                <p className="truncate font-bold text-white">{item.full_name || item.email || 'Chưa có tên'}</p>
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