export default function AdminUserTableSkeletonRow() {
  return (
    <tr>
      <td className="px-5 py-4"><div className="w-40 h-4 bg-slate-700/50 rounded animate-pulse" /></td>
      <td className="px-5 py-4"><div className="w-16 h-4 bg-slate-700/50 rounded animate-pulse" /></td>
      <td className="px-5 py-4"><div className="w-24 h-6 bg-slate-700/50 rounded-full animate-pulse" /></td>
      <td className="px-5 py-4"><div className="w-16 h-6 bg-slate-700/50 rounded-full animate-pulse" /></td>
      <td className="px-5 py-4"><div className="w-36 h-10 bg-slate-700/50 rounded animate-pulse" /></td>
      <td className="px-5 py-4"><div className="w-28 h-4 bg-slate-700/50 rounded animate-pulse" /></td>
      <td className="px-5 py-4 text-right">
        <div className="flex justify-end gap-2">
          <div className="w-8 h-8 bg-slate-700/50 rounded animate-pulse" />
          <div className="w-8 h-8 bg-slate-700/50 rounded animate-pulse" />
        </div>
      </td>
    </tr>
  );
}
