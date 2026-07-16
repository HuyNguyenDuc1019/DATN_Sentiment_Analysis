export default function RecentUserItem({ item }) {
  const isAdmin = String(item.role).toLowerCase() === 'admin';

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
      <p className="truncate font-bold text-white">
        {item.full_name || item.email || 'Chưa có tên'}
      </p>
      <p className="mt-1 truncate text-sm text-slate-400">{item.email || '-'}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${
            isAdmin
              ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30'
              : 'bg-indigo-500/15 text-indigo-300 ring-indigo-500/30'
          }`}
        >
          {isAdmin ? 'Admin' : 'Người dùng'}
        </span>

        <span className="rounded-full bg-slate-500/15 px-2.5 py-1 text-xs font-bold text-slate-300 ring-1 ring-slate-500/30">
          {item.status || 'active'}
        </span>

      </div>
    </div>
  );
}
