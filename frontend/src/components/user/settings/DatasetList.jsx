import { useEffect, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';

import Pagination from '../../ui/Pagination';
import { formatDatasetType, formatVietnameseDate } from '../../../utils/user/settingsUtils';

const PAGE_SIZE = 5;

const formatDatasetDisplayName = (dataset) => {
  const rawValue =
    dataset?.dataset_name ||
    dataset?.name ||
    dataset?.source_url ||
    'Không rõ tên dữ liệu';

  if (!rawValue) return 'Không rõ tên dữ liệu';

  if (rawValue === 'CSV_Upload') return 'CSV Upload';

  try {
    const decodedValue = decodeURIComponent(rawValue);
    const url = new URL(decodedValue);

    if (url.hostname.includes('google.com')) {
      if (decodedValue.includes('/place/')) {
        const placeName = decodedValue
          .split('/place/')[1]
          .split('/')[0]
          .replace(/\+/g, ' ')
          .trim();

        return placeName || 'Google Maps';
      }

      return 'Google Maps';
    }

    if (url.hostname.includes('foody.vn')) {
      const pathParts = url.pathname.split('/').filter(Boolean);
      const lastPart = pathParts[pathParts.length - 1];

      if (lastPart) {
        return lastPart
          .replace(/-/g, ' ')
          .replace(/\b\w/g, (char) => char.toUpperCase());
      }

      return 'Foody';
    }

    return url.hostname;
  } catch {
    if (rawValue.length > 70) {
      return `${rawValue.slice(0, 70)}...`;
    }

    return rawValue;
  }
};

export default function DatasetList({ datasets, isLoading, deletingDatasetId, onDelete }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(datasets.length / PAGE_SIZE));

  useEffect(() => {
    setPage((currentPage) => Math.min(currentPage, totalPages));
  }, [totalPages]);

  const visibleDatasets = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return datasets.slice(start, start + PAGE_SIZE);
  }, [datasets, page]);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/30">
      {isLoading ? (
        <div className="p-4 text-sm text-slate-400">Đang tải danh sách dữ liệu...</div>
      ) : datasets.length ? (
        <div className="divide-y divide-slate-700/60">
          {visibleDatasets.map((dataset) => {
            const rowKey = dataset.dataset_id || dataset.source_url || dataset.dataset_name;
            const deletingKey = dataset.dataset_id || dataset.source_url;
            const isDeleting = deletingDatasetId === deletingKey;

            const displayName = formatDatasetDisplayName(dataset);
            const fullName = dataset.dataset_name || dataset.source_url || 'Không rõ tên dữ liệu';

            return (
              <div
                key={rowKey}
                className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p
                      className="max-w-[520px] truncate text-sm font-semibold text-slate-200"
                      title={fullName}
                    >
                      {displayName}
                    </p>

                    <span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-[11px] font-bold text-indigo-300">
                      {formatDatasetType(dataset.dataset_type)}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-slate-500">
                    {Number(dataset.total_reviews || dataset.review_count || 0).toLocaleString('vi-VN')} bình luận · Ngày tạo{' '}
                    {formatVietnameseDate(dataset.created_at)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onDelete(dataset)}
                  disabled={isDeleting}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-400 transition hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Trash2 size={14} />
                  {isDeleting ? 'Đang xóa...' : 'Xóa'}
                </button>
              </div>
            );
          })}
          {totalPages > 1 && (
            <div className="flex flex-col gap-3 border-t border-slate-700/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">
                Hiển thị {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, datasets.length)} trên {datasets.length} mục
              </p>
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 text-sm text-slate-500">
          Chưa có dữ liệu phân tích riêng theo file/quán.
        </div>
      )}
    </div>
  );
}
