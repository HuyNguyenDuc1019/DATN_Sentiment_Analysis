import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Frown,
  Globe,
  Hash,
  MessageSquare,
  Network,
  Smile,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { fetchDashboardAlerts, fetchKeywordAnalytics } from '../services/api';
import UpgradeModal from '../components/common/UpgradeModal';
import { confidenceRatio, fetchUserReviews } from '../services/reviews';
import QuickConclusionCard from '../components/dashboard/QuickConclusionCard';

export default function DashboardContent() {
  const { user, userProfile, refreshUserProfile } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [keywordAnalytics, setKeywordAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const isVip = userProfile?.tier === 'vip';

  const load = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const reviewRows = await fetchUserReviews(user.id);
      setReviews(reviewRows);

      const [alertRows, keywordPayload] = await Promise.allSettled([
        fetchAlertsForSources(user.id, reviewRows),
        fetchKeywordAnalytics({ userId: user.id, sourceUrl: 'all' }),
      ]);

      setAlerts(alertRows.status === 'fulfilled' ? alertRows.value : []);
      setKeywordAnalytics(keywordPayload.status === 'fulfilled' ? keywordPayload.value : null);
    } catch (error) {
      toast.error(error.message || 'Không tải được dữ liệu tổng quan.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const positive = reviews.filter((item) => Number(item.ai_label) === 1).length;
    const negative = reviews.length - positive;
    const sources = new Set(reviews.map((item) => item.source_url).filter(Boolean)).size;
    const now = Date.now();
    const week = 7 * 24 * 60 * 60 * 1000;
    const current = reviews.filter((item) => isInRange(item.created_at, now - week, now)).length;
    const previous = reviews.filter((item) => isInRange(item.created_at, now - week * 2, now - week)).length;
    const growth = previous > 0 ? ((current - previous) / previous) * 100 : current > 0 ? 100 : 0;

    return {
      total: reviews.length,
      positive,
      negative,
      sources,
      positiveRate: reviews.length ? positive / reviews.length : 0,
      growth,
    };
  }, [reviews]);

  const trendData = useMemo(() => buildTrendData(reviews), [reviews]);
  const leaderboard = useMemo(() => {
    const value = keywordAnalytics?.leaderboard || keywordAnalytics?.data?.leaderboard;
    return buildBusinessLeaderboard(value, reviews);
  }, [keywordAnalytics, reviews]);

  const visibleAlerts = useMemo(() => {
    const source = uniqueAlerts([...alerts, ...reviews]);

    return source
      .filter(isCriticalAlert)
      .sort((a, b) => {
        const actionScore = Number(Boolean(b.is_action_required)) - Number(Boolean(a.is_action_required));
        if (actionScore !== 0) return actionScore;
        const dateScore = new Date(b.review_date || b.created_at || 0) - new Date(a.review_date || a.created_at || 0);
        if (dateScore !== 0) return dateScore;
        return confidenceRatio(b.confidence) - confidenceRatio(a.confidence);
      })
      .slice(0, 4)
      .map((item) => normalizeAlert(item));
  }, [alerts, reviews]);

  if (loading && !reviews.length) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500 font-sans">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-wide text-white">Tổng quan hoạt động</h1>
        <p className="text-sm text-slate-400">
          Theo dõi phản hồi khách hàng, điểm nổi bật và vấn đề cần xử lý.
        </p>
      </div>

      {!loading && stats.total === 0 ? (
        <EmptyDashboardState />
      ) : (
        <>

      <AlertsSection alerts={visibleAlerts} loading={loading} isVip={isVip} onUpgrade={() => setIsUpgradeModalOpen(true)} />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <StatCard
          title="Tổng phản hồi"
          value={stats.total.toLocaleString('vi-VN')}
          icon={<MessageSquare className="h-5 w-5 text-indigo-400" />}
          trend={`${stats.growth >= 0 ? '+' : ''}${stats.growth.toFixed(1)}%`}
          trendUp={stats.growth >= 0}
        />
        <PositiveRateCard rate={stats.positiveRate} />
        <StatCard
          title="Nguồn đang theo dõi"
          value={stats.sources.toLocaleString('vi-VN')}
          icon={<Network className="h-5 w-5 text-indigo-400" />}
          subIcons
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <TrendCard data={trendData} />
        <QuickConclusionCard
          totalFeedback={stats.total}
          positiveCount={stats.positive}
          negativeCount={stats.negative}
          alertCount={visibleAlerts.length}
        />
      </div>

      <LeaderboardCard leaderboard={leaderboard} />
      <RecentReviews reviews={reviews} />
        </>
      )}

      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        onUpgraded={refreshUserProfile}
      />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="p-8 space-y-6 animate-pulse font-sans">
      <div className="space-y-3">
        <div className="h-8 w-72 rounded-xl bg-slate-800" />
        <div className="h-4 w-96 max-w-full rounded-lg bg-slate-800/80" />
      </div>
      <div className="h-40 rounded-2xl border border-slate-700 bg-slate-800/40" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {[0, 1, 2].map((item) => <div key={item} className="h-36 rounded-2xl border border-slate-700 bg-slate-800/40" />)}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="h-80 rounded-2xl border border-slate-700 bg-slate-800/40 lg:col-span-2" />
        <div className="h-80 rounded-2xl border border-slate-700 bg-slate-800/40" />
      </div>
    </div>
  );
}

function EmptyDashboardState() {
  return (
    <section className="flex min-h-[520px] items-center justify-center rounded-3xl border border-slate-700 bg-slate-800/40 p-8 text-center shadow-lg shadow-slate-950/10">
      <div className="mx-auto max-w-xl">
        <div className="mx-auto mb-8 flex h-40 w-40 items-center justify-center rounded-full border border-indigo-400/20 bg-indigo-500/10">
          <div className="relative h-24 w-24">
            <div className="absolute bottom-0 left-2 h-12 w-4 rounded-t-lg bg-indigo-400/70" />
            <div className="absolute bottom-0 left-9 h-20 w-4 rounded-t-lg bg-emerald-400/70" />
            <div className="absolute bottom-0 right-5 h-16 w-4 rounded-t-lg bg-rose-400/70" />
            <div className="absolute inset-x-0 bottom-0 h-1 rounded-full bg-slate-600" />
          </div>
        </div>
        <h2 className="text-2xl font-semibold text-white">Chưa có dữ liệu để phân tích</h2>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Hãy dán link quán ăn hoặc tải tệp CSV lên để bắt đầu. Khi có phản hồi mới, hệ thống sẽ tự cập nhật biểu đồ và các chỉ số tại đây.
        </p>
      </div>
    </section>
  );
}

function AlertsSection({ alerts, loading, isVip, onUpgrade }) {
  const isSingleAlert = alerts.length === 1;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-rose-500/25 bg-rose-500/10 p-5 shadow-lg shadow-rose-950/10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/20 text-rose-300">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Cảnh báo cần xử lý</h2>
            <p className="text-sm text-rose-100/70">
              Các phản hồi chưa tốt hoặc có dấu hiệu cần quản lý xem lại.
            </p>
          </div>
        </div>
        <span className="rounded-full border border-rose-400/30 px-3 py-1 text-xs font-semibold text-rose-200">
          {loading ? 'Đang cập nhật...' : `${alerts.length} mục nổi bật`}
        </span>
      </div>

      <div className={!isVip ? 'pointer-events-none blur-sm select-none' : ''}>
      {alerts.length ? (
        <div className={`grid grid-cols-1 gap-3 ${isSingleAlert ? '' : 'lg:grid-cols-2'}`}>
          {alerts.map((alert, index) => (
            <div key={alert.id || index} className="rounded-xl border border-rose-400/20 bg-slate-950/35 p-4">
              <p className={`${isSingleAlert ? 'line-clamp-3' : 'line-clamp-2'} text-sm leading-relaxed text-slate-100`}>
                {alert.content || alert.comment || alert.text}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {(alert.keywords || []).slice(0, 4).map((keyword) => (
                  <span key={keyword} className="rounded-full bg-rose-500/15 px-2.5 py-1 text-[11px] font-medium text-rose-200">
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-700/60 bg-slate-950/30 p-4 text-sm text-slate-400">
          Chưa có phản hồi cần cảnh báo.
        </div>
      )}
      </div>

      {!isVip && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/45 backdrop-blur-sm">
          <button
            type="button"
            onClick={onUpgrade}
            className="rounded-xl border border-amber-400/30 bg-slate-950/80 px-5 py-3 text-sm font-semibold text-amber-200 shadow-lg shadow-rose-950/30 transition-colors hover:bg-slate-900"
          >
            👑 Nâng cấp VIP để xem cảnh báo khủng hoảng
          </button>
        </div>
      )}
    </section>
  );
}

function PositiveRateCard({ rate }) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-md transition-colors hover:bg-slate-800">
      <div className="flex items-start justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tỷ lệ khách hài lòng</h3>
        <Smile className="h-5 w-5 text-emerald-400" />
      </div>
      <div className="mt-4">
        <div className="mb-3 text-4xl font-bold text-white">{(rate * 100).toFixed(1)}%</div>
        <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-rose-500">
          <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-700" style={{ width: `${rate * 100}%` }} />
        </div>
      </div>
    </div>
  );
}

function TrendCard({ data }) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-md lg:col-span-2">
      <h3 className="mb-2 text-sm font-medium text-slate-200">Xu hướng phản hồi 7 ngày</h3>
      <p className="mb-6 text-xs text-slate-500">
        Đường xanh là phản hồi hài lòng, đường đỏ là phản hồi chưa hài lòng.
      </p>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 20, left: -20, bottom: 5 }}>
            <CartesianGrid stroke="#334155" strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 12 }} />
            <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: 12,
                color: '#e2e8f0',
              }}
              labelStyle={{ color: '#f8fafc' }}
            />
            <Legend wrapperStyle={{ color: '#cbd5e1', fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="positive"
              name="Hài lòng"
              stroke="#10b981"
              strokeWidth={3}
              dot={{ r: 4, fill: '#10b981' }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="negative"
              name="Chưa hài lòng"
              stroke="#fb7185"
              strokeWidth={3}
              dot={{ r: 4, fill: '#fb7185' }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function LeaderboardCard({ leaderboard }) {
  return (
    <section className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-md">
      <h2 className="mb-1 text-lg font-semibold text-white">Bảng xếp hạng khen/chê</h2>
      <p className="mb-5 text-sm text-slate-400">
        Các điểm sáng và vấn đề được khách nhắc lại nhiều nhất.
      </p>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <KeywordList title="Top 5 điểm sáng được khen nhiều nhất" icon={<Smile className="h-4 w-4" />} items={leaderboard.top_positive || []} positive />
        <KeywordList title="Top 5 vấn đề bị phàn nàn nhiều nhất" icon={<Frown className="h-4 w-4" />} items={leaderboard.top_negative || []} />
      </div>
    </section>
  );
}

function KeywordList({ title, icon, items, positive = false }) {
  const displayItems = normalizeLeaderboardItems(items)
    .filter((item) => (positive ? isPositiveKeyword(item.text) : isNegativeKeyword(item.text)))
    .slice(0, 5);

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-4">
      <h3 className={`mb-4 flex items-center gap-2 text-sm font-semibold ${positive ? 'text-emerald-300' : 'text-rose-300'}`}>
        {icon}
        {title}
      </h3>
      <div className="space-y-3">
        {displayItems.length ? displayItems.map((item, index) => {
          const { text, value } = item;
          return (
            <div key={`${text}-${index}`} className="flex items-center justify-between gap-3 rounded-lg bg-slate-950/35 px-3 py-2">
              <span className="truncate text-sm text-slate-200">{index + 1}. {text}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${positive ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'}`}>
                {value}
              </span>
            </div>
          );
        }) : <p className="text-sm text-slate-500">Chưa có dữ liệu.</p>}
      </div>
    </div>
  );
}

function RecentReviews({ reviews }) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-md">
      <h3 className="mb-4 text-sm font-medium text-slate-200">Phản hồi mới nhất</h3>
      <div className="grid grid-cols-12 gap-4 border-b border-slate-700 pb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
        <div className="col-span-1">Nguồn</div>
        <div className="col-span-7">Nội dung</div>
        <div className="col-span-2 text-center">Nhận định</div>
        <div className="col-span-2 text-right">Độ chắc chắn</div>
      </div>
      <div className="mt-2 flex flex-col">
        {reviews.slice(0, 4).map((item) => <DataRow key={item.id} item={item} />)}
        {!reviews.length && <p className="py-8 text-center text-sm text-slate-500">Chưa có dữ liệu phản hồi.</p>}
      </div>
    </div>
  );
}

function DataRow({ item }) {
  const isPositive = Number(item.ai_label) === 1;
  return (
    <div className="grid grid-cols-12 items-center gap-4 rounded-lg border-b border-slate-700/50 px-2 py-4 transition-colors last:border-0 hover:bg-slate-800/30">
      <div className="col-span-1 flex pl-2 text-slate-400">{item.source_url === 'CSV_Upload' ? <Hash className="h-4 w-4" /> : <Globe className="h-4 w-4" />}</div>
      <div className="col-span-7 truncate pr-4 text-sm text-slate-300">{item.content}</div>
      <div className="col-span-2 flex justify-center">
        <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${isPositive ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border-rose-500/20 bg-rose-500/10 text-rose-400'}`}>
          {isPositive ? 'Khách hài lòng' : 'Khách chưa hài lòng'}
        </span>
      </div>
      <div className="col-span-2 pr-2 text-right font-mono text-sm text-slate-300">{(confidenceRatio(item.confidence) * 100).toFixed(1)}%</div>
    </div>
  );
}

function StatCard({ title, value, icon, trend, trendUp, subIcons }) {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-md transition-colors hover:bg-slate-800">
      <div className="flex items-start justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</h3>
        {icon}
      </div>
      <div className="mt-4 flex items-end justify-between">
        <div className="text-4xl font-bold text-white">{value}</div>
        {trend && (
          <div className={`mb-1 flex items-center text-sm font-medium ${trendUp ? 'text-emerald-400' : 'text-rose-400'}`}>
            {trendUp ? <TrendingUp className="mr-1 h-4 w-4" /> : <TrendingDown className="mr-1 h-4 w-4" />}
            {trend}
          </div>
        )}
        {subIcons && <div className="mb-1 flex gap-2 text-slate-500"><Globe className="h-4 w-4" /><Hash className="h-4 w-4" /><Globe className="h-4 w-4" /></div>}
      </div>
    </div>
  );
}

function extractAlerts(payload) {
  const value = findArray(payload, ['alerts', 'items', 'results', 'reviews', 'comments', 'data']);
  return value.map(normalizeAlert).filter((item) => item.content);
}

async function fetchAlertsForSources(userId, reviews) {
  const sources = [...new Set(reviews.map((item) => item.source_url).filter(Boolean))];
  if (!sources.length) return [];

  const responses = await Promise.allSettled(
    sources.map((sourceUrl) => fetchDashboardAlerts({ userId, sourceUrl }))
  );

  const alerts = responses
    .filter((result) => result.status === 'fulfilled')
    .flatMap((result) => extractAlerts(result.value));

  return uniqueAlerts(alerts)
    .sort((a, b) => new Date(b.review_date || b.created_at || 0) - new Date(a.review_date || a.created_at || 0));
}

function uniqueAlerts(alerts) {
  const seen = new Set();

  return alerts.filter((item) => {
    const key = item.id || item.content;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isCriticalAlert(item) {
  const rawText = [
    item.content,
    item.comment,
    item.text,
    item.review,
    ...(Array.isArray(item.keywords) ? item.keywords : []),
    ...(Array.isArray(item.aspects) ? item.aspects : []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('vi-VN');
  const text = normalizeKeywordTextSafe(rawText);

  const riskWords = [
    'ngộ độc',
    'ngo doc',
    'đau bụng',
    'dau bung',
    'ruồi',
    'ruoi',
    'dị vật',
    'di vat',
    'tẩy chay',
    'tay chay',
    'chửi',
    'chui',
    'thái độ',
    'thai do',
    'tệ',
    'te',
    'bẩn',
    'ban',
    'dơ',
    'do',
    'sống',
    'song',
    'hôi',
    'hoi',
  ];

  const hasRiskSignal = riskWords.some((word) => keywordMatches(text, word));
  if (hasRiskSignal) return true;
  if (isClearlyPositiveFeedback(rawText)) return false;

  const isActionRequired = item.is_action_required === true || String(item.is_action_required).toLowerCase() === 'true';
  const hasNegativeSignal = hasNegativeFeedbackSignal(rawText);
  if (isActionRequired && hasNegativeSignal) return true;

  return Number(item.ai_label) === 0 && hasNegativeSignal;
}

function isClearlyPositiveFeedback(text) {
  const normalizedText = normalizeKeywordTextSafe(text);
  const positiveWords = [
    'ngon',
    'qua ngon',
    'quá ngon',
    'dang tien',
    'đáng tiền',
    'tuyet',
    'tuyệt',
    'hai long',
    'hài lòng',
    'on ap',
    'ổn áp',
    'sach',
    'sạch',
    'nhanh',
    'vua mieng',
    'vừa miệng',
    'de thuong',
    'dễ thương',
    'nhiet tinh',
    'nhiệt tình',
    'rat tot',
    'rất tốt',
    'tot',
    'tốt',
  ];

  const negativeCues = [
    'khong',
    'không',
    'chua',
    'chưa',
    'that vong',
    'thất vọng',
    'te',
    'tệ',
    'do',
    'dở',
    'lau',
    'lâu',
    'ban',
    'bẩn',
    'hoi',
    'hôi',
    'nhat',
    'nhạt',
    'man',
    'mặn',
    'dat',
    'đắt',
    'kem',
    'kém',
  ];

  const chinesePositiveWords = ['不错', '好吃', '推荐', '弹性', '赞', '很好', '特别推荐'];
  const extraPositiveWords = ['thom', 'dep', 'gioi thieu', 'se ung ho', 'recommend'];
  const hasPositiveSignal = [...positiveWords, ...extraPositiveWords]
    .some((word) => normalizedText.includes(normalizeKeywordTextSafe(word)))
    || chinesePositiveWords.some((word) => String(text || '').includes(word));
  const hasNegativeSignal = hasNegativeFeedbackSignal(text)
    || negativeCues.some((word) => keywordMatches(normalizedText, word));

  return hasPositiveSignal && !hasNegativeSignal;
}

function hasNegativeFeedbackSignal(text) {
  const normalizedText = normalizeKeywordTextSafe(text);
  const negativeCues = [
    'khong',
    'ko',
    'chua',
    'that vong',
    'te',
    'do',
    'lau',
    'ban',
    'hoi',
    'nhat',
    'man',
    'dat',
    'kem',
    'it',
    'doi',
    'kho chiu',
    'thai do',
    'nguoi',
    'song',
    'qua te',
    'khong dung',
    'khong ngon',
    'khong sach',
    'khong hai long',
  ];

  return negativeCues.some((word) => keywordMatches(normalizedText, word));
}

function keywordMatches(normalizedText, term) {
  const keyword = normalizeKeywordTextSafe(term);
  if (!keyword) return false;
  if (!keyword.includes(' ') && keyword.length <= 4) {
    return normalizedText.split(/\s+/).includes(keyword);
  }
  return normalizedText.includes(keyword);
}

function findArray(value, keys, depth = 0) {
  if (!value || depth > 5) return [];
  if (Array.isArray(value)) return value;

  for (const key of keys) {
    const found = findArray(value[key], keys, depth + 1);
    if (found.length) return found;
  }

  return [];
}

function normalizeAlert(item) {
  return {
    id: item.id || item.review_id || item.alert_id || item.created_at || item.content,
    content: item.content || item.comment || item.text || item.review || item.original_content || item.message || '',
    keywords: extractStoredKeywords(item),
    source_url: item.source_url || item.source || '',
    ai_label: item.ai_label,
    confidence: item.confidence,
    is_action_required: item.is_action_required,
    review_date: item.review_date,
    created_at: item.created_at,
  };
}

function extractKeywords(item) {
  if (Array.isArray(item.keywords)) return item.keywords;
  if (typeof item.keywords === 'string') return item.keywords.split(',').map((word) => word.trim()).filter(Boolean);
  if (Array.isArray(item.keyword)) return item.keyword;
  if (typeof item.keyword === 'string') return item.keyword.split(',').map((word) => word.trim()).filter(Boolean);
  if (Array.isArray(item.aspects)) return item.aspects;
  if (typeof item.aspects === 'string') return item.aspects.split(',').map((word) => word.trim()).filter(Boolean);
  return buildKeywordsFromText(item.content || item.comment || item.text || item.review || '');
}

function extractStoredKeywords(item) {
  if (Array.isArray(item.keywords)) return item.keywords.map((word) => String(word).trim()).filter(Boolean);
  if (typeof item.keywords === 'string') return item.keywords.split(',').map((word) => word.trim()).filter(Boolean);
  return [];
}

function buildLeaderboardFromReviews(reviews) {
  const positiveMap = new Map();
  const negativeMap = new Map();

  reviews.forEach((item) => {
    const isPositive = Number(item.ai_label) === 1;
    const target = isPositive ? positiveMap : negativeMap;
    const text = item.content || item.comment || item.text || item.review || '';

    buildSentimentKeywords(text, isPositive).forEach((keyword) => {
      target.set(keyword, (target.get(keyword) || 0) + 1);
    });
  });

  const toList = (map) => [...map.entries()]
    .map(([text, value]) => ({ text, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return {
    top_positive: toList(positiveMap),
    top_negative: toList(negativeMap),
  };
}

function buildSentimentKeywords(text, isPositive) {
  const normalizedText = normalizeKeywordTextSafe(text);
  const terms = isPositive ? POSITIVE_LEADERBOARD_TERMS : NEGATIVE_LEADERBOARD_TERMS;

  return terms
    .filter((item) => item.matches.some((term) => keywordMatches(normalizedText, term)))
    .map((item) => item.label);
}

const POSITIVE_LEADERBOARD_TERMS = [
  { label: 'Ngon', matches: ['ngon', 'ngon qua', 'rat ngon'] },
  { label: 'Sạch sẽ', matches: ['sach', 'sach se'] },
  { label: 'Phục vụ nhanh', matches: ['phuc vu nhanh', 'len mon nhanh', 'giao hang nhanh', 'nhanh'] },
  { label: 'Nhân viên thân thiện', matches: ['nhan vien than thien', 'than thien', 'nhiet tinh', 'de thuong'] },
  { label: 'Đáng tiền', matches: ['dang tien', 'gia hop ly', 'gia re', 're'] },
  { label: 'Vừa miệng', matches: ['vua mieng', 'dam da', 'hop khau vi'] },
  { label: 'Thơm', matches: ['thom'] },
  { label: 'Tươi', matches: ['tuoi', 'tuoi ngon'] },
  { label: 'Không gian thoáng', matches: ['thoang', 'rong rai', 'khong gian rong'] },
  { label: 'Sẽ quay lại', matches: ['se quay lai', 'ung ho', 'se ung ho'] },
  { label: 'Tuyệt vời', matches: ['tuyet', 'tuyet voi', 'rat tot'] },
];

const NEGATIVE_LEADERBOARD_TERMS = [
  { label: 'Thất vọng', matches: ['that vong'] },
  { label: 'Không ngon', matches: ['khong ngon', 'ko ngon', 'khong hop khau vi'] },
  { label: 'Chờ lâu', matches: ['cho lau', 'doi lau', 'lau', 'cham'] },
  { label: 'Phục vụ kém', matches: ['phuc vu kem', 'thai do', 'nhan vien kho chiu', 'khong ai nghe may'] },
  { label: 'Giá đắt', matches: ['gia dat', 'dat', 'hoi dat'] },
  { label: 'Không sạch', matches: ['khong sach', 'ban', 'mat ve sinh'] },
  { label: 'Đồ ăn nguội', matches: ['nguoi', 'do an nguoi'] },
  { label: 'Đồ ăn khô', matches: ['kho', 'bi kho'] },
  { label: 'Không tươi', matches: ['khong tuoi', 'kem tuoi'] },
  { label: 'Nhạt', matches: ['nhat'] },
  { label: 'Mặn', matches: ['man'] },
  { label: 'Chua', matches: ['chua'] },
  { label: 'Ồn ào', matches: ['on ao'] },
  { label: 'Khó chịu', matches: ['kho chiu'] },
  { label: 'Sai món', matches: ['sai mon', 'dat nham', 'nham'] },
];

function buildBusinessLeaderboard(apiLeaderboard, reviews) {
  const apiPositive = normalizeLeaderboardItems(apiLeaderboard?.top_positive);
  const apiNegative = normalizeLeaderboardItems(apiLeaderboard?.top_negative);
  const fallback = buildLeaderboardFromReviews(reviews);

  return {
    top_positive: completeKeywordList(
      apiPositive.filter((item) => isPositiveKeyword(item.text)),
      normalizeLeaderboardItems(fallback.top_positive).filter((item) => isPositiveKeyword(item.text)),
    ),
    top_negative: completeKeywordList(
      apiNegative.filter((item) => isNegativeKeyword(item.text)),
      normalizeLeaderboardItems(fallback.top_negative).filter((item) => isNegativeKeyword(item.text)),
    ),
  };
}

function completeKeywordList(primary, fallback) {
  const result = [];
  const seen = new Set();

  [...primary, ...fallback].forEach((item) => {
    const key = normalizeKeywordTextSafe(item.text);
    if (!key || seen.has(key) || result.length >= 5) return;
    seen.add(key);
    result.push(item);
  });

  return result;
}

function sanitizeLeaderboard(leaderboard) {
  const positiveItems = normalizeLeaderboardItems(leaderboard?.top_positive);
  const negativeItems = normalizeLeaderboardItems(leaderboard?.top_negative);

  return {
    top_positive: positiveItems
      .filter((item) => !isNegativeKeyword(item.text))
      .slice(0, 5),
    top_negative: negativeItems
      .filter((item) => !isPositiveKeyword(item.text))
      .slice(0, 5),
  };
}

function normalizeLeaderboardItems(items = []) {
  return items
    .map((item) => ({
      text: String(item.text || item.keyword || item.name || '').trim(),
      value: Number(item.value || item.count || 0),
    }))
    .filter((item) => item.text && item.value > 0)
    .sort((a, b) => b.value - a.value);
}

function normalizeKeywordText(text) {
  return String(text || '')
    .trim()
    .toLocaleLowerCase('vi-VN')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/đ/g, 'd');
}

function normalizeKeywordTextSafe(text) {
  return String(text || '')
    .trim()
    .toLocaleLowerCase('vi-VN')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd');
}

function isPositiveKeyword(text) {
  const word = normalizeKeywordTextSafe(text);
  const positiveTerms = [
    'ngon',
    'ngot',
    'sach',
    'tuyet',
    'tot',
    'nhanh',
    'than thien',
    'dang tien',
    'hai long',
    'vua mieng',
    'de thuong',
    'nhiet tinh',
    're',
    'dep',
    'thom',
    'gion',
    'mem',
    'dam da',
    'thoang',
    'rong rai',
  ];

  if (isNegativeKeyword(text)) return false;
  return positiveTerms.some((term) => word === term || word.includes(term));
}

function isNegativeKeyword(text) {
  const word = normalizeKeywordTextSafe(text);
  const negativeTerms = [
    'te',
    'do',
    'lau',
    'cham',
    'ban',
    'hoi',
    'dat',
    'kem',
    'nhat',
    'man',
    'chua',
    'nong',
    'on ao',
    'that vong',
    'kho chiu',
    'thai do',
    'ngo doc',
    'dau bung',
    'ruoi',
    'di vat',
    'nguoi',
    'kho',
    'it',
    'doi',
    'khong ngon',
    'khong sach',
    'sai mon',
    'dat nham',
    'nham',
  ];

  return negativeTerms.some((term) => word === term || word.includes(term));
}

function buildKeywordsFromText(text) {
  const stopWords = new Set([
    'không', 'nhưng', 'mình', 'được', 'này', 'quán', 'món', 'thấy', 'rất',
    'nhiều', 'cũng', 'cho', 'với', 'của', 'thì', 'mà', 'là', 'có',
  ]);

  return [...new Set(
    String(text)
      .toLocaleLowerCase('vi-VN')
      .match(/[\p{L}\p{N}]+/gu) || []
  )]
    .filter((word) => word.length >= 4 && !stopWords.has(word))
    .slice(0, 4);
}

function isInRange(value, from, to) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) && time >= from && time < to;
}

function formatWeekday(date) {
  return ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][date.getDay()];
}

function buildTrendData(reviews) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));

    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    const items = reviews.filter((item) => isInRange(item.created_at, date.getTime(), nextDay.getTime()));

    return {
      label: formatWeekday(date),
      date: `${date.getDate()}/${date.getMonth() + 1}`,
      positive: items.filter((item) => Number(item.ai_label) === 1).length,
      negative: items.filter((item) => Number(item.ai_label) === 0).length,
    };
  });
}

