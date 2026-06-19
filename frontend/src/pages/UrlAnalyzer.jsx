import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Link as LinkIcon, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { analyzeUrl } from '../services/api';

export default function UrlAnalyzer() {
  const { user } = useAuth();
  const [url, setUrl] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const valid = /^https?:\/\//i.test(url.trim());

  const analyze = async () => {
    if (!valid || !user?.id) return;
    setLoading(true); setResults([]); setMessage({ type: '', text: '' });
    try {
      const data = await analyzeUrl({ url: url.trim(), user_id: user.id });
      if (!data.length) throw new Error('Máy cào không trả về bình luận hợp lệ.');
      setResults(data); setMessage({ type: 'success', text: `Đã cào, phân tích và lưu ${data.length} bình luận.` });
    } catch (error) {
      const text = error.message === 'Failed to fetch' ? 'Không kết nối được scraper Node.js tại cổng 3000.' : error.message;
      setMessage({ type: 'error', text });
    } finally { setLoading(false); }
  };

  const positive = results.filter((item) => item.prediction === 1).length;

  return (
    <div className="space-y-6 p-2 text-slate-200 sm:p-4 lg:p-8">
      <header><h1 className="text-2xl font-semibold text-white">URL Analyzer</h1><p className="mt-1 text-sm text-slate-400">Gửi link và user_id sang máy cào Node.js</p></header>
      <section className="rounded-2xl border border-slate-700 bg-slate-800/50 p-5 sm:p-7">
        <label className="mb-3 block text-sm font-medium">Đường dẫn cần phân tích</label>
        <div className="flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><LinkIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" /><input value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && analyze()} placeholder="https://www.foody.vn/..." className="w-full rounded-xl border border-slate-700 bg-slate-900/60 py-3 pl-12 pr-4 text-sm outline-none focus:border-indigo-500" /></div><button onClick={analyze} disabled={!valid || loading} className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-7 py-3 font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"><Sparkles className="h-4 w-4" />{loading ? 'Đang cào dữ liệu...' : 'Analyze'}</button></div>
        {loading && <div className="mt-5"><div className="mb-2 flex justify-between text-sm text-slate-400"><span>Puppeteer đang tải bình luận, vui lòng không bấm lại...</span><span>Đang xử lý</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-700"><div className="h-full w-2/3 animate-pulse rounded-full bg-indigo-500" /></div></div>}
      </section>
      {message.text && <div className={`flex items-center gap-3 rounded-xl border p-4 ${message.type === 'error' ? 'border-rose-500/30 bg-rose-500/10 text-rose-300' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'}`}>{message.type === 'error' ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}{message.text}</div>}
      {results.length > 0 && <>
        <div className="grid gap-4 sm:grid-cols-3"><Stat label="Tổng" value={results.length} /><Stat label="Tích cực" value={positive} color="text-emerald-400" /><Stat label="Tiêu cực" value={results.length - positive} color="text-rose-400" /></div>
        <section className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-800/50"><div className="border-b border-slate-700 p-5 font-medium">Kết quả phân tích</div><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-slate-900/40 text-xs uppercase text-slate-400"><tr><th className="p-4">Bình luận</th><th className="p-4">Nhãn</th><th className="p-4">Confidence</th></tr></thead><tbody className="divide-y divide-slate-700">{results.map((item, index) => <tr key={`${item.text}-${index}`}><td className="max-w-2xl p-4">{item.text}</td><td className={`p-4 ${item.prediction === 1 ? 'text-emerald-400' : 'text-rose-400'}`}>{item.prediction === 1 ? 'Tích cực' : 'Tiêu cực'}</td><td className="p-4 font-mono">{(item.confidence * 100).toFixed(1)}%</td></tr>)}</tbody></table></div></section>
      </>}
    </div>
  );
}

function Stat({ label, value, color = 'text-white' }) { return <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-5"><p className="text-xs uppercase text-slate-400">{label}</p><p className={`mt-2 text-3xl font-bold ${color}`}>{value}</p></div>; }
