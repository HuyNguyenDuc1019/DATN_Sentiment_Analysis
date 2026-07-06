export default function MiniStat({ label, value, tone = 'default' }) {
  const toneClass =
    tone === 'positive'
      ? 'text-emerald-300'
      : tone === 'negative'
        ? 'text-rose-300'
        : 'text-white';

  return (
    <div className="min-w-[92px] rounded-xl border border-slate-700/70 bg-slate-950/30 px-4 py-3 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${toneClass}`}>
        {Number(value || 0).toLocaleString('vi-VN')}
      </p>
    </div>
  );
}
