export default function DashboardSkeleton() {
  return (
    <div className="p-8 space-y-6 animate-pulse font-sans">
      <div className="space-y-3">
        <div className="h-8 w-72 rounded-xl bg-slate-800" />
        <div className="h-4 w-96 max-w-full rounded-lg bg-slate-800/80" />
      </div>
      <div className="h-40 rounded-2xl border border-slate-700 bg-slate-800/40" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-36 rounded-2xl border border-slate-700 bg-slate-800/40" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="h-80 rounded-2xl border border-slate-700 bg-slate-800/40 lg:col-span-2" />
        <div className="h-80 rounded-2xl border border-slate-700 bg-slate-800/40" />
      </div>
    </div>
  );
}
