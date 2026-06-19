import { useCallback, useEffect, useMemo, useState } from 'react';
import { Database, Download, Frown, RefreshCw, ShieldCheck, Smile } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { confidenceRatio, fetchUserReviews } from '../services/reviews';

export default function Report() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => { if (!user?.id) return; setLoading(true); setError(''); try { setReviews(await fetchUserReviews(user.id)); } catch (err) { setError(err.message); } finally { setLoading(false); } }, [user?.id]);
  useEffect(() => { load(); }, [load]);

  const report = useMemo(() => {
    const positive = reviews.filter((item) => Number(item.ai_label) === 1).length;
    const confidence = reviews.length ? reviews.reduce((sum, item) => sum + confidenceRatio(item.confidence), 0) / reviews.length : 0;
    const sources = new Map();
    reviews.forEach((item) => {
      const source = item.source_url === 'CSV_Upload' ? 'CSV' : item.source_url?.includes('foody') ? 'Foody' : item.source_url?.includes('shopee') ? 'Shopee' : 'Khác';
      const current = sources.get(source) || { positive: 0, negative: 0 };
      current[Number(item.ai_label) === 1 ? 'positive' : 'negative'] += 1;
      sources.set(source, current);
    });
    return { positive, negative: reviews.length - positive, confidence, sources: [...sources.entries()] };
  }, [reviews]);

  const maxSource = Math.max(1, ...report.sources.flatMap(([, value]) => [value.positive, value.negative]));

  return (
    <div className="space-y-6 p-2 text-slate-200 sm:p-4 lg:p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-2xl font-semibold text-white">Báo cáo</h1><p className="mt-1 text-sm text-slate-400">Tổng hợp trực tiếp từ dữ liệu Supabase của tài khoản</p></div><div className="flex gap-2"><button onClick={load} className="flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Làm mới</button><button disabled title="Chức năng mới chưa được tích hợp" className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm opacity-50"><Download className="h-4 w-4" />Xuất PDF</button></div></header>
      {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-300">{error}</div>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Tổng dữ liệu" value={reviews.length} icon={Database} /><Metric label="Tích cực" value={report.positive} icon={Smile} color="text-emerald-400" /><Metric label="Tiêu cực" value={report.negative} icon={Frown} color="text-rose-400" /><Metric label="Confidence TB" value={`${(report.confidence * 100).toFixed(1)}%`} icon={ShieldCheck} color="text-indigo-400" /></div>
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 lg:col-span-2"><h2 className="font-medium text-white">So sánh theo nguồn</h2><div className="mt-8 flex min-h-64 items-end justify-around gap-6 border-b border-slate-700 px-3">{report.sources.length ? report.sources.map(([source, value]) => <div key={source} className="flex h-56 min-w-20 flex-col justify-end"><div className="flex flex-1 items-end justify-center gap-2"><div title={`${value.positive} tích cực`} className="w-8 rounded-t bg-emerald-500 sm:w-12" style={{ height: `${Math.max(3, value.positive / maxSource * 100)}%` }} /><div title={`${value.negative} tiêu cực`} className="w-8 rounded-t bg-rose-500 sm:w-12" style={{ height: `${Math.max(3, value.negative / maxSource * 100)}%` }} /></div><p className="py-3 text-center text-sm text-slate-400">{source}</p></div>) : <p className="m-auto text-slate-400">Chưa có dữ liệu</p>}</div><div className="mt-4 flex justify-center gap-5 text-xs"><span className="text-emerald-400">● Tích cực</span><span className="text-rose-400">● Tiêu cực</span></div></section>
        <section className="flex flex-col items-center rounded-2xl border border-slate-700 bg-slate-800/50 p-6"><h2 className="w-full font-medium text-white">Tỷ lệ cảm xúc</h2><div className="relative mt-10 grid h-44 w-44 place-items-center rounded-full" style={{ background: `conic-gradient(#10b981 ${reviews.length ? report.positive / reviews.length * 360 : 0}deg, #f43f5e 0)` }}><div className="grid h-28 w-28 place-items-center rounded-full bg-slate-800 text-center"><div><p className="text-2xl font-bold">{reviews.length ? (report.positive / reviews.length * 100).toFixed(1) : 0}%</p><p className="text-xs text-slate-400">Tích cực</p></div></div></div></section>
      </div>
    </div>
  );
}

function Metric({ label, value, icon: Icon, color = 'text-white' }) { return <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-5"><div className="flex items-center gap-2 text-xs uppercase text-slate-400"><Icon className="h-4 w-4" />{label}</div><p className={`mt-3 text-3xl font-bold ${color}`}>{typeof value === 'number' ? value.toLocaleString('vi-VN') : value}</p></div>; }
