import { useCallback, useEffect, useMemo, useState } from 'react';
import { Frown, Globe, MessageSquare, RefreshCw, Smile } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { confidenceRatio, fetchUserReviews } from '../services/reviews';

export default function Dashboard() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true); setError('');
    try { setReviews(await fetchUserReviews(user.id)); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const positive = reviews.filter((item) => Number(item.ai_label) === 1).length;
    const negative = reviews.length - positive;
    const confidence = reviews.length ? reviews.reduce((sum, item) => sum + confidenceRatio(item.confidence), 0) / reviews.length : 0;
    return { total: reviews.length, positive, negative, confidence, positiveRate: reviews.length ? positive / reviews.length : 0 };
  }, [reviews]);

  return (
    <div className="space-y-6 p-2 text-slate-200 sm:p-4 lg:p-8">
      <header className="flex items-center justify-between"><div><h1 className="text-2xl font-semibold text-white">Tổng quan hệ thống</h1><p className="mt-1 text-sm text-slate-400">Dữ liệu thật của tài khoản đang đăng nhập</p></div><button onClick={load} disabled={loading} className="rounded-xl border border-slate-700 p-2.5 text-slate-300 hover:bg-slate-800" title="Làm mới"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button></header>
      {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-300">{error}</div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat title="Tổng bình luận" value={stats.total.toLocaleString('vi-VN')} icon={MessageSquare} color="text-indigo-400" />
        <Stat title="Tích cực" value={stats.positive.toLocaleString('vi-VN')} icon={Smile} color="text-emerald-400" />
        <Stat title="Tiêu cực" value={stats.negative.toLocaleString('vi-VN')} icon={Frown} color="text-rose-400" />
        <Stat title="Độ tin cậy TB" value={`${(stats.confidence * 100).toFixed(1)}%`} icon={Globe} color="text-cyan-400" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 lg:col-span-2">
          <h2 className="mb-6 text-sm font-medium text-slate-200">Tỷ lệ cảm xúc</h2>
          <div className="space-y-6">
            <Progress label="Tích cực" value={stats.positive} total={stats.total} color="bg-emerald-500" />
            <Progress label="Tiêu cực" value={stats.negative} total={stats.total} color="bg-rose-500" />
          </div>
        </section>
        <section className="flex flex-col items-center rounded-2xl border border-slate-700 bg-slate-800/50 p-6">
          <h2 className="w-full text-sm font-medium">Phân bố cảm xúc</h2>
          <div className="relative mt-5 grid h-40 w-40 place-items-center rounded-full" style={{ background: `conic-gradient(#10b981 ${stats.positiveRate * 360}deg, #f43f5e 0)` }}><div className="grid h-24 w-24 place-items-center rounded-full bg-slate-800 text-center"><div><b className="text-2xl">{(stats.positiveRate * 100).toFixed(1)}%</b><p className="text-xs text-slate-400">Tích cực</p></div></div></div>
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-800/50">
        <div className="border-b border-slate-700 p-5"><h2 className="font-medium">Dữ liệu gần đây</h2></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-900/40 text-xs uppercase text-slate-400"><tr><th className="p-4">Nguồn</th><th className="p-4">Nội dung</th><th className="p-4">Nhãn</th><th className="p-4 text-right">Confidence</th></tr></thead><tbody className="divide-y divide-slate-700">{reviews.slice(0, 8).map((item) => <tr key={item.id} className="hover:bg-slate-700/20"><td className="max-w-40 truncate p-4 text-slate-400">{item.source_url || '-'}</td><td className="max-w-xl truncate p-4">{item.content}</td><td className="p-4"><Badge label={Number(item.ai_label)} /></td><td className="p-4 text-right font-mono">{(confidenceRatio(item.confidence) * 100).toFixed(1)}%</td></tr>)}</tbody></table></div>
        {!loading && reviews.length === 0 && <p className="p-8 text-center text-slate-400">Chưa có dữ liệu phân tích.</p>}
      </section>
    </div>
  );
}

function Stat({ title, value, icon: Icon, color }) { return <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6"><div className="flex items-center justify-between text-xs uppercase text-slate-400"><span>{title}</span><Icon className={`h-5 w-5 ${color}`} /></div><div className="mt-4 text-3xl font-bold text-white">{value}</div></div>; }
function Progress({ label, value, total, color }) { const percent = total ? value / total * 100 : 0; return <div><div className="mb-2 flex justify-between text-sm"><span>{label}</span><span>{value.toLocaleString('vi-VN')} ({percent.toFixed(1)}%)</span></div><div className="h-3 overflow-hidden rounded-full bg-slate-700"><div className={`h-full rounded-full ${color}`} style={{ width: `${percent}%` }} /></div></div>; }
function Badge({ label }) { const positive = label === 1; return <span className={`rounded-full border px-2.5 py-1 text-xs ${positive ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-rose-500/30 bg-rose-500/10 text-rose-400'}`}>{positive ? 'Tích cực' : 'Tiêu cực'}</span>; }
