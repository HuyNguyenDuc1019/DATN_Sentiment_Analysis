import Pagination from '../../ui/Pagination';

import FilterButton from './FilterButton';
import ReviewItem from './ReviewItem';
import ReviewListSkeleton from './ReviewListSkeleton';
import { normalizeConfidence } from '../../../utils/user/urlAnalyzerUtils';

export default function ReviewsPanel({
  filter,
  setFilter,
  loading,
  visible,
  pagedVisible,
  page,
  totalPages,
  setPage,
}) {
  return (
    <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl p-6">
      <div className="flex flex-col gap-4 mb-6 pb-4 border-b border-slate-700 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-lg font-medium text-white">Phản hồi đã nhận</h3>
        <div className="flex gap-2 text-sm">
          <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>
            Tất cả
          </FilterButton>
          <FilterButton active={filter === 'positive'} tone="positive" onClick={() => setFilter('positive')}>
            Hài lòng
          </FilterButton>
          <FilterButton active={filter === 'negative'} tone="negative" onClick={() => setFilter('negative')}>
            Chưa hài lòng
          </FilterButton>
        </div>
      </div>

      <div className="space-y-4">
        {loading && <ReviewListSkeleton />}

        {pagedVisible.map((item, index) => (
          <ReviewItem
            key={`${item.text}-${index}`}
            content={item.text}
            date="Vừa xử lý"
            sentiment={item.prediction === 1 ? 'positive' : 'negative'}
            confidence={Math.round(normalizeConfidence(item.confidence) * 100)}
          />
        ))}

        {!loading && !visible.length && (
          <p className="py-8 text-center text-slate-500">Chưa có dữ liệu phản hồi.</p>
        )}

        {!loading && visible.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-slate-700 pt-4 text-sm text-slate-400 xl:flex-row xl:items-center xl:justify-between">
            <span>
              Hiển thị {pagedVisible.length} trên tổng {visible.length} phản hồi · Trang {page}/{totalPages}
            </span>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>
    </div>
  );
}
