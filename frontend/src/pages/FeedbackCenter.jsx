import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, X, ThumbsUp, ThumbsDown, Send } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { submitFeedback } from '../services/api';
import { supabase } from '../services/supabaseClient';
import { confidenceRatio } from '../services/reviews';

export default function FeedbackCenterContent() {
  const { user } = useAuth();
  const [queue, setQueue] = useState([]);
  const [selected, setSelected] = useState(0);
  const [corrected, setCorrected] = useState(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('scraped_reviews')
      .select('id,content,ai_label,confidence,source_url,created_at')
      .eq('user_id', user.id)
      .order('confidence', { ascending: true })
      .limit(100);
    if (error) window.alert(error.message);
    else setQueue(data || []);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);
  const item = queue[selected];

  const skip = () => {
    if (!queue.length) return;
    setSelected((current) => (current + 1) % queue.length);
    setCorrected(null);
  };

  const save = async () => {
    if (!item) return;
    if (corrected === null) {
      window.alert('Vui lòng chọn nhãn đúng trước khi gửi chỉnh sửa.');
      return;
    }
    try {
      await submitFeedback({
        original_content: item.content,
        old_ai_label: Number(item.ai_label),
        corrected_label: corrected,
        user_id: user.id,
      });
      window.alert('Đã lưu đính chính thành công!');
      setQueue((current) => current.filter((_, index) => index !== selected));
      setSelected(0);
      setCorrected(null);
    } catch (error) {
      window.alert(error.message);
    }
  };

  return (
    <div className="p-8 h-full lg:h-[calc(100vh-5rem)] overflow-hidden flex flex-col animate-in fade-in duration-500 font-sans">
      <div className="mb-6 shrink-0">
        <h1 className="text-2xl font-semibold text-white tracking-wide mb-2">Trung tâm phản hồi</h1>
        <p className="text-slate-400 text-sm max-w-3xl leading-relaxed">Phản hồi có sự tham gia của con người. Xem lại và chỉnh sửa các dự đoán AI có độ tin cậy thấp để cải thiện độ chính xác của mô hình.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0 lg:overflow-hidden">
        <div className="lg:col-span-2 flex flex-col min-h-0">
          <ReviewTaskPanel item={item} corrected={corrected} setCorrected={setCorrected} onSave={save} onSkip={skip} />
        </div>
        <div className="lg:col-span-1 flex flex-col h-full min-h-0">
          <QueuePanel queue={queue} selected={selected} setSelected={(index) => { setSelected(index); setCorrected(null); }} />
        </div>
      </div>
    </div>
  );
}

function ReviewTaskPanel({ item, corrected, setCorrected, onSave, onSkip }) {
  if (!item) return <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl p-6 flex items-center justify-center h-full text-slate-400">Không có bình luận cần đánh giá.</div>;
  const confidence = (confidenceRatio(item.confidence) * 100).toFixed(1);
  const positive = Number(item.ai_label) === 1;

  return (
    <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl p-6 flex flex-col h-full min-h-0 relative overflow-hidden">
      <div className="flex items-center gap-6 pb-5 border-b border-slate-700/50 text-sm mb-6 shrink-0 min-w-0">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 border border-rose-500/20 rounded-md text-rose-400 font-medium"><AlertTriangle className="w-4 h-4" />Độ tin cậy thấp: {confidence}%</div>
        <div className="text-slate-400">Mã nhiệm vụ: <span className="text-slate-300 font-mono">#{item.id?.slice(0, 8)}</span></div>
        <div className="text-slate-400 flex-1 min-w-0 truncate" title={item.source_url || 'Không xác định'}>Nguồn: <span className="text-slate-300">{item.source_url || 'Không xác định'}</span></div>
      </div>

      <div className="mb-8 shrink-0">
        <h3 className="text-xs font-bold tracking-wider text-slate-500 uppercase mb-4">Văn bản đã phân tích</h3>
        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-6"><p className="text-lg text-slate-200 leading-relaxed font-medium">“{item.content}”</p></div>
      </div>

      <div className="flex-1 min-h-0">
        <h3 className="text-xs font-bold tracking-wider text-slate-500 uppercase mb-4">Xem lại dự đoán</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-5 relative group">
            <button onClick={onSkip} title="Bỏ qua" className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition-colors"><X className="w-5 h-5" /></button>
            <div className="text-xs text-slate-400 mb-2 font-medium">Nhãn AI hiện tại</div>
            <div className={`text-xl font-bold mb-2 ${positive ? 'text-emerald-400' : 'text-rose-400'}`}>{positive ? 'Tích cực' : 'Tiêu cực'}</div>
          </div>
          <div className="flex flex-col gap-3">
            <button onClick={() => setCorrected(1)} className={`flex-1 flex items-center justify-center gap-2 border border-emerald-500/30 ${corrected === 1 ? 'bg-emerald-500/20' : 'bg-emerald-500/5'} hover:bg-emerald-500/10 text-emerald-400 rounded-xl py-3 font-medium transition-colors`}><ThumbsUp className="w-5 h-5" />Tích cực</button>
            <button onClick={() => setCorrected(0)} className={`flex-1 flex items-center justify-center gap-2 border border-rose-500/30 ${corrected === 0 ? 'bg-rose-500/20' : 'bg-rose-500/5'} hover:bg-rose-500/10 text-rose-400 rounded-xl py-3 font-medium transition-colors`}><ThumbsDown className="w-5 h-5" />Tiêu cực</button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-6 mt-auto pt-6 border-t border-slate-700/50 shrink-0">
        <button onClick={onSkip} className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Bỏ qua</button>
        <button onClick={onSave} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-6 rounded-xl transition-colors shadow-lg shadow-indigo-600/20">Gửi chỉnh sửa<Send className="w-4 h-4 ml-1" /></button>
      </div>
    </div>
  );
}

function QueuePanel({ queue, selected, setSelected }) {
  return (
    <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl flex flex-col h-full min-h-0 overflow-hidden">
      <div className="p-5 border-b border-slate-700 shrink-0"><h2 className="text-lg font-medium text-white mb-1">Hàng đợi xử lý</h2><p className="text-xs text-slate-400">{queue.length} mục cần đánh giá</p></div>
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">{queue.map((entry, index) => <QueueItem key={entry.id} data={entry} active={index === selected} onClick={() => setSelected(index)} />)}</div>
      <div className="p-4 border-t border-slate-700 bg-slate-800/80 shrink-0"><button className="w-full text-sm font-medium text-slate-300 hover:text-white transition-colors py-2 text-center">Xem tất cả nhiệm vụ đang chờ</button></div>
    </div>
  );
}

function QueueItem({ data, active, onClick }) {
  const confidenceValue = confidenceRatio(data.confidence);
  const confidence = (confidenceValue * 100).toFixed(1);
  const isReliable = confidenceValue >= 0.7;
  const time = formatRelativeTime(data.created_at);
  return (
    <button onClick={onClick} className={`w-full p-4 rounded-xl border transition-all cursor-pointer text-left ${active ? 'bg-indigo-900/20 border-indigo-500/50 shadow-sm shadow-indigo-500/10' : 'bg-transparent border-slate-700 hover:bg-slate-700/30'}`}>
      <p className={`text-sm mb-3 line-clamp-2 leading-relaxed ${active ? 'text-slate-200' : 'text-slate-400'}`}>{data.content}</p>
      <div className="flex items-end justify-between gap-3">
        <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border ${isReliable ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>Độ tin cậy: {confidence}%</span>
        <span className="text-[11px] text-slate-500 shrink-0">{time}</span>
      </div>
    </button>
  );
}

function formatRelativeTime(createdAt) {
  if (!createdAt) return '';
  const createdTime = new Date(createdAt).getTime();
  if (Number.isNaN(createdTime)) return '';

  const diffSeconds = Math.max(0, Math.floor((Date.now() - createdTime) / 1000));
  if (diffSeconds < 60) return 'Vừa xong';

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}p trước`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h trước`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} ngày trước`;

  return new Date(createdAt).toLocaleDateString('vi-VN');
}
