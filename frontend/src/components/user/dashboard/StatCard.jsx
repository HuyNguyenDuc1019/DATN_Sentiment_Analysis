import { TrendingDown, TrendingUp } from 'lucide-react';

export default function StatCard({ title, value, icon, trend, trendUp, subIcons }) {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-md transition-colors hover:bg-slate-800">
      <div className="flex items-start justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</h3>
        {icon}
      </div>
      <div className="mt-4 flex items-end justify-between">
        <div className="text-4xl font-bold text-white">{value}</div>
        {trend && (
          <div className={`mb-1 flex items-center text-sm font-medium ${trendUp ? 'text-emerald-400' : 'text-rose-400'}`}>
            {trendUp ? <TrendingUp className="mr-1 h-4 w-4" /> : <TrendingDown className="mr-1 h-4 w-4" />}
            {trend}
          </div>
        )}
        {subIcons}
      </div>
    </div>
  );
}
