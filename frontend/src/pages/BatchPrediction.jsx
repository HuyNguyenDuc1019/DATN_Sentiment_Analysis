import { useMemo, useRef, useState } from 'react';
import Papa from 'papaparse';
import { CheckCircle2, FileText, Pencil, Search, Sparkles, UploadCloud, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { predictBatch, submitFeedback } from '../services/api';

const PAGE_SIZE = 10;

export default function BatchPrediction() {
  const { user } = useAuth();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [texts, setTexts] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);

  const chooseFile = (selected) => {
    if (!selected) return;
    setMessage({ type: '', text: '' }); setResults([]); setPage(1);
    Papa.parse(selected, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data, meta }) => {
        const preferred = meta.fields?.find((name) => ['text', 'content', 'comment', 'review', 'bình luận', 'binh_luan'].includes(name.toLowerCase()));
        const values = data.map((row) => String(row[preferred || meta.fields?.[0]] || '').trim()).filter(Boolean);
        if (!values.length) return setMessage({ type: 'error', text: 'Không tìm thấy cột bình luận trong CSV.' });
        setFile(selected); setTexts(values);
      },
      error: (error) => setMessage({ type: 'error', text: error.message }),
    });
  };

  const analyze = async () => {
    if (!user?.id || !texts.length) return;
    setLoading(true); setProgress(5); setMessage({ type: '', text: '' });
    const progressTimer = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 94) return 94;
        if (current < 55) return current + 5;
        if (current < 80) return current + 2;
        return current + 1;
      });
    }, 500);
    try {
      const data = await predictBatch({ texts, user_id: user.id, source_url: 'CSV_Upload' });
      window.clearInterval(progressTimer);
      setProgress(100);
      setResults(data); setMessage({ type: 'success', text: `Đã phân tích và lưu ${data.length} bình luận.` });
      await new Promise((resolve) => window.setTimeout(resolve, 450));
    } catch (error) { setMessage({ type: 'error', text: error.message }); }
    finally { window.clearInterval(progressTimer); setLoading(false); }
  };

  const filtered = useMemo(() => results.filter((item) => item.text.toLowerCase().includes(query.toLowerCase())), [results, query]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const saveFeedback = async (correctedLabel) => {
    try {
      await submitFeedback({ original_content: editing.text, old_ai_label: editing.prediction, corrected_label: correctedLabel, user_id: user.id });
      setResults((current) => current.map((item) => item === editing ? { ...item, prediction: correctedLabel } : item));
      setEditing(null); setMessage({ type: 'success', text: 'Đã lưu đính chính thành công!' });
    } catch (error) { setMessage({ type: 'error', text: error.message }); }
  };

  return (
    <div className="space-y-6 p-2 text-slate-200 sm:p-4 lg:p-8">
      <header><h1 className="text-2xl font-semibold text-white">Dự đoán hàng loạt</h1><p className="mt-1 text-sm text-slate-400">Tải CSV, phân tích bằng AI và lưu kết quả vào Supabase</p></header>
      <section className="rounded-2xl border border-slate-700 bg-slate-800/50 p-5 sm:p-7">
        <input ref={inputRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => chooseFile(e.target.files?.[0])} />
        <button onClick={() => inputRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); chooseFile(e.dataTransfer.files?.[0]); }} className="grid min-h-48 w-full place-items-center rounded-xl border-2 border-dashed border-slate-600 bg-slate-900/30 p-6 text-center transition hover:border-indigo-500">
          <div><UploadCloud className="mx-auto mb-3 h-9 w-9 text-indigo-400" />{file ? <><p className="font-medium text-white">{file.name}</p><p className="mt-1 text-sm text-slate-400">{texts.length} bình luận</p></> : <><p className="font-medium text-white">Kéo thả hoặc chọn file CSV</p><p className="mt-1 text-sm text-slate-400">Cột text, content, comment hoặc cột đầu tiên</p></>}</div>
        </button>
        <div className="mt-4 flex justify-end"><button onClick={analyze} disabled={!texts.length || loading} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"><Sparkles className="h-4 w-4" />{loading ? 'Đang phân tích...' : 'Phân tích ngay'}</button></div>
        {loading && <div className="mt-5"><div className="mb-2 flex items-center justify-between gap-4 text-sm text-slate-400"><span>AI đang phân tích {texts.length} bình luận...</span><span className="shrink-0 font-mono text-indigo-300">{progress}%</span></div><div className="h-2.5 overflow-hidden rounded-full bg-slate-700"><div className="relative h-full overflow-hidden rounded-full bg-indigo-500 transition-[width] duration-500 ease-out" style={{ width: `${progress}%` }}><div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/35 to-transparent" /></div></div></div>}
      </section>
      {message.text && <div className={`flex items-center gap-2 rounded-xl border p-4 ${message.type === 'error' ? 'border-rose-500/30 bg-rose-500/10 text-rose-300' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'}`}>{message.type === 'success' && <CheckCircle2 className="h-5 w-5" />}{message.text}</div>}
      {results.length > 0 && <section className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-800/50">
        <div className="flex flex-col gap-3 border-b border-slate-700 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-medium text-white">Kết quả phân tích</h2><p className="text-sm text-slate-400">{results.length} bình luận</p></div><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Tìm bình luận..." className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2 pl-9 pr-3 text-sm outline-none sm:w-64" /></div></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-900/40 text-xs uppercase text-slate-400"><tr><th className="p-4">#</th><th className="p-4">Bình luận</th><th className="p-4">Nhãn</th><th className="p-4">Confidence</th><th className="p-4">Hành động</th></tr></thead><tbody className="divide-y divide-slate-700">{visible.map((item, index) => <tr key={`${item.text}-${index}`}><td className="p-4 text-slate-500">{(page - 1) * PAGE_SIZE + index + 1}</td><td className="max-w-xl p-4">{item.text}</td><td className="p-4"><Label value={item.prediction} /></td><td className="p-4 font-mono">{(item.confidence * 100).toFixed(1)}%</td><td className="p-4"><button onClick={() => setEditing(item)} className="flex items-center gap-1 rounded-lg border border-indigo-500/30 px-3 py-1.5 text-indigo-300"><Pencil className="h-3.5 w-3.5" />Sửa</button></td></tr>)}</tbody></table></div>
        <div className="flex items-center justify-between border-t border-slate-700 p-4 text-sm text-slate-400"><span>Trang {page}/{pageCount}</span><div className="flex gap-2"><button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg border border-slate-700 px-3 py-1.5 disabled:opacity-40">Trước</button><button onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={page === pageCount} className="rounded-lg border border-slate-700 px-3 py-1.5 disabled:opacity-40">Sau</button></div></div>
      </section>}
      {editing && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/75 p-4"><div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-800 p-6 shadow-2xl"><div className="flex justify-between"><h2 className="font-semibold text-white">Sửa nhãn AI</h2><button onClick={() => setEditing(null)}><X className="h-5 w-5" /></button></div><p className="my-5 rounded-xl bg-slate-900/60 p-4 text-sm">{editing.text}</p><div className="grid grid-cols-2 gap-3"><button onClick={() => saveFeedback(1)} className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-3 text-emerald-300">Tích cực</button><button onClick={() => saveFeedback(0)} className="rounded-xl border border-rose-500/30 bg-rose-500/10 py-3 text-rose-300">Tiêu cực</button></div></div></div>}
    </div>
  );
}

function Label({ value }) { const positive = Number(value) === 1; return <span className={`rounded-full border px-2.5 py-1 text-xs ${positive ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-rose-500/30 bg-rose-500/10 text-rose-400'}`}>{positive ? 'Tích cực' : 'Tiêu cực'}</span>; }
