import { Loader2, RefreshCw, Save } from 'lucide-react';

import { formatDateTime } from '../../../utils/user/compareUtils';

export default function CompareHistoryPanel({
  comparisonHistory,
  isLoadingHistory,
  expandedHistoryId,
  deletingHistoryId,
  onRefresh,
  onLoadHistoryResult,
  onToggleExpanded,
  onDeleteHistoryItem,
}) {
  return (
    <section className="rounded-3xl border border-slate-700 bg-slate-800/40 p-6 backdrop-blur-md">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Lịch sử so sánh đã lưu</h2>
          <p className="mt-1 text-sm text-slate-400">
            Chỉ lưu summary vào bảng riêng, không ảnh hưởng dữ liệu Dashboard.
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoadingHistory}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:opacity-60"
        >
          {isLoadingHistory ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Tải lại lịch sử
        </button>
      </div>

      {comparisonHistory.length ? (
        <div className="space-y-3">
          {comparisonHistory.map((session) => {
            const items = Array.isArray(session.items) ? session.items : [];
            const isExpanded = expandedHistoryId === session.id;

            return (
              <div key={session.id} className="rounded-2xl border border-slate-700/70 bg-slate-950/30 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="font-semibold text-white">{session.title || 'Lịch sử so sánh quán'}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDateTime(session.created_at)} • {items.length} quán
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onLoadHistoryResult(session)}
                      className="rounded-xl border border-indigo-500/25 bg-indigo-500/10 px-3 py-2 text-xs font-bold text-indigo-300 transition hover:bg-indigo-500/15"
                    >
                      Mở lại
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleExpanded(isExpanded ? null : session.id)}
                      className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-300 transition hover:bg-slate-800"
                    >
                      {isExpanded ? 'Thu gọn' : 'Xem nhanh'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteHistoryItem(session.id)}
                      disabled={deletingHistoryId === session.id}
                      className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-300 transition hover:bg-rose-500/15 disabled:opacity-60"
                    >
                      {deletingHistoryId === session.id ? 'Đang xóa...' : 'Xóa'}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {items.map((item, index) => (
                      <div key={`${session.id}-${item.source_url || index}`} className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                        <p className="font-semibold text-white">{item.restaurant_name || `Quán ${index + 1}`}</p>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          <span className="rounded-lg bg-emerald-500/10 px-2 py-2 text-emerald-300">
                            Hài lòng {Number(item.positive_rate || 0).toFixed(1)}%
                          </span>
                          <span className="rounded-lg bg-rose-500/10 px-2 py-2 text-rose-300">
                            Chưa hài lòng {Number(item.negative_rate || 0).toFixed(1)}%
                          </span>
                        </div>
                        <p className="mt-3 line-clamp-2 text-xs text-slate-400">
                          {item.recommendation || 'Chưa có lời khuyên.'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/30 p-6 text-center">
          <Save className="mx-auto mb-3 h-9 w-9 text-slate-600" />
          <p className="text-sm font-semibold text-slate-300">Chưa có lịch sử so sánh</p>
          <p className="mt-2 text-xs text-slate-500">
            Sau khi có kết quả, bấm “Lưu so sánh” để xem lại tại đây.
          </p>
        </div>
      )}
    </section>
  );
}
