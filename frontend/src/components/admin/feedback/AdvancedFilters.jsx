import {
  CONFIDENCE_BUCKETS,
  MISMATCH_OPTIONS,
} from '../../../utils/admin/feedbackUtils';

export default function AdvancedFilters({
  confidenceFilter,
  mismatchFilter,
  dateFrom,
  dateTo,
  onConfidenceFilterChange,
  onMismatchFilterChange,
  onDateFromChange,
  onDateToChange,
  onResetFilters,
}) {
  return (
    <div className="grid grid-cols-1 gap-3 px-5 py-4 border-b border-slate-700/50 bg-slate-900/20 sm:grid-cols-2 lg:grid-cols-5">
      <div className="flex flex-col gap-1">
        <label className="text-[11px] uppercase tracking-wider text-slate-500">Độ tin cậy AI</label>
        <select
          value={confidenceFilter}
          onChange={(event) => onConfidenceFilterChange(event.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
        >
          {Object.entries(CONFIDENCE_BUCKETS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[11px] uppercase tracking-wider text-slate-500">Sai khác nhãn</label>
        <select
          value={mismatchFilter}
          onChange={(event) => onMismatchFilterChange(event.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
        >
          {Object.entries(MISMATCH_OPTIONS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[11px] uppercase tracking-wider text-slate-500">Từ ngày</label>
        <input
          type="date"
          value={dateFrom}
          onChange={(event) => onDateFromChange(event.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[11px] uppercase tracking-wider text-slate-500">Đến ngày</label>
        <input
          type="date"
          value={dateTo}
          onChange={(event) => onDateToChange(event.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
        />
      </div>

      <div className="flex items-end">
        <button
          onClick={onResetFilters}
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-rose-500 hover:text-rose-400 transition-colors"
        >
          Reset Filter
        </button>
      </div>
    </div>
  );
}
