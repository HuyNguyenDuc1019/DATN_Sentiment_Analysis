import { ThumbsDown, ThumbsUp } from 'lucide-react';

export default function LabelButton({ type, active, onClick }) {
  const positive = type === 'positive';
  const Icon = positive ? ThumbsUp : ThumbsDown;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
        active
          ? positive
            ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200 ring-2 ring-emerald-400/15'
            : 'border-rose-400 bg-rose-500/20 text-rose-200 ring-2 ring-rose-400/15'
          : 'border-slate-700 bg-slate-900/40 text-slate-300 hover:border-slate-600 hover:bg-slate-800'
      }`}
    >
      <Icon className="h-4 w-4" />
      {positive ? 'Hài lòng' : 'Chưa hài lòng'}
    </button>
  );
}
