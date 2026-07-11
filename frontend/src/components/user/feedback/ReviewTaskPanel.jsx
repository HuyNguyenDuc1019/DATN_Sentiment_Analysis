import { AlertTriangle, Check, CheckCircle2, Send, SkipForward } from 'lucide-react';

import LabelButton from './LabelButton';
import FeedbackTaskSkeleton from './FeedbackTaskSkeleton';
import { getConfidencePercent, isLowConfidence, normalizeLabelToNumber } from '../../../utils/user/feedbackUtils';

export default function ReviewTaskPanel({
  item,
  corrected,
  setCorrected,
  onSave,
  onAcceptAI,
  onSkip,
  loading,
  saving,
  confidenceThresholdRatio,
}) {
  if (loading && !item) return <FeedbackTaskSkeleton />;

  if (!item) {
    return (
      <div className="flex min-h-[480px] items-center justify-center rounded-2xl border border-slate-700 bg-slate-800/40 p-6 text-center text-slate-400">
        {loading ? 'Đang tải bình luận...' : 'Bạn đã xử lý hết bình luận trong danh sách.'}
      </div>
    );
  }

  const confidence = getConfidencePercent(item.confidence);
  const positive = normalizeLabelToNumber(item.ai_label) === 1;
  const lowConfidence = isLowConfidence(item.confidence, confidenceThresholdRatio);

  return (
    <div className="flex min-h-[520px] flex-col rounded-2xl border border-slate-700 bg-slate-800/40 p-5 lg:p-7">
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-semibold ${lowConfidence ? 'bg-amber-500/10 text-amber-300' : 'bg-emerald-500/10 text-emerald-300'}`}>
          {lowConfidence ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          Độ chắc chắn {confidence}%
        </span>
        <span>#{item.id?.slice(0, 8)}</span>
        <span className="min-w-0 flex-1 truncate" title={item.source_url}>Nguồn: {item.source_url || 'Không xác định'}</span>
      </div>

      <div className="my-6 rounded-2xl border border-slate-700/70 bg-slate-950/35 p-5 lg:p-6">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Bình luận khách hàng</p>
        <p className="text-base font-medium leading-7 text-slate-200 lg:text-lg">“{item.content}”</p>
      </div>

      <div className="flex-1">
        <p className="text-sm font-semibold text-slate-300">AI dự đoán</p>
        <div className={`mt-3 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-base font-bold ${positive ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'}`}>
          {positive ? 'Khách hài lòng' : 'Khách chưa hài lòng'}
        </div>

        <div className="mt-6 rounded-2xl border border-slate-700/70 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-white">Kết quả này có đúng không?</p>
              <p className="mt-1 text-xs text-slate-500">Xác nhận để chuyển ngay sang bình luận tiếp theo.</p>
            </div>
            <button onClick={onAcceptAI} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50">
              <Check className="h-4 w-4" /> Đúng, tiếp tục
            </button>
          </div>

          <div className="my-4 flex items-center gap-3"><div className="h-px flex-1 bg-slate-700/70" /><span className="text-xs text-slate-500">Nếu AI đoán sai</span><div className="h-px flex-1 bg-slate-700/70" /></div>

          <div className="grid gap-3 sm:grid-cols-2">
            <LabelButton type="positive" active={corrected === 1} onClick={() => setCorrected(1)} />
            <LabelButton type="negative" active={corrected === 0} onClick={() => setCorrected(0)} />
          </div>

          {corrected !== null && (
            <button onClick={onSave} disabled={saving} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-500 disabled:opacity-50">
              <Send className="h-4 w-4" /> {saving ? 'Đang lưu...' : 'Lưu nhãn đã sửa'}
            </button>
          )}
        </div>
      </div>

      <button onClick={onSkip} className="mt-4 inline-flex items-center justify-center gap-2 self-center px-3 py-2 text-sm text-slate-500 transition hover:text-slate-200">
        <SkipForward className="h-4 w-4" /> Bỏ qua bình luận này
      </button>
    </div>
  );
}
