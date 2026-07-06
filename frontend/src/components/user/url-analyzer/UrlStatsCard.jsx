export default function UrlStatsCard({ icon, title, value }) {
  return (
    <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-xl p-5 flex items-center gap-4 hover:bg-slate-800 transition-colors">
      <div className="w-12 h-12 rounded-lg bg-slate-900/50 border border-slate-700 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-1">
          {title}
        </h3>
        <div className="text-2xl font-bold text-white leading-none">{value}</div>
      </div>
    </div>
  );
}
