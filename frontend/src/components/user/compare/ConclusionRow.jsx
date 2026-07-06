export default function ConclusionRow({ icon, label, value, detail, tone }) {
  const tones = {
    emerald: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
    sky: 'border-sky-500/20 bg-sky-500/10 text-sky-300',
    violet: 'border-violet-500/20 bg-violet-500/10 text-violet-300',
    rose: 'border-rose-500/20 bg-rose-500/10 text-rose-300',
  };

  return (
    <div className={`rounded-2xl border p-4 ${tones[tone] || tones.sky}`}>
      <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
        {icon}
        {label}
      </div>
      <p className="truncate text-sm font-bold text-white">{value || 'Chưa rõ'}</p>
      <p className="mt-1 line-clamp-2 text-xs text-slate-400">{detail}</p>
    </div>
  );
}
