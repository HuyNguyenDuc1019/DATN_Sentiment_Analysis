import { ThumbsDown, ThumbsUp } from 'lucide-react';

export default function LabelButton({ type, active, onClick }) {
  const isPositive = type === 'positive';
  const Icon = isPositive ? ThumbsUp : ThumbsDown;
  const text = isPositive ? 'Khách hài lòng' : 'Khách chưa hài lòng';

  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 font-semibold transition-all ${
        active
          ? isPositive
            ? 'border-emerald-400 bg-emerald-500/30 text-emerald-100 ring-2 ring-emerald-400/25'
            : 'border-rose-400 bg-rose-500/30 text-rose-100 ring-2 ring-rose-400/25'
          : isPositive
            ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400 hover:border-emerald-400/60 hover:bg-emerald-500/12'
            : 'border-rose-500/30 bg-rose-500/5 text-rose-400 hover:border-rose-400/60 hover:bg-rose-500/12'
      }`}
    >
      <Icon className={`h-5 w-5 ${active ? 'fill-current' : ''}`} />
      {text}
    </button>
  );
}
