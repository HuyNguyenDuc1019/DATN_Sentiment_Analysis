import { RefreshCcw } from 'lucide-react';

import DateField from './DateField';
import { SOURCE_OPTIONS } from '../../../utils/user/reportUtils';

export default function FilterBar({ filters, setFilters, loading, onRefresh }) {
  const update = (field) => (event) => setFilters((current) => ({ ...current, [field]: event.target.value }));

  return (
    <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-700 bg-slate-800/50 p-4 text-sm backdrop-blur-md xl:flex-row xl:items-center">
      <div className="flex flex-col gap-4 text-slate-300 lg:flex-row lg:items-end">
        <div className="flex flex-wrap items-end gap-3">
          <span className="pb-2 text-slate-400">Khoảng thời gian:</span>
          <DateField label="Từ ngày" value={filters.startDate} onChange={update('startDate')} />
          <DateField label="Đến ngày" value={filters.endDate} onChange={update('endDate')} />
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
      </div>

      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        className="flex items-center gap-2 self-start text-slate-400 transition-colors hover:text-white disabled:opacity-60 xl:self-center"
      >
        <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        {loading ? 'Đang cập nhật...' : 'Làm mới dữ liệu'}
      </button>
    </div>
  );
}
