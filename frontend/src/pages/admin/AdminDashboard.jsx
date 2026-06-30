import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Activity, MessageSquare, RefreshCcw, ShieldCheck, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../services/supabaseClient';

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

export default function AdminDashboard() {
  const { theme = fallbackTheme } = useOutletContext() || {};
  const [stats, setStats] = useState(emptyStats);
  const [weeklyData, setWeeklyData] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);

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
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const maxWeekly = useMemo(() => Math.max(1, ...weeklyData.map((item) => item.total)), [weeklyData]);

  return (
    <section className="space-y-6">
      <PageHeader
        theme={theme}
        title="Tổng quan hệ thống"
        description="Theo dõi các chỉ số quan trọng của toàn bộ hệ thống."
        onRefresh={loadData}
        loading={loading}
      />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard theme={theme} icon={Activity} label="Tổng phản hồi đã xử lý" value={formatNumber(stats.apiCalls)} />
        <StatCard theme={theme} icon={Users} label="Tổng người dùng" value={formatNumber(stats.users)} />
        <StatCard theme={theme} icon={MessageSquare} label="Phản hồi chờ xử lý" value={formatNumber(stats.pendingFeedback)} />
        <StatCard theme={theme} icon={ShieldCheck} label="Tỉ lệ tích cực" value={`${stats.positiveRate}%`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Panel
          theme={theme}
          title="Lưu lượng phản hồi 7 ngày qua"
          description="Số phản hồi được ghi nhận theo từng ngày."
        >
          <div className="flex h-64 items-end gap-3 border-b border-l border-dashed border-slate-500/60 px-6 pb-0">
            {weeklyData.map((item) => (
              <div key={item.key} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-t-lg bg-indigo-500 transition-all"
                  style={{ height: `${Math.max(8, (item.total / maxWeekly) * 210)}px` }}
                  title={`${item.label}: ${item.total}`}
                />
                <span className={`text-xs font-semibold ${theme.muted}`}>{item.label}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel theme={theme} title="Người dùng mới gần đây" description="6 tài khoản mới nhất trong bảng profiles.">
          <div className="space-y-3">
            {recentUsers.length ? (
              recentUsers.map((item) => (
                <div key={item.id} className={`rounded-xl border p-4 ${theme.cardSoft}`}>
                  <p className={`truncate font-bold ${theme.text}`}>{item.full_name || item.email || 'Chưa có tên'}</p>
                  <p className={`mt-1 truncate text-sm ${theme.muted}`}>{item.email || '-'}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge tone={String(item.role).toLowerCase() === 'admin' ? 'green' : 'blue'}>
                      {String(item.role).toLowerCase() === 'admin' ? 'Admin' : 'Người dùng'}
                    </Badge>
                    <Badge>{item.status || 'active'}</Badge>
                    <Badge>{item.tier || 'free'}</Badge>
                  </div>
                </div>
              ))
            ) : (
              <EmptyText theme={theme}>Chưa có người dùng nào.</EmptyText>
            )}
          </div>
        </Panel>
      </div>
    </section>
  );
}

function PageHeader({ theme, title, description, onRefresh, loading }) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className={`text-3xl font-black ${theme.text}`}>{title}</h1>
        <p className={`mt-2 text-sm ${theme.muted}`}>{description}</p>
      </div>
      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-500 disabled:opacity-60"
      >
        <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        Làm mới dữ liệu
      </button>
    </div>
  );
}

function StatCard({ theme, icon: Icon, label, value }) {
  return (
    <div className={`rounded-2xl border p-6 shadow-xl ${theme.card}`}>
      <div className="mb-7 flex items-center justify-between">
        <p className={`text-xs font-black uppercase tracking-wide ${theme.muted}`}>{label}</p>
        <Icon className="h-5 w-5 text-indigo-500" />
      </div>
      <p className={`text-4xl font-black ${theme.text}`}>{value}</p>
    </div>
  );
}

function Panel({ theme, title, description, children }) {
  return (
    <div className={`rounded-2xl border p-6 shadow-xl ${theme.card}`}>
      <h2 className={`font-black ${theme.text}`}>{title}</h2>
      {description && <p className={`mt-2 text-sm ${theme.muted}`}>{description}</p>}
      <div className="mt-6">{children}</div>
    </div>
  );
}

function Badge({ children, tone = 'slate' }) {
  const className = {
    slate: 'bg-slate-500/15 text-slate-300 ring-slate-500/30',
    green: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
    blue: 'bg-indigo-500/15 text-indigo-300 ring-indigo-500/30',
  }[tone];

  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${className}`}>{children}</span>;
}

function EmptyText({ theme, children }) {
  return (
    <p className={`rounded-xl border border-dashed p-6 text-center text-sm ${theme.muted}`}>
      {children}
    </p>
  );
}
