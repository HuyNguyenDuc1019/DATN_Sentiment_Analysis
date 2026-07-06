import { ChevronLeft, ChevronRight } from 'lucide-react';

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
  const allVisibleSelected = visibleQueue.length > 0 && visibleQueue.every((review) => selectedIds.has(review.id));

  return (
    <div className="mb-4 space-y-3 overflow-x-auto pb-1">
      <div className="rounded-xl border border-slate-700/70 bg-slate-950/30 p-3 text-xs leading-5 text-slate-400">
        <b className="text-slate-200">Cách dùng:</b> Tick các dòng bên phải rồi chọn hành động bên dưới.
        “AI đúng” nghĩa là bạn xác nhận kết quả hiện tại của AI là đúng.
        “Sửa thành Hài lòng/Chưa hài lòng” dùng khi AI đoán sai.
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-slate-700/70 bg-slate-950/20 p-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap gap-2">
          <FilterButton
            active={labelFilter === 'all'}
            label={`Tất cả (${queue.length})`}
            onClick={() => onLabelFilterChange('all')}
          />

          <FilterButton
            active={labelFilter === 'positive'}
            label={`AI ghi Hài lòng (${pagePositiveCount})`}
            tone="positive"
            onClick={() => onLabelFilterChange('positive')}
          />

          <FilterButton
            active={labelFilter === 'negative'}
            label={`AI ghi Chưa hài lòng (${pageNegativeCount})`}
            tone="negative"
            onClick={() => onLabelFilterChange('negative')}
          />
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 font-semibold text-emerald-300">
            Hài lòng: {pagePositiveCount}
          </span>
          <span className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 font-semibold text-rose-300">
            Chưa hài lòng: {pageNegativeCount}
          </span>
          <span className="rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-3 py-2 font-semibold text-indigo-300">
            Đang tick: {selectedReviews.length}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <ActionButton onClick={onToggleSelectAllPage} disabled={!visibleQueue.length || saving}>
          {allVisibleSelected ? 'Bỏ tick các dòng đang hiển thị' : 'Tick các dòng đang hiển thị'}
        </ActionButton>

        <ActionButton tone="positive" onClick={onAcceptWholePageAsCorrect} disabled={!visibleQueue.length || saving}>
          AI đúng các dòng đang hiện
        </ActionButton>

        <ActionButton tone="positive" onClick={onAcceptSelectedAsCorrect} disabled={!selectedReviews.length || saving}>
          AI đúng dòng đã tick
        </ActionButton>

        <ActionButton tone="sky" onClick={() => onCorrectSelectedAs(1)} disabled={!selectedReviews.length || saving}>
          Sửa dòng tick → Hài lòng
        </ActionButton>

        <ActionButton tone="negative" onClick={() => onCorrectSelectedAs(0)} disabled={!selectedReviews.length || saving}>
          Sửa dòng tick → Chưa hài lòng
        </ActionButton>

        <ActionButton onClick={onSkipSelected} disabled={!selectedReviews.length || saving}>
          Bỏ qua dòng tick
        </ActionButton>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onPreviousPage}
            disabled={!canGoPrevious || saving}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
            Trang trước
          </button>

          <button
            type="button"
            onClick={onNextPage}
            disabled={!canGoNext || saving}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
          >
            Trang sau
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function FilterButton({ active, label, tone = 'default', onClick }) {
  const activeClass =
    tone === 'positive'
      ? 'bg-emerald-600 text-white'
      : tone === 'negative'
        ? 'bg-rose-600 text-white'
        : 'bg-indigo-600 text-white';

  const inactiveClass =
    tone === 'positive'
      ? 'border border-emerald-500/25 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15'
      : tone === 'negative'
        ? 'border border-rose-500/25 bg-rose-500/10 text-rose-300 hover:bg-rose-500/15'
        : 'border border-slate-700 bg-slate-900/60 text-slate-300 hover:bg-slate-800';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${active ? activeClass : inactiveClass}`}
    >
      {label}
    </button>
  );
}

function ActionButton({ children, tone = 'default', onClick, disabled }) {
  const toneClass =
    tone === 'positive'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15'
      : tone === 'negative'
        ? 'border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/15'
        : tone === 'sky'
          ? 'border-sky-500/30 bg-sky-500/10 text-sky-300 hover:bg-sky-500/15'
          : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:bg-slate-800';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl border px-3 py-2 text-xs font-semibold transition disabled:opacity-50 ${toneClass}`}
    >
      {children}
    </button>
  );
}
