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
import { useAuth } from '../contexts/AuthContext';
import { fetchDashboardAlerts, fetchKeywordAnalytics } from '../services/api';
import { confidenceRatio, fetchUserReviews } from '../services/reviews';

const SOURCE_URL = 'all';

export default function DashboardContent() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const [reviewRows, alertPayload, keywordPayload] = await Promise.allSettled([
        fetchUserReviews(user.id),
        fetchDashboardAlerts({ userId: user.id, sourceUrl: SOURCE_URL }),
        fetchKeywordAnalytics({ userId: user.id, sourceUrl: SOURCE_URL }),
      ]);

      if (reviewRows.status === 'fulfilled') setReviews(reviewRows.value);
      else throw reviewRows.reason;

      setAlerts(alertPayload.status === 'fulfilled' ? extractAlerts(alertPayload.value) : []);
      setAnalytics(keywordPayload.status === 'fulfilled' ? keywordPayload.value : null);
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

  const trend = useMemo(() => buildTrend(reviews), [reviews]);
  const leaderboard = useMemo(() => {
    const value = analytics?.leaderboard || analytics?.data?.leaderboard;
    if (value?.top_positive || value?.top_negative) return value;
    return buildFallbackLeaderboard(reviews);
  }, [analytics, reviews]);

  const visibleAlerts = useMemo(() => {
    if (alerts.length) return alerts.slice(0, 4);
    return reviews
      .filter((item) => Number(item.ai_label) === 0 || confidenceRatio(item.confidence) < 0.55)
      .slice(0, 4)
      .map((item) => ({
        id: item.id,
        content: item.content,
        keywords: extractKeywords(item),
        source_url: item.source_url,
      }));
  }, [alerts, reviews]);

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500 font-sans">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-wide text-white">Tổng quan hoạt động</h1>
        <p className="text-sm text-slate-400">
          Theo dõi phản hồi khách hàng, điểm nổi bật và vấn đề cần xử lý.
        </p>
      </div>

      <AlertsSection alerts={visibleAlerts} loading={loading} />

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
        <TrendCard trend={trend} />
        <SentimentDonut positive={stats.positive} negative={stats.negative} rate={stats.positiveRate} />
      </div>

      <LeaderboardCard leaderboard={leaderboard} />
      <RecentReviews reviews={reviews} />
    </div>
  );
}

function AlertsSection({ alerts, loading }) {
  return (
    <section className="rounded-2xl border border-rose-500/25 bg-rose-500/10 p-5 shadow-lg shadow-rose-950/10">
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

      {alerts.length ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {alerts.map((alert, index) => (
            <div key={alert.id || index} className="rounded-xl border border-rose-400/20 bg-slate-950/35 p-4">
              <p className="line-clamp-2 text-sm leading-relaxed text-slate-100">
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

function TrendCard({ trend }) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-md lg:col-span-2">
      <h3 className="mb-2 text-sm font-medium text-slate-200">Xu hướng phản hồi 7 ngày</h3>
      <p className="mb-6 text-xs text-slate-500">
        Đường xanh là phản hồi hài lòng, đường đỏ là phản hồi chưa hài lòng.
      </p>
      <div className="relative h-52 w-full">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 44" preserveAspectRatio="none">
          <path d={trend.positivePath} fill="none" stroke="#10b981" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d={trend.negativePath} fill="none" stroke="#fb7185" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" />
          {trend.positivePoints.map((point, index) => (
            <circle key={`p-${trend.labels[index].date}`} cx={point.x} cy={point.y} r="0.65" fill="#34d399" />
          ))}
          {trend.negativePoints.map((point, index) => (
            <circle key={`n-${trend.labels[index].date}`} cx={point.x} cy={point.y} r="0.65" fill="#fb7185" />
          ))}
        </svg>
        <div className="absolute bottom-0 left-0 right-0 z-10 flex justify-between border-t border-slate-700/50 pt-4 text-xs text-slate-500">
          {trend.labels.map((label) => (
            <span key={label.date} className="flex flex-col items-center gap-0.5">
              <span>{label.weekday}</span>
              <span className="text-[10px] text-slate-600">{label.date}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function SentimentDonut({ positive, negative, rate }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-md">
      <h3 className="mb-4 w-full self-start text-sm font-medium text-slate-200">Tỷ lệ khen/chê</h3>
      <div className="relative mt-2 flex h-36 w-36 items-center justify-center">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90 transform">
          <circle cx="50" cy="50" r="40" fill="transparent" stroke="#e11d48" strokeWidth="18" />
          <circle cx="50" cy="50" r="40" fill="transparent" stroke="#10b981" strokeWidth="18" strokeDasharray={`${rate * 251.2} 251.2`} />
        </svg>
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-bold leading-none text-white">{(rate * 100).toFixed(0)}%</span>
          <span className="mt-1 text-xs text-slate-400">hài lòng</span>
        </div>
      </div>
      <div className="mt-6 flex gap-4 text-xs text-slate-300">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Khen: {positive}</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" />Chê: {negative}</span>
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
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-4">
      <h3 className={`mb-4 flex items-center gap-2 text-sm font-semibold ${positive ? 'text-emerald-300' : 'text-rose-300'}`}>
        {icon}
        {title}
      </h3>
      <div className="space-y-3">
        {items.length ? items.slice(0, 5).map((item, index) => {
          const text = item.text || item.keyword || item.name;
          const value = Number(item.value || item.count || 0);
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
  const value = payload?.alerts || payload?.data?.alerts || payload?.data || payload;
  return Array.isArray(value) ? value : [];
}

function extractKeywords(item) {
  if (Array.isArray(item.keywords)) return item.keywords;
  if (typeof item.keywords === 'string') return item.keywords.split(',').map((word) => word.trim()).filter(Boolean);
  return String(item.content || '').split(/\s+/).filter((word) => word.length > 4).slice(0, 3);
}

function isInRange(value, from, to) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) && time >= from && time < to;
}

function formatWeekday(date) {
  return ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][date.getDay()];
}

function buildTrend(reviews) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    return date;
  });
  const counts = days.map((date) => {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    const items = reviews.filter((item) => isInRange(item.created_at, date.getTime(), nextDay.getTime()));
    return {
      positive: items.filter((item) => Number(item.ai_label) === 1).length,
      negative: items.filter((item) => Number(item.ai_label) === 0).length,
    };
  });
  const maxCount = Math.max(...counts.flatMap((item) => [item.positive, item.negative]), 1);
  const toPoints = (key) => counts.map((count, index) => ({ x: (index / 6) * 100, y: 36 - (count[key] / maxCount) * 28 }));
  const positivePoints = toPoints('positive');
  const negativePoints = toPoints('negative');

  return {
    positivePoints,
    negativePoints,
    positivePath: buildSmoothPath(positivePoints),
    negativePath: buildSmoothPath(negativePoints),
    labels: days.map((date) => ({ weekday: formatWeekday(date), date: `${date.getDate()}/${date.getMonth() + 1}` })),
  };
}

function buildSmoothPath(points) {
  if (!points.length) return '';
  let path = `M ${points[0].x},${points[0].y}`;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    path += ` Q ${previous.x},${previous.y} ${(previous.x + current.x) / 2},${(previous.y + current.y) / 2}`;
  }
  const last = points[points.length - 1];
  return `${path} T ${last.x},${last.y}`;
}

function buildFallbackLeaderboard(reviews) {
  const positiveMap = new Map();
  const negativeMap = new Map();

  reviews.forEach((review) => {
    const map = Number(review.ai_label) === 1 ? positiveMap : negativeMap;
    extractKeywords(review).forEach((keyword) => {
      map.set(keyword, (map.get(keyword) || 0) + 1);
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
