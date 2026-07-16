import { AlertTriangle } from 'lucide-react';

export default function AlertsSection({ alerts, loading }) {
  const isSingleAlert = alerts.length === 1;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-rose-500/25 bg-rose-500/10 p-5 shadow-lg shadow-rose-950/10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/20 text-rose-300">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Cảnh báo cần xử lý</h2>
            <p className="text-sm text-rose-100/70">
              Các phản hồi chưa tốt hoặc có dấu hiệu cần quản lý xem lại.
            </p>
          </div>
        </div>
        <span className="rounded-full border border-rose-400/30 px-3 py-1 text-xs font-semibold text-rose-200">
          {loading ? 'Đang cập nhật...' : `${alerts.length} mục nổi bật`}
        </span>
      </div>

      <div>
        {alerts.length ? (
          <div className={`grid grid-cols-1 gap-3 ${isSingleAlert ? '' : 'lg:grid-cols-2'}`}>
            {alerts.map((alert, index) => (
              <div key={alert.id || index} className="rounded-xl border border-rose-400/20 bg-slate-950/35 p-4">
                <p className={`${isSingleAlert ? 'line-clamp-3' : 'line-clamp-2'} text-sm leading-relaxed text-slate-100`}>
                  {alert.content || alert.comment || alert.text}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {(alert.keywords || []).slice(0, 4).map((keyword) => (
                    <span key={keyword} className="rounded-full bg-rose-500/15 px-2.5 py-1 text-[11px] font-medium text-rose-200">
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-slate-700/60 bg-slate-950/30 p-4 text-sm text-slate-400">
            Chưa có phản hồi cần cảnh báo.
          </div>
        )}
      </div>

    </section>
  );
}
