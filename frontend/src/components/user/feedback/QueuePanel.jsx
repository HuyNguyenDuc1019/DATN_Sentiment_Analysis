import { CheckCircle2 } from 'lucide-react';

import QueueItem from './QueueItem';
import QueueSkeleton from './QueueSkeleton';

export default function QueuePanel({
  queue,
  selectedIds,
  selectedId,
  setSelectedById,
  toggleSelected,
  loading,
  reviewedCount,
  mode,
  confidenceThreshold,
}) {
  return (
    <div className="flex max-h-[720px] min-h-[520px] flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-800/50 backdrop-blur-md">
      <div className="shrink-0 border-b border-slate-700 p-5">
        <h2 className="mb-1 text-lg font-medium text-white">
          {mode === 'priority' ? 'AI chưa chắc' : 'Danh sách bình luận'}
        </h2>
        <p className="text-xs text-slate-400">
          {loading ? 'Đang tải...' : `${queue.length} mục trên trang • đã xử lý ${reviewedCount}`}
        </p>
      </div>

      <div className="border-b border-slate-700/70 px-5 py-3 text-xs leading-5 text-slate-400">
        {mode === 'priority'
          ? `Chỉ hiện các phản hồi AI có độ chắc chắn dưới ${confidenceThreshold}%.`
          : 'Duyệt theo lô mỗi trang 100 dòng. Có thể chọn nhiều dòng để xác nhận hoặc sửa hàng loạt.'}
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {loading ? (
          <QueueSkeleton />
        ) : (
          queue.map((entry) => (
            <QueueItem
              key={entry.id}
              data={entry}
              active={entry.id === selectedId}
              checked={selectedIds.has(entry.id)}
              showCheckbox={mode === 'all'}
              onCheck={() => toggleSelected(entry.id)}
              onClick={() => setSelectedById(entry.id)}
            />
          ))
        )}

        {!loading && !queue.length && (
          <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-5 text-center text-sm text-slate-400">
            Không có phản hồi nào trong hàng đợi hiện tại.
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-slate-700 bg-slate-800/80 p-4">
        <div className="flex items-center justify-center gap-2 py-2 text-sm font-medium text-slate-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          Các xác nhận và nhãn đã sửa sẽ được lưu để cải thiện AI
        </div>
      </div>
    </div>
  );
}
