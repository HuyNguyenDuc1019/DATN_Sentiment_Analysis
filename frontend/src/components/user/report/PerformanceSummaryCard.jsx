import { CheckCircle2, Database, Frown, ShieldCheck, Smile } from 'lucide-react';

import Metric from './Metric';

export default function PerformanceSummaryCard({ total, positive, negative, confidence }) {
  return (
    <div className="break-inside-avoid rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-md">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-medium text-white">Tóm tắt tình hình</h2>
        <div className="flex items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold tracking-wider text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5" />
          ĐANG THEO DÕI
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon={Database} label="Tổng phản hồi" value={total} barColor="bg-indigo-400" progress={100} />
        <Metric icon={Smile} label="Khách hài lòng" value={positive} color="text-emerald-400" barColor="bg-emerald-500" progress={total ? (positive / total) * 100 : 0} glow="shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
        <Metric icon={Frown} label="Khách chưa hài lòng" value={negative} color="text-rose-400" barColor="bg-rose-500" progress={total ? (negative / total) * 100 : 0} glow="shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
        <Metric icon={ShieldCheck} label="Độ chắc chắn trung bình" value={`${(confidence * 100).toFixed(1)}%`} barColor="bg-indigo-400" progress={confidence * 100} />
      </div>
    </div>
  );
}
