import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MessageSquare, Smile, Network, Globe, Hash, TrendingUp, TrendingDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { confidenceRatio, fetchUserReviews } from '../services/reviews';

export default function DashboardContent() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);

  const load = useCallback(async () => {
    if (!user?.id) return;
    try { setReviews(await fetchUserReviews(user.id)); }
    catch (error) { window.alert(error.message); }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const positive = reviews.filter((item) => Number(item.ai_label) === 1).length;
    const sources = new Set(reviews.map((item) => item.source_url).filter(Boolean)).size;
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const currentPeriod = reviews.filter((item) => isInRange(item.created_at, now - sevenDays, now)).length;
    const previousPeriod = reviews.filter((item) => isInRange(item.created_at, now - sevenDays * 2, now - sevenDays)).length;
    const growth = previousPeriod > 0 ? ((currentPeriod - previousPeriod) / previousPeriod) * 100 : currentPeriod > 0 ? 100 : 0;
    return { total: reviews.length, positive, sources, rate: reviews.length ? positive / reviews.length : 0, growth };
  }, [reviews]);

  const dailyTrend = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - index));
      return date;
    });
    const counts = days.map((date) => {
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      return reviews.filter((item) => isInRange(item.created_at, date.getTime(), nextDay.getTime())).length;
    });
    const maxCount = Math.max(...counts, 1);
    const points = counts.map((count, index) => ({ x: index / 6 * 100, y: 34 - count / maxCount * 28, count }));
    return {
      points,
      path: buildSmoothPath(points),
      labels: days.map((date) => ({ weekday: formatWeekday(date), date: `${date.getDate()}/${date.getMonth() + 1}` })),
    };
  }, [reviews]);

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500 text-sans">
      <div className="flex justify-between items-end mb-8"><h1 className="text-2xl font-semibold text-white tracking-wide">Tổng quan hệ thống</h1></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="TỔNG SỐ BÌNH LUẬN" value={stats.total.toLocaleString('vi-VN')} icon={<MessageSquare className="w-5 h-5 text-indigo-400" />} trend={`${stats.growth >= 0 ? '+' : ''}${stats.growth.toFixed(1)}%`} trendUp={stats.growth >= 0} />
        <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl p-6 flex flex-col justify-between hover:bg-slate-800 transition-colors"><div className="flex justify-between items-start"><h3 className="text-xs font-semibold tracking-wider text-slate-400 uppercase">TỶ LỆ TÍCH CỰC</h3><Smile className="w-5 h-5 text-emerald-400" /></div><div className="mt-4"><div className="text-4xl font-bold text-white mb-3">{(stats.rate * 100).toFixed(1)}%</div><div className="h-1.5 w-full bg-rose-500 rounded-full overflow-hidden flex"><div className="h-full bg-emerald-500 rounded-full transition-[width] duration-700" style={{ width: `${stats.rate * 100}%` }} /></div></div></div>
        <StatCard title="TỔNG NGUỒN THU THẬP" value={stats.sources.toLocaleString('vi-VN')} icon={<Network className="w-5 h-5 text-indigo-400" />} subIcons />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl p-6">
          <h3 className="text-sm font-medium text-slate-200 mb-6">Xu hướng 7 ngày</h3>
          <div className="h-48 w-full relative flex items-end">
            <svg className="w-full h-full absolute inset-0 preserve-3d" viewBox="0 0 100 40" preserveAspectRatio="none">
              <defs><linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#34d399" /><stop offset="50%" stopColor="#818cf8" /><stop offset="100%" stopColor="#fb7185" /></linearGradient></defs>
              <path d={dailyTrend.path} fill="none" stroke="url(#lineGrad)" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" />
              {dailyTrend.points.map((point, index) => <circle key={dailyTrend.labels[index].date} cx={point.x} cy={point.y} r="0.8" fill="#a5b4fc"><title>{`${dailyTrend.labels[index].date}: ${point.count} bình luận`}</title></circle>)}
            </svg>
            <div className="w-full flex justify-between text-xs text-slate-500 mt-auto pt-4 border-t border-slate-700/50 z-10">
              {dailyTrend.labels.map((label) => <span key={label.date} className="flex flex-col items-center gap-0.5"><span>{label.weekday}</span><span className="text-[10px] text-slate-600">{label.date}</span></span>)}
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl p-6 flex flex-col items-center"><h3 className="text-sm font-medium text-slate-200 self-start w-full mb-4">Phân bổ cảm xúc</h3><div className="relative w-36 h-36 flex items-center justify-center mt-2"><svg viewBox="0 0 100 100" className="w-full h-full -rotate-90 transform"><circle cx="50" cy="50" r="40" fill="transparent" stroke="#e11d48" strokeWidth="18" /><circle cx="50" cy="50" r="40" fill="transparent" stroke="#10b981" strokeWidth="18" strokeDasharray={`${stats.rate * 251.2} 251.2`} /></svg><div className="absolute flex flex-col items-center justify-center text-center"><span className="text-2xl font-bold text-white leading-none">{(stats.rate * 100).toFixed(0)}%</span><span className="text-xs text-slate-400 mt-1">Tích cực</span></div></div><div className="flex gap-4 mt-6 text-xs text-slate-300"><div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />Tích cực</div><div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-rose-500" />Tiêu cực</div></div></div>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl p-6"><h3 className="text-sm font-medium text-slate-200 mb-4">Dữ liệu thu thập gần đây</h3><div className="grid grid-cols-12 gap-4 pb-3 border-b border-slate-700 text-xs font-semibold text-slate-400 uppercase tracking-wider"><div className="col-span-1">Nguồn</div><div className="col-span-7">Nội dung</div><div className="col-span-2 text-center">Phân loại</div><div className="col-span-2 text-right">Độ tin cậy</div></div><div className="flex flex-col mt-2">{reviews.slice(0, 4).map((item) => <DataRow key={item.id} icon={item.source_url === 'CSV_Upload' ? <Hash className="w-4 h-4" /> : <Globe className="w-4 h-4" />} content={item.content} type={Number(item.ai_label) === 1 ? 'positive' : 'negative'} confidence={`${(confidenceRatio(item.confidence) * 100).toFixed(1)}%`} />)}</div></div>
    </div>
  );
}

function isInRange(value, from, to) { const time = new Date(value).getTime(); return Number.isFinite(time) && time >= from && time < to; }
function formatWeekday(date) { return ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][date.getDay()]; }
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
function StatCard({ title, value, icon, trend, trendUp, subIcons }) { return <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl p-6 flex flex-col justify-between hover:bg-slate-800 transition-colors"><div className="flex justify-between items-start"><h3 className="text-xs font-semibold tracking-wider text-slate-400 uppercase">{title}</h3>{icon}</div><div className="mt-4 flex items-end justify-between"><div className="text-4xl font-bold text-white">{value}</div>{trend && <div className={`flex items-center text-sm font-medium mb-1 ${trendUp ? 'text-emerald-400' : 'text-rose-400'}`}>{trendUp ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}{trend}</div>}{subIcons && <div className="flex gap-2 text-slate-500 mb-1"><Globe className="w-4 h-4" /><Hash className="w-4 h-4" /><Globe className="w-4 h-4" /></div>}</div></div>; }
function DataRow({ icon, content, type, confidence }) { const isPositive = type === 'positive'; return <div className="grid grid-cols-12 gap-4 py-4 border-b border-slate-700/50 last:border-0 items-center hover:bg-slate-800/30 transition-colors rounded-lg px-2 -mx-2"><div className="col-span-1 text-slate-400 flex pl-2">{icon}</div><div className="col-span-7 text-sm text-slate-300 pr-4 truncate">{content}</div><div className="col-span-2 flex justify-center"><span className={`px-2.5 py-1 text-xs font-medium rounded-full ${isPositive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>{isPositive ? 'Tích cực' : 'Tiêu cực'}</span></div><div className="col-span-2 text-right text-sm text-slate-300 font-mono pr-2">{confidence}</div></div>; }
