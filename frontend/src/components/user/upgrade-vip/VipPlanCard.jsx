import { Crown, Loader2 } from 'lucide-react';

import VipFeatureItem from './VipFeatureItem';
import { VIP_FEATURES } from '../../../utils/user/upgradeVipUtils';

export default function VipPlanCard({ isProcessing, onUpgrade }) {
  return (
    <div className="max-w-md w-full bg-slate-800 rounded-2xl border border-indigo-500/30 p-8 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 rounded-full bg-indigo-500/20 blur-3xl" />

      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-indigo-500/20 rounded-xl text-indigo-400">
          <Crown size={28} />
        </div>
        <h2 className="text-2xl font-bold text-white">Gói Pro VIP</h2>
      </div>

      <div className="mb-6">
        <span className="text-4xl font-extrabold text-white">99.000đ</span>
        <span className="text-slate-400"> / tháng</span>
      </div>

      <ul className="space-y-4 mb-8 text-slate-300">
        {VIP_FEATURES.map((feature) => (
          <VipFeatureItem key={feature} text={feature} />
        ))}
      </ul>

      <button
        type="button"
        onClick={onUpgrade}
        disabled={isProcessing}
        className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-all duration-200 flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/30"
      >
        {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Nâng cấp ngay'}
      </button>
    </div>
  );
}
