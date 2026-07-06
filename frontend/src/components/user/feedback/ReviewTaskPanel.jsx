import { AlertTriangle, CheckCircle2, Send, X } from 'lucide-react';

import LabelButton from './LabelButton';
import FeedbackTaskSkeleton from './FeedbackTaskSkeleton';

import {
  getConfidencePercent,
  isLowConfidence,
  normalizeLabelToNumber,
} from '../../../utils/user/feedbackUtils';

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

  const confidence = getConfidencePercent(item.confidence);
  const positive = normalizeLabelToNumber(item.ai_label) === 1;
  const lowConfidence = isLowConfidence(item.confidence, confidenceThresholdRatio);

  return (
    <div className="relative flex min-h-[520px] flex-col rounded-2xl border border-slate-700 bg-slate-800/50 p-5 backdrop-blur-md lg:p-6">
      <div className="mb-6 flex min-w-0 shrink-0 flex-wrap items-center gap-3 border-b border-slate-700/50 pb-5 text-sm lg:gap-6">
        <div
          className={`flex items-center gap-2 rounded-md border px-3 py-1.5 font-medium ${
            lowConfidence
              ? 'border-rose-500/20 bg-rose-500/10 text-rose-400'
              : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
          }`}
        >
          {lowConfidence ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          {lowConfidence ? 'Độ chắc chắn thấp' : 'Độ chắc chắn cao'}: {confidence}%
        </div>

        <div className="text-slate-400">
          Mã phản hồi: <span className="font-mono text-slate-300">#{item.id?.slice(0, 8)}</span>
        </div>

        <div className="min-w-[180px] flex-1 truncate text-slate-400" title={item.source_url || 'Không xác định'}>
          Nguồn: <span className="text-slate-300">{item.source_url || 'Không xác định'}</span>
        </div>
      </div>

      <div className="mb-8 shrink-0">
        <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-500">Nội dung khách hàng</h3>
        <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-6">
          <p className="text-base font-medium leading-relaxed text-slate-200 lg:text-lg">"{item.content}"</p>
        </div>
      </div>

      <div className="flex-1">
        <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-500">Kết quả hiện tại</h3>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="group relative rounded-xl border border-slate-700 bg-slate-900/50 p-5">
            <button onClick={onSkip} title="Bỏ qua" className="absolute right-4 top-4 text-slate-500 transition-colors hover:text-slate-300">
              <X className="h-5 w-5" />
            </button>
            <div className="mb-2 text-xs font-medium text-slate-400">AI đang dự đoán là</div>
            <div className={`mb-2 text-xl font-bold ${positive ? 'text-emerald-400' : 'text-rose-400'}`}>
              {positive ? 'Khách hài lòng' : 'Khách chưa hài lòng'}
            </div>
            <p className="text-sm text-slate-500">
              Bấm “AI đúng” nếu dự đoán này đúng. Nếu sai, chọn nhãn đúng ở bên cạnh rồi gửi đính chính.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <LabelButton type="positive" active={corrected === 1} onClick={() => setCorrected(1)} />
            <LabelButton type="negative" active={corrected === 0} onClick={() => setCorrected(0)} />
          </div>
        </div>
      </div>

      <div className="mt-6 flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-slate-700/50 pt-5">
        <button onClick={onSkip} className="text-sm font-medium text-slate-400 transition-colors hover:text-white">
          Bỏ qua
        </button>
        <button
          onClick={onAcceptAI}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-2.5 font-medium text-emerald-300 transition-colors hover:bg-emerald-500/15 disabled:opacity-60"
        >
          AI đúng
          <CheckCircle2 className="ml-1 h-4 w-4" />
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 font-medium text-white shadow-lg shadow-indigo-600/20 transition-colors hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? 'Đang lưu...' : 'Gửi nhãn đã sửa'}
          <Send className="ml-1 h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
