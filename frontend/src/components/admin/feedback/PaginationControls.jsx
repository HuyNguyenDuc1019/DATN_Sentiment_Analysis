import { ChevronLeft, ChevronRight } from 'lucide-react';

import { getPageItems } from '../../../utils/admin/feedbackUtils';

export default function PaginationControls({ page, totalPages, onPageChange }) {
  const safeTotalPages = Math.max(1, totalPages || 1);
  const safePage = Math.min(Math.max(1, page || 1), safeTotalPages);
  const pageItems = getPageItems(safePage, safeTotalPages);

  const goToPage = (nextPage) => {
    const boundedPage = Math.min(Math.max(1, nextPage), safeTotalPages);

    if (boundedPage !== safePage) {
      onPageChange(boundedPage);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <button
        type="button"
        onClick={() => goToPage(safePage - 1)}
        disabled={safePage <= 1}
        className="flex h-9 min-w-9 items-center justify-center rounded-lg border border-slate-700 px-2 text-slate-300 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        title="Trang trước"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {pageItems.map((item) =>
        typeof item === 'string' ? (
          <span key={item} className="flex h-9 min-w-9 items-center justify-center px-1 text-slate-500">
            ...
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => goToPage(item)}
            className={`flex h-9 min-w-9 items-center justify-center rounded-lg border px-3 text-sm font-semibold transition-colors ${
              item === safePage
                ? 'border-indigo-500 bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
            aria-current={item === safePage ? 'page' : undefined}
          >
            {item}
          </button>
        )
      )}

      <button
        type="button"
        onClick={() => goToPage(safePage + 1)}
        disabled={safePage >= safeTotalPages}
        className="flex h-9 min-w-9 items-center justify-center rounded-lg border border-slate-700 px-2 text-slate-300 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        title="Trang sau"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
