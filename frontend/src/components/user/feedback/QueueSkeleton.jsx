export default function QueueSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2, 3, 4].map((item) => (
        <div key={item} className="rounded-xl border border-slate-700 bg-slate-900/40 p-4">
          <div className="mb-3 h-4 w-full animate-pulse rounded bg-slate-700/60" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-slate-700/40" />
        </div>
      ))}
    </div>
  );
}
