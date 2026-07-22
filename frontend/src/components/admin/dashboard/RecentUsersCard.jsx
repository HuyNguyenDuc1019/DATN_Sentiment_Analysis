import RecentUserItem from './RecentUserItem';
import RecentUserSkeleton from './RecentUserSkeleton';

export default function RecentUsersCard({ isLoading, recentUsers }) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-md">
      <h3 className="mb-2 text-sm font-medium text-slate-200">Người dùng mới gần đây</h3>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array(6)
            .fill(0)
            .map((_, index) => <RecentUserSkeleton key={index} />)
        ) : recentUsers.length ? (
          recentUsers.map((item) => <RecentUserItem key={item.id} item={item} />)
        ) : (
          <p className="col-span-full rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">
            Chưa có người dùng nào.
          </p>
        )}
      </div>
    </div>
  );
}
