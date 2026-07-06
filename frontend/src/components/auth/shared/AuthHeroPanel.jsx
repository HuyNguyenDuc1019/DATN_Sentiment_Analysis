import { BarChart2, Mail } from 'lucide-react';

import FloatingBadge from './FloatingBadge';

export default function AuthHeroPanel({
  title,
  description,
  variant = 'chart',
}) {
  return (
    <div className="hidden lg:flex w-1/2 relative flex-col justify-center bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#0f172a] p-16 overflow-hidden">
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />
      <div className="absolute top-1/4 right-0 w-[600px] h-[600px] border border-white/5 rounded-full translate-x-1/2" />
      <div className="absolute bottom-1/4 right-0 w-[400px] h-[400px] border border-white/10 rounded-full translate-x-1/3" />

      <div className="relative z-10 max-w-lg mb-16">
        <h2 className="text-4xl font-bold text-white leading-tight mb-4 drop-shadow-md">
          {title}
        </h2>
        <p className="text-indigo-200/80 text-sm leading-relaxed">
          {description}
        </p>
      </div>

      <div className="relative z-10 w-full max-w-sm mx-auto">
        {variant === 'recovery' ? <RecoveryCard /> : <ChartCard />}

        {variant === 'recovery' ? (
          <FloatingBadge className="-right-10 bottom-8 border-emerald-400/30" color="emerald" text="Bảo mật" />
        ) : (
          <>
            <FloatingBadge className="-right-12 bottom-6" color="emerald" text="Hài lòng" value="78%" />
            <FloatingBadge className="left-8 -bottom-10" color="rose" text="Chưa hài lòng" value="12%" reverse />
          </>
        )}
      </div>
    </div>
  );
}

function ChartCard() {
  return (
    <div
      className="bg-slate-800/40 backdrop-blur-xl border border-slate-600/50 rounded-2xl p-6 shadow-2xl relative z-10"
      style={{ animation: 'float 6s ease-in-out infinite' }}
    >
      <div className="flex justify-between items-center mb-6">
        <span className="text-xs font-medium text-slate-300">Tổng quan phản hồi</span>
        <BarChart2 className="w-4 h-4 text-slate-400" />
      </div>

      <div className="flex items-end justify-between gap-3 h-24 mt-4">
        {[40, 60, 30, 80, 100, 50].map((height, index) => (
          <div
            key={index}
            className="w-full bg-indigo-500 rounded-t-sm"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function RecoveryCard() {
  return (
    <div
      className="bg-slate-800/40 backdrop-blur-xl border border-slate-600/50 rounded-2xl p-6 shadow-2xl relative z-10"
      style={{ animation: 'float 6s ease-in-out infinite' }}
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center">
          <Mail className="w-5 h-5" />
        </div>
        <div>
          <div className="text-sm font-semibold text-white">Email khôi phục</div>
          <div className="text-xs text-slate-400">Liên kết bảo mật một lần</div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="h-3 rounded-full bg-indigo-400/30 w-4/5" />
        <div className="h-3 rounded-full bg-indigo-400/20 w-2/3" />
        <div className="h-10 rounded-xl bg-indigo-500/30 border border-indigo-400/20 mt-5" />
      </div>
    </div>
  );
}
