import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Send,
  ThumbsDown,
  ThumbsUp,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { submitFeedback } from '../services/api';
import { supabase } from '../services/supabaseClient';
import { confidenceRatio } from '../services/reviews';

export default function FeedbackCenterContent() {
  const { user } = useAuth();
  const [queue, setQueue] = useState([]);
  const [selected, setSelected] = useState(0);
  const [corrected, setCorrected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadQueue = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('scraped_reviews')
        .select('id,content,ai_label,confidence,source_url,created_at')
        .eq('user_id', user.id)
        .order('confidence', { ascending: true })
        .limit(100);

      if (error) throw error;

      const ignoredIds = getIgnoredReviewIds(user.id);
      setQueue((data || []).filter((review) => !ignoredIds.has(review.id)));
      setSelected(0);
      setCorrected(null);
    } catch (error) {
      toast.error(error.message || 'Không tải được danh sách phản hồi.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const item = queue[selected];

  const skipFeedback = () => {
    if (!item || !user?.id) return;
    rememberIgnoredReview(user.id, item.id);
    setQueue((current) => current.filter((review) => review.id !== item.id));
    setSelected((current) => Math.max(0, Math.min(current, queue.length - 2)));
    setCorrected(null);
  };

  const saveFeedback = async () => {
    if (!item || !user?.id) return;
    if (corrected === null) {
      toast.error('Vui lòng chọn đánh giá đúng trước khi gửi.');
      return;
    }

    setSaving(true);
    try {
      await submitFeedback({
        original_content: item.content,
        old_ai_label: Number(item.ai_label),
        corrected_label: corrected,
        user_id: user.id,
      });

      toast.success('Đã lưu đính chính thành công!');
      setQueue((current) => current.filter((_, index) => index !== selected));
      setSelected(0);
      setCorrected(null);
    } catch (error) {
      toast.error(error.message || 'Không lưu được đính chính.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden p-8 font-sans animate-in fade-in duration-500 lg:h-[calc(100vh-5rem)]">
      <div className="mb-6 shrink-0">
        <h1 className="mb-2 text-2xl font-semibold tracking-wide text-white">Trung tâm phản hồi</h1>
        <p className="max-w-3xl text-sm leading-relaxed text-slate-400">
          Xem lại những phản hồi có độ chắc chắn thấp và gửi đính chính để hệ thống hiểu khách hàng tốt hơn.
        </p>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-3 lg:overflow-hidden">
        <div className="flex min-h-0 flex-col lg:col-span-2">
          <ReviewTaskPanel
            item={item}
            corrected={corrected}
            setCorrected={setCorrected}
            onSave={saveFeedback}
            onSkip={skipFeedback}
            loading={loading}
            saving={saving}
          />
        </div>
        <div className="flex h-full min-h-0 flex-col lg:col-span-1">
          <QueuePanel
            queue={queue}
            selected={selected}
            loading={loading}
            setSelected={(index) => {
              setSelected(index);
              setCorrected(null);
            }}
          />
        </div>
      </div>
    </div>
  );
}

function ReviewTaskPanel({ item, corrected, setCorrected, onSave, onSkip, loading, saving }) {
  if (loading && !item) {
    return <FeedbackTaskSkeleton />;
  }

  if (!item) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-slate-700 bg-slate-800/50 p-6 text-center text-slate-400 backdrop-blur-md">
        {loading ? 'Đang tải phản hồi cần xem lại...' : 'Không có phản hồi cần xử lý.'}
      </div>
    );
  }

  const confidence = (confidenceRatio(item.confidence) * 100).toFixed(1);
  const positive = Number(item.ai_label) === 1;

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-md">
      <div className="mb-6 flex min-w-0 shrink-0 items-center gap-6 border-b border-slate-700/50 pb-5 text-sm">
        <div className="flex items-center gap-2 rounded-md border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 font-medium text-rose-400">
          <AlertTriangle className="h-4 w-4" />
          Độ chắc chắn thấp: {confidence}%
        </div>
        <div className="text-slate-400">
          Mã phản hồi: <span className="font-mono text-slate-300">#{item.id?.slice(0, 8)}</span>
        </div>
        <div className="min-w-0 flex-1 truncate text-slate-400" title={item.source_url || 'Không xác định'}>
          Nguồn: <span className="text-slate-300">{item.source_url || 'Không xác định'}</span>
        </div>
      </div>

      <div className="mb-8 shrink-0">
        <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-500">Nội dung khách hàng</h3>
        <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-6">
          <p className="text-lg font-medium leading-relaxed text-slate-200">"{item.content}"</p>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-500">Kết quả hiện tại</h3>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="group relative rounded-xl border border-slate-700 bg-slate-900/50 p-5">
            <button onClick={onSkip} title="Bỏ qua" className="absolute right-4 top-4 text-slate-500 transition-colors hover:text-slate-300">
              <X className="h-5 w-5" />
            </button>
            <div className="mb-2 text-xs font-medium text-slate-400">Đang được ghi nhận là</div>
            <div className={`mb-2 text-xl font-bold ${positive ? 'text-emerald-400' : 'text-rose-400'}`}>
              {positive ? 'Khách hài lòng' : 'Khách chưa hài lòng'}
            </div>
            <p className="text-sm text-slate-500">
              Nếu kết quả này chưa đúng, hãy chọn lại bên cạnh.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <LabelButton type="positive" active={corrected === 1} onClick={() => setCorrected(1)} />
            <LabelButton type="negative" active={corrected === 0} onClick={() => setCorrected(0)} />
          </div>
        </div>
      </div>

      <div className="mt-auto flex shrink-0 items-center justify-end gap-6 border-t border-slate-700/50 pt-6">
        <button onClick={onSkip} className="text-sm font-medium text-slate-400 transition-colors hover:text-white">
          Bỏ qua
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 font-medium text-white shadow-lg shadow-indigo-600/20 transition-colors hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? 'Đang lưu...' : 'Gửi đính chính'}
          <Send className="ml-1 h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function LabelButton({ type, active, onClick }) {
  const isPositive = type === 'positive';
  const Icon = isPositive ? ThumbsUp : ThumbsDown;
  const text = isPositive ? 'Khách hài lòng' : 'Khách chưa hài lòng';

  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 font-semibold transition-all ${
        active
          ? isPositive
            ? 'border-emerald-400 bg-emerald-500/30 text-emerald-100 ring-2 ring-emerald-400/25'
            : 'border-rose-400 bg-rose-500/30 text-rose-100 ring-2 ring-rose-400/25'
          : isPositive
            ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400 hover:border-emerald-400/60 hover:bg-emerald-500/12'
            : 'border-rose-500/30 bg-rose-500/5 text-rose-400 hover:border-rose-400/60 hover:bg-rose-500/12'
      }`}
    >
      <Icon className={`h-5 w-5 ${active ? 'fill-current' : ''}`} />
      {text}
    </button>
  );
}

function QueuePanel({ queue, selected, setSelected, loading }) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-800/50 backdrop-blur-md">
      <div className="shrink-0 border-b border-slate-700 p-5">
        <h2 className="mb-1 text-lg font-medium text-white">Hàng đợi xử lý</h2>
        <p className="text-xs text-slate-400">{loading ? 'Đang tải...' : `${queue.length} mục cần xem lại`}</p>
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {loading ? (
          <QueueSkeleton />
        ) : (
          queue.map((entry, index) => (
            <QueueItem key={entry.id} data={entry} active={index === selected} onClick={() => setSelected(index)} />
          ))
        )}
        {!loading && !queue.length && (
          <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-5 text-center text-sm text-slate-400">
            Chưa có phản hồi nào cần xem lại.
          </div>
        )}
      </div>
      <div className="shrink-0 border-t border-slate-700 bg-slate-800/80 p-4">
        <div className="flex items-center justify-center gap-2 py-2 text-sm font-medium text-slate-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          Dữ liệu đính chính sẽ được lưu vào feedback_data
        </div>
      </div>
    </div>
  );
}

function FeedbackTaskSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-md">
      <div className="mb-6 flex gap-4 border-b border-slate-700/50 pb-5">
        <div className="h-9 w-48 animate-pulse rounded-lg bg-slate-700/70" />
        <div className="h-9 w-40 animate-pulse rounded-lg bg-slate-700/50" />
      </div>
      <div className="mb-8 space-y-4">
        <div className="h-4 w-44 animate-pulse rounded bg-slate-700/50" />
        <div className="h-24 animate-pulse rounded-xl border border-slate-700/50 bg-slate-900/50" />
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="h-28 animate-pulse rounded-xl border border-slate-700 bg-slate-900/50" />
        <div className="space-y-3">
          <div className="h-14 animate-pulse rounded-xl border border-slate-700 bg-slate-900/50" />
          <div className="h-14 animate-pulse rounded-xl border border-slate-700 bg-slate-900/50" />
        </div>
      </div>
    </div>
  );
}

function QueueSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2, 3, 4].map((item) => (
        <div key={item} className="rounded-xl border border-slate-700 bg-slate-900/40 p-4">
          <div className="mb-3 h-4 w-full animate-pulse rounded bg-slate-700/60" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-slate-700/40" />
        </div>
      ))}
    </div>
  );
}

function QueueItem({ data, active, onClick }) {
  const confidenceValue = confidenceRatio(data.confidence);
  const confidence = (confidenceValue * 100).toFixed(1);
  const isReliable = confidenceValue >= 0.7;
  const time = formatRelativeTime(data.created_at);

  return (
    <button
      onClick={onClick}
      className={`w-full cursor-pointer rounded-xl border p-4 text-left transition-all ${
        active ? 'border-indigo-500/50 bg-indigo-900/20 shadow-sm shadow-indigo-500/10' : 'border-slate-700 bg-transparent hover:bg-slate-700/30'
      }`}
    >
      <p className={`mb-3 line-clamp-2 text-sm leading-relaxed ${active ? 'text-slate-200' : 'text-slate-400'}`}>{data.content}</p>
      <div className="flex items-end justify-between gap-3">
        <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${isReliable ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border-rose-500/20 bg-rose-500/10 text-rose-400'}`}>
          Độ chắc chắn: {confidence}%
        </span>
        <span className="shrink-0 text-[11px] text-slate-500">{time}</span>
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

function ignoredStorageKey(userId) {
  return `ignored-feedback-reviews:${userId}`;
}

function getIgnoredReviewIds(userId) {
  try {
    const saved = JSON.parse(localStorage.getItem(ignoredStorageKey(userId)) || '[]');
    return new Set(Array.isArray(saved) ? saved : []);
  } catch {
    return new Set();
  }
}

function rememberIgnoredReview(userId, reviewId) {
  const ignoredIds = getIgnoredReviewIds(userId);
  ignoredIds.add(reviewId);
  localStorage.setItem(ignoredStorageKey(userId), JSON.stringify([...ignoredIds]));
}
