export default function FeedbackTaskSkeleton() {
  return (
    <div className="flex min-h-[520px] flex-col rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-md">
      <div className="mb-6 flex gap-4 border-b border-slate-700/50 pb-5">
        <div className="h-9 w-48 animate-pulse rounded-lg bg-slate-700/70" />
        <div className="h-9 w-40 animate-pulse rounded-lg bg-slate-700/50" />
      </div>
      <div className="mb-8 space-y-4">
        <div className="h-4 w-44 animate-pulse rounded bg-slate-700/50" />
        <div className="h-24 animate-pulse rounded-xl border border-slate-700/50 bg-slate-900/50" />
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="h-28 animate-pulse rounded-xl border border-slate-700 bg-slate-900/50" />
        <div className="space-y-3">
          <div className="h-14 animate-pulse rounded-xl border border-slate-700 bg-slate-900/50" />
          <div className="h-14 animate-pulse rounded-xl border border-slate-700 bg-slate-900/50" />
        </div>
      </div>
    </div>
  );
}
