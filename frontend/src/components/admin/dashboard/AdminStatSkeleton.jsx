export default function AdminStatSkeleton() {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-md">
      <div className="flex items-center justify-between">
        <div className="w-24 h-4 bg-slate-700 rounded animate-pulse" />
        <div className="w-5 h-5 bg-slate-700 rounded animate-pulse" />
      </div>

      <div className="mt-4">
        <div className="w-32 h-10 bg-slate-700 rounded animate-pulse" />
      </div>
    </div>
  );
}
