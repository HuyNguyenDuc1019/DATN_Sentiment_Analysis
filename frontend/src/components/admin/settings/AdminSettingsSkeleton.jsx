export default function AdminSettingsSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-8 animate-pulse">
      <div className="w-64 h-8 bg-slate-800 rounded" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-48 bg-slate-800/50 rounded-2xl border border-slate-700" />
        <div className="h-48 bg-slate-800/50 rounded-2xl border border-slate-700" />
        <div className="h-64 bg-slate-800/50 rounded-2xl border border-slate-700 lg:col-span-2" />
      </div>
    </div>
  );
}
