import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, Send, ThumbsDown, ThumbsUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { submitFeedback } from '../services/api';
import { supabase } from '../services/supabaseClient';
import { confidenceRatio } from '../services/reviews';

export default function FeedbackCenter() {
  const { user } = useAuth();
  const [queue, setQueue] = useState([]);
  const [index, setIndex] = useState(0);
  const [corrected, setCorrected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data, error } = await supabase.from('scraped_reviews').select('id,content,ai_label,confidence,source_url').eq('user_id', user.id).order('confidence', { ascending: true }).limit(100);
    if (!error) { setQueue(data || []); setIndex(0); }
    else setMessage(error.message);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);
  const item = queue[index];

  const save = async () => {
    if (!item || corrected === null) return;
    setSaving(true); setMessage('');
    try {
      await submitFeedback({ original_content: item.content, old_ai_label: Number(item.ai_label), corrected_label: corrected, user_id: user.id });
      setMessage('Đã lưu đính chính thành công!'); setCorrected(null);
      setQueue((current) => current.filter((_, position) => position !== index));
      setIndex((current) => Math.max(0, Math.min(current, queue.length - 2)));
    } catch (error) { setMessage(error.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 p-2 text-slate-200 sm:p-4 lg:p-8">
      <header><h1 className="text-2xl font-semibold text-white">Trung tâm phản hồi</h1><p className="mt-1 max-w-3xl text-sm text-slate-400">Các dự đoán có confidence thấp được đưa lên trước để bạn kiểm tra và sửa nhãn.</p></header>
      {message && <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-300"><CheckCircle2 className="h-5 w-5" />{message}</div>}
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-700 bg-slate-800/50 p-5 sm:p-7 lg:col-span-2">
          {loading ? <p className="py-20 text-center text-slate-400">Đang tải dữ liệu...</p> : !item ? <p className="py-20 text-center text-slate-400">Không còn bình luận cần kiểm tra.</p> : <>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 pb-5"><span className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-sm text-amber-300">Độ tin cậy: {(confidenceRatio(item.confidence) * 100).toFixed(1)}%</span><span className="text-sm text-slate-500">{index + 1}/{queue.length}</span></div>
            <div className="my-7"><p className="mb-3 text-xs uppercase text-slate-500">Văn bản đã phân tích</p><p className="rounded-xl border border-slate-700 bg-slate-900/50 p-6 text-lg leading-relaxed">{item.content}</p></div>
            <div className="grid gap-5 md:grid-cols-2"><div className="rounded-xl border border-slate-700 bg-slate-900/50 p-5"><p className="text-xs text-slate-400">Nhãn AI hiện tại</p><p className={`mt-2 text-xl font-bold ${Number(item.ai_label) === 1 ? 'text-emerald-400' : 'text-rose-400'}`}>{Number(item.ai_label) === 1 ? 'Tích cực' : 'Tiêu cực'}</p></div><div className="grid grid-cols-2 gap-3"><button onClick={() => setCorrected(1)} className={`rounded-xl border py-3 ${corrected === 1 ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300' : 'border-slate-700 text-slate-300'}`}><ThumbsUp className="mx-auto mb-2 h-5 w-5" />Tích cực</button><button onClick={() => setCorrected(0)} className={`rounded-xl border py-3 ${corrected === 0 ? 'border-rose-400 bg-rose-500/20 text-rose-300' : 'border-slate-700 text-slate-300'}`}><ThumbsDown className="mx-auto mb-2 h-5 w-5" />Tiêu cực</button></div></div>
            <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-slate-700 pt-5"><div className="flex gap-2"><button onClick={() => { setIndex((i) => Math.max(0, i - 1)); setCorrected(null); }} disabled={index === 0} className="rounded-lg border border-slate-700 p-2 disabled:opacity-30"><ChevronLeft className="h-5 w-5" /></button><button onClick={() => { setIndex((i) => Math.min(queue.length - 1, i + 1)); setCorrected(null); }} disabled={index >= queue.length - 1} className="rounded-lg border border-slate-700 p-2 disabled:opacity-30"><ChevronRight className="h-5 w-5" /></button></div><button onClick={save} disabled={corrected === null || saving} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-medium text-white disabled:opacity-50"><Send className="h-4 w-4" />{saving ? 'Đang lưu...' : 'Gửi chỉnh sửa'}</button></div>
          </>}
        </section>
        <aside className="rounded-2xl border border-slate-700 bg-slate-800/50 p-5"><h2 className="font-medium text-white">Hàng đợi xử lý</h2><p className="mt-1 text-sm text-slate-400">{queue.length} mục</p><div className="mt-4 max-h-[560px] space-y-2 overflow-y-auto">{queue.map((review, position) => <button key={review.id} onClick={() => { setIndex(position); setCorrected(null); }} className={`w-full rounded-xl border p-3 text-left ${position === index ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 hover:bg-slate-700/30'}`}><p className="line-clamp-2 text-sm">{review.content}</p><p className="mt-2 text-xs text-slate-500">Confidence {(confidenceRatio(review.confidence) * 100).toFixed(1)}%</p></button>)}</div></aside>
      </div>
    </div>
  );
}
