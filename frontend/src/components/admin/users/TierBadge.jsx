import { Crown } from 'lucide-react';

export default function TierBadge({ tier }) {
  const safeTier = String(tier || 'free').toLowerCase();
  const isVIP = safeTier === 'vip';

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1 text-xs rounded-full font-medium border ${
        isVIP
          ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
          : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
      }`}
    >
      {isVIP && <Crown size={12} />}
      {isVIP ? 'VIP' : 'Free'}
    </span>
  );
}
