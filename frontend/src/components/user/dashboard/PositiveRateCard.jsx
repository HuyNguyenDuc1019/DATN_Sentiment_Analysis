import { Smile } from 'lucide-react';

export default function PositiveRateCard({ rate }) {
  return (
    <div className="flex h-full min-h-[120px] flex-col justify-between rounded-2xl border border-slate-700 bg-slate-800/50 p-5 backdrop-blur-md transition-colors hover:bg-slate-800 sm:p-6">
      <div className="flex items-start justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tỷ lệ khách hài lòng</h3>
        <Smile className="h-5 w-5 text-emerald-400" />
      </div>
      <div className="mt-4">
        <div className="mb-3 text-4xl font-bold text-white">{(rate * 100).toFixed(1)}%</div>
        <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-rose-500">
          <div
            className="h-full rounded-full bg-emerald-500 transition-[width] duration-700"
            style={{ width: `${rate * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
