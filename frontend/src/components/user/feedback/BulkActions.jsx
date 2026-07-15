import { CheckCheck, ChevronLeft, ChevronRight, SkipForward, ThumbsDown, ThumbsUp } from 'lucide-react';

export default function BulkActions({
  queue,
  visibleQueue,
  selectedIds,
  selectedReviews,
  labelFilter,
  pagePositiveCount,
  pageNegativeCount,
  saving,
  canGoPrevious,
  canGoNext,
  onLabelFilterChange,
  onToggleSelectAllPage,
  onAcceptWholePageAsCorrect,
  onAcceptSelectedAsCorrect,
  onCorrectSelectedAs,
  onSkipSelected,
  onPreviousPage,
  onNextPage,
}) {
  const allSelected = visibleQueue.length > 0 && visibleQueue.every((review) => selectedIds.has(review.id));
  const hasSelection = selectedReviews.length > 0;

  return (
    <div className="mb-5 rounded-2xl border border-slate-700/70 bg-slate-800/35 p-3">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap gap-2">
          <Filter active={labelFilter === 'all'} onClick={() => onLabelFilterChange('all')}>
            Tất cả {queue.length}
          </Filter>
          <Filter active={labelFilter === 'positive'} onClick={() => onLabelFilterChange('positive')}>
            Hài lòng {pagePositiveCount}
          </Filter>
          <Filter active={labelFilter === 'negative'} onClick={() => onLabelFilterChange('negative')}>
            Chưa hài lòng {pageNegativeCount}
          </Filter>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={onPreviousPage} disabled={!canGoPrevious || saving} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:opacity-40" aria-label="Trang trước">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" onClick={onNextPage} disabled={!canGoNext || saving} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:opacity-40" aria-label="Trang sau">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-700/60 pt-3">
        <button type="button" onClick={onToggleSelectAllPage} disabled={!visibleQueue.length || saving} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-40">
          {allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
        </button>

        {hasSelection ? (
          <>
            <span className="px-1 text-xs font-semibold text-indigo-300">Đã chọn {selectedReviews.length}</span>
            <Action icon={CheckCheck} onClick={onAcceptSelectedAsCorrect} disabled={saving}>AI đúng</Action>
            <Action icon={ThumbsUp} onClick={() => onCorrectSelectedAs(1)} disabled={saving}>Sửa thành Hài lòng</Action>
            <Action icon={ThumbsDown} onClick={() => onCorrectSelectedAs(0)} disabled={saving}>Sửa thành Chưa hài lòng</Action>
            <Action icon={SkipForward} onClick={onSkipSelected} disabled={saving}>Bỏ qua</Action>
          </>
        ) : (
          <button type="button" onClick={onAcceptWholePageAsCorrect} disabled={!visibleQueue.length || saving} className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/15 disabled:opacity-40">
            Xác nhận AI đúng cho trang này
          </button>
        )}
      </div>
    </div>
  );
}

function Filter({ active, onClick, children }) {
  return <button type="button" onClick={onClick} className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${active ? 'bg-indigo-600 text-white' : 'bg-slate-900/50 text-slate-400 hover:text-white'}`}>{children}</button>;
}

function Action({ icon: Icon, onClick, disabled, children }) {
  return <button type="button" onClick={onClick} disabled={disabled} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-40"><Icon className="h-4 w-4" />{children}</button>;
}
