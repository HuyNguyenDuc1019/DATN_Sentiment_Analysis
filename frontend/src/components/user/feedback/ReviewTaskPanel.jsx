import { AlertTriangle, CheckCircle2, RotateCcw, SkipForward } from 'lucide-react';

import FeedbackTaskSkeleton from './FeedbackTaskSkeleton';
import { getConfidencePercent, isLowConfidence, normalizeLabelToNumber } from '../../../utils/user/feedbackUtils';

export default function ReviewTaskPanel({
  item,
  onAcceptAI,
  onCorrectAI,
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
  const predictedLabel = positive ? 'Khách hài lòng' : 'Khách chưa hài lòng';
  const correctedLabel = positive ? 'Chưa hài lòng' : 'Hài lòng';

  return (
    <div className="flex min-h-[500px] flex-col rounded-2xl border border-slate-700 bg-slate-800/40 p-5 lg:p-7">
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-semibold ${lowConfidence ? 'bg-amber-500/10 text-amber-300' : 'bg-emerald-500/10 text-emerald-300'}`}>
          {lowConfidence ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          Độ chắc chắn {confidence}%
        </span>
        <span>#{item.id?.slice(0, 8)}</span>
        <span className="min-w-0 flex-1 truncate" title={item.source_url}>Nguồn: {item.source_url || 'Không xác định'}</span>
      </div>

      <div className="my-5 rounded-2xl border border-slate-700/70 bg-slate-950/35 p-5 lg:p-6">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Bình luận khách hàng</p>
        <p className="text-base font-medium leading-7 text-slate-200 lg:text-lg">“{item.content}”</p>
      </div>

      <div className="flex-1">
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-700/70 bg-slate-900/20 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">AI dự đoán</p>
            <div className={`mt-2 inline-flex items-center rounded-xl px-3.5 py-2 text-sm font-bold ${positive ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'}`}>
              {predictedLabel}
            </div>
          </div>
          <p className="max-w-xs text-xs leading-5 text-slate-500 sm:text-right">
            Chọn một trong hai hành động. Kết quả sẽ được lưu và tự chuyển sang bình luận tiếp theo.
          </p>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-700/70 p-4">
          <p className="text-center font-semibold text-white">AI phân loại đúng không?</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={onAcceptAI}
              disabled={saving}
              className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCircle2 className="h-5 w-5" />
              {saving ? 'Đang lưu...' : 'Đúng, sang bình luận tiếp'}
            </button>

            <button
              type="button"
              onClick={onCorrectAI}
              disabled={saving}
              className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-4 py-3 text-sm font-bold text-indigo-200 transition hover:bg-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCcw className="h-5 w-5" />
              Sai, đổi thành {correctedLabel}
            </button>
          </div>
        </div>
      </div>

      <button onClick={onSkip} className="mt-4 inline-flex items-center justify-center gap-2 self-center px-3 py-2 text-sm text-slate-500 transition hover:text-slate-200">
        <SkipForward className="h-4 w-4" /> Bỏ qua bình luận này
      </button>
    </div>
  );
}
