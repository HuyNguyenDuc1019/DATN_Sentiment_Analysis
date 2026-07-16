import { Loader2, RefreshCw, Save, Scale } from 'lucide-react';

export default function CompareHeader({
  results,
  isSaving,
  onReset,
  onSaveComparison,
}) {
  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
      <div>
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-500/25 bg-indigo-500/10 px-3 py-1 text-xs font-bold text-indigo-300">
          <Scale className="h-4 w-4" />
          So sánh tạm thời, không làm nhiễu Dashboard
        </div>

        <h1 className="text-2xl font-semibold tracking-wide text-white">So sánh nhiều quán</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          Nhập 2 đến 3 link quán để hệ thống phân tích bình luận, đối chiếu điểm mạnh/yếu và đưa ra lời khuyên chọn quán.
          Kết quả mặc định chỉ dùng cho so sánh, không lưu vào dữ liệu Dashboard.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
        >
          <RefreshCw className="h-4 w-4" />
          Làm mới
        </button>

        <button
          type="button"
          onClick={onSaveComparison}
          disabled={!results.length || isSaving}
          className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-950/20 transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Lưu so sánh
        </button>
      </div>
    </div>
  );
}
