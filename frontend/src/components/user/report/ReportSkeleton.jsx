export default function ReportSkeleton() {
  return (
    <div className="flex h-full flex-col space-y-6 overflow-y-auto p-8 font-sans animate-pulse">
      <div className="mb-2 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="space-y-3">
          <div className="h-8 w-64 rounded-xl bg-slate-800" />
          <div className="h-4 w-96 max-w-full rounded-lg bg-slate-800/80" />
        </div>
        <div className="h-11 w-36 rounded-xl bg-slate-800" />
      </div>
      <div className="h-24 rounded-2xl border border-slate-700 bg-slate-800/50" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="h-[430px] rounded-2xl border border-slate-700 bg-slate-800/50 lg:col-span-2" />
        <div className="h-[430px] rounded-2xl border border-slate-700 bg-slate-800/50" />
      </div>
      <div className="h-52 rounded-2xl border border-slate-700 bg-slate-800/50" />
    </div>
  );
}
