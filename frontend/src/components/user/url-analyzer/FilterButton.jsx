export default function FilterButton({ active, tone = 'default', onClick, children }) {
  const activeClass = {
    default: 'bg-slate-700 text-white border-slate-600',
    positive: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    negative: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  }[tone];

  const idleClass = {
    default: 'bg-transparent text-slate-400 border-transparent hover:bg-slate-700/40',
    positive: 'bg-transparent text-emerald-400 border-transparent hover:bg-emerald-500/10',
    negative: 'bg-transparent text-rose-400 border-transparent hover:bg-rose-500/10',
  }[tone];

  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-lg font-medium border transition-colors ${active ? activeClass : idleClass}`}
    >
      {children}
    </button>
  );
}
