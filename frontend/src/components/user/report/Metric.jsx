export default function Metric({ icon: Icon, label, value, color = 'text-white', barColor, progress, glow = '' }) {
  const width = Math.min(100, Math.max(0, Number(progress) || 0));

  return (
    <div className="flex flex-col justify-between rounded-xl border border-slate-700 bg-slate-900/50 p-5">
      <div className="mb-3 flex items-center gap-2 text-xs font-medium text-slate-400">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className={`text-3xl font-bold tracking-tight ${color}`}>
        {typeof value === 'number' ? value.toLocaleString('vi-VN') : value}
      </div>
      <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full ${barColor} ${glow} transition-[width] duration-700 ease-out`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}
