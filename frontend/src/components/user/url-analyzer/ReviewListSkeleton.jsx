export default function ReviewListSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-4">
          <div className="mb-3 h-4 w-3/4 rounded bg-slate-700" />
          <div className="h-3 w-1/3 rounded bg-slate-700/80" />
        </div>
      ))}
    </div>
  );
}
