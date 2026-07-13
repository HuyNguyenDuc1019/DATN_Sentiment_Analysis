import { ChevronLeft, ChevronRight } from 'lucide-react';


export default function PaginationControls({
  page,
  canPrevious,
  canNext,
  onPrevious,
  onNext,
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onPrevious}
        disabled={!canPrevious}
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-700 px-3 text-sm font-medium text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" />
        Trang trước
      </button>

      <span className="flex h-9 min-w-9 items-center justify-center rounded-lg bg-indigo-600 px-3 text-sm font-bold text-white">
        {page}
      </span>

      <button
        type="button"
        onClick={onNext}
        disabled={!canNext}
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-700 px-3 text-sm font-medium text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Trang sau
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
