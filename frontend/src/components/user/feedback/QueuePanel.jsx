import { List } from 'lucide-react';
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
}) {
  return (
    <div className="flex max-h-[680px] min-h-[500px] flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-800/40">
      <div className="shrink-0 border-b border-slate-700 p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-base font-semibold text-white">
            <List className="h-4 w-4 text-indigo-400" />
            {mode === 'priority' ? 'AI chưa chắc' : 'Danh sách bình luận'}
          </h2>
          <span className="rounded-lg bg-indigo-500/10 px-2.5 py-1 text-xs font-bold text-indigo-300">{queue.length}</span>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {loading ? 'Đang tải...' : `Chọn bình luận để kiểm tra · đã xử lý ${reviewedCount}`}
        </p>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {loading ? <QueueSkeleton /> : queue.map((entry) => (
          <QueueItem
            key={entry.id}
            data={entry}
            active={entry.id === selectedId}
            checked={selectedIds.has(entry.id)}
            showCheckbox={mode === 'all'}
            onCheck={() => toggleSelected(entry.id)}
            onClick={() => setSelectedById(entry.id)}
          />
        ))}

        {!loading && !queue.length && (
          <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">
            Không còn bình luận cần xử lý.
          </div>
        )}
      </div>
    </div>
  );
}
