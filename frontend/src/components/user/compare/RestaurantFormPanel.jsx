import { Link2, Loader2, Plus, Sparkles, Trash2, Utensils, XCircle } from 'lucide-react';

import { inferRestaurantNameFromUrl } from '../../../utils/user/compareUtils';

export default function RestaurantFormPanel({
  restaurants,
  canCompare,
  isComparing,
  onAddRestaurant,
  onRemoveRestaurant,
  onUpdateRestaurant,
  onCompare,
  onStopCompare,
}) {
  return (
    <div className="rounded-3xl border border-slate-700 bg-slate-800/40 p-6 backdrop-blur-md">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Danh sách quán cần so sánh</h2>
          <p className="mt-1 text-sm text-slate-400">
            Free so sánh 2 quán, VIP so sánh tối đa 3 quán và lưu lịch sử.
          </p>
        </div>

        <button
          type="button"
          onClick={onAddRestaurant}
          className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-200 transition hover:bg-indigo-500/15"
        >
          <Plus className="h-4 w-4" />
          Thêm quán
        </button>
      </div>

      <div className="space-y-4">
        {restaurants.map((item, index) => (
          <div key={index} className="rounded-2xl border border-slate-700/70 bg-slate-950/30 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300">
                  <Utensils className="h-4 w-4" />
                </div>
                <h3 className="font-semibold text-white">Quán {String.fromCharCode(65 + index)}</h3>
              </div>

              {restaurants.length > 2 && (
                <button
                  type="button"
                  onClick={() => onRemoveRestaurant(index)}
                  className="rounded-lg p-2 text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-300"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-[240px_1fr]">
              <input
                value={item.name}
                onChange={(event) => onUpdateRestaurant(index, 'name', event.target.value)}
                onBlur={() => {
                  if (!item.name.trim() && item.url.trim()) {
                    onUpdateRestaurant(index, 'name', inferRestaurantNameFromUrl(item.url, `Quán ${String.fromCharCode(65 + index)}`));
                  }
                }}
                placeholder="Tên quán, có thể bỏ trống"
                className="rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-200 placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />

              <div className="relative">
                <Link2 className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={item.url}
                  onChange={(event) => onUpdateRestaurant(index, 'url', event.target.value)}
                  onBlur={() => {
                    if (!item.name.trim() && item.url.trim()) {
                      onUpdateRestaurant(index, 'name', inferRestaurantNameFromUrl(item.url, `Quán ${String.fromCharCode(65 + index)}`));
                    }
                  }}
                  placeholder="Dán link Foody/Shopee/Google review của quán..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/70 py-3 pl-11 pr-4 text-sm text-slate-200 placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-slate-500">
          Dữ liệu so sánh mặc định là tạm thời. Chỉ khi bấm “Lưu so sánh” hệ thống mới lưu summary vào bảng riêng.
        </p>

        <div className="flex gap-2">
          {isComparing && (
            <button
              type="button"
              onClick={onStopCompare}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-300 transition hover:bg-rose-500/15"
            >
              <XCircle className="h-4 w-4" />
              Dừng
            </button>
          )}

          <button
            type="button"
            onClick={onCompare}
            disabled={!canCompare || isComparing}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-950/25 transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isComparing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {isComparing ? 'Đang so sánh...' : 'Bắt đầu so sánh'}
          </button>
        </div>
      </div>
    </div>
  );
}
