import { ShieldAlert, ShieldCheck } from 'lucide-react';

export default function StatusBadge({ status }) {
  const isActive = status !== 'blocked';

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1 text-xs rounded-full font-medium border ${
        isActive
          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
      }`}
    >
      {isActive ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
      {isActive ? 'Hoạt động' : 'Bị khóa'}
    </span>
  );
}
