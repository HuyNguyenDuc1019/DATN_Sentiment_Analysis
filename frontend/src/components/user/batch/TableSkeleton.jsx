export default function TableSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[0, 1, 2, 3, 4, 5].map((item) => (
        <div key={item} className="grid grid-cols-12 gap-4 rounded-2xl border border-slate-700/40 bg-slate-900/40 p-4">
          <div className="col-span-1 h-4 rounded bg-slate-700" />
          <div className="col-span-7 h-4 rounded bg-slate-700" />
          <div className="col-span-2 h-4 rounded bg-slate-700" />
          <div className="col-span-2 h-4 rounded bg-slate-700" />
        </div>
      ))}
    </div>
  );
}
