import { RefreshCcw, RotateCcw, SlidersHorizontal, Store } from 'lucide-react';

import DateField from './DateField';
import { SOURCE_OPTIONS } from '../../../utils/user/reportUtils';

export default function FilterBar({
  filters,
  setFilters,
  restaurants = [],
  loading,
  dirty,
  onApply,
  onRefresh,
  onReset,
}) {
  const update = (field) => (event) =>
    setFilters((current) => ({
      ...current,
      [field]: event.target.value,
    }));

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-4 text-sm backdrop-blur-md">
      <div className="mb-4 flex items-center gap-2 text-slate-200">
        <SlidersHorizontal className="h-4 w-4 text-indigo-300" />
        <span className="font-semibold">Bộ lọc báo cáo</span>
        {dirty && <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-300">Chưa áp dụng</span>}
      </div>

      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div className="flex flex-col gap-4 text-slate-300 lg:flex-row lg:items-end">
        <div className="flex flex-wrap items-end gap-3">
          <span className="pb-2 text-slate-400">Khoảng thời gian:</span>

          <DateField
            label="Từ ngày"
            value={filters.startDate}
            onChange={update('startDate')}
          />

          <DateField
            label="Đến ngày"
            value={filters.endDate}
            onChange={update('endDate')}
          />
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-slate-500">Nguồn</span>

          <select
            value={filters.source}
            onChange={update('source')}
            className="min-w-[150px] rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-2 text-slate-200 transition-colors hover:border-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {SOURCE_OPTIONS.map((source) => (
              <option key={source} value={source}>
                {source === 'Tất cả' ? 'Tất cả nguồn' : source}
              </option>
            ))}
          </select>
        </label>

          <label className="flex min-w-0 flex-col gap-1.5 lg:min-w-[240px]">
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <Store className="h-3.5 w-3.5" />
              Quán
            </span>
            <select
              value={filters.restaurantKey}
              onChange={update('restaurantKey')}
              className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-2 text-slate-200 transition-colors hover:border-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">Tất cả quán</option>
              {restaurants.map((restaurant) => (
                <option key={restaurant.key} value={restaurant.key}>
                  {restaurant.name} ({Number(restaurant.review_count || 0).toLocaleString('vi-VN')})
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onReset}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-slate-300 transition-colors hover:border-slate-500 hover:text-white disabled:opacity-60"
          >
            <RotateCcw className="h-4 w-4" />
            Xóa bộ lọc
          </button>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-slate-300 transition-colors hover:border-slate-500 hover:text-white disabled:opacity-60"
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
          <button
            type="button"
            onClick={onApply}
            disabled={loading || !dirty}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold text-white shadow-lg shadow-indigo-600/20 transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Áp dụng bộ lọc
          </button>
        </div>
      </div>
    </div>
  );
}
