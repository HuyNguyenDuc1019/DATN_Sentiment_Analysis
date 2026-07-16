import { Ban, BadgeCheck, Shield, Users } from 'lucide-react';

const statCards = [
  {
    key: 'total',
    title: 'Tổng tài khoản',
    icon: <Users className="h-5 w-5 text-indigo-400" />,
    valueClass: 'text-white',
  },
  {
    key: 'admins',
    title: 'Admin',
    icon: <Shield className="h-5 w-5 text-indigo-400" />,
    valueClass: 'text-indigo-400',
  },
  {
    key: 'activeUsers',
    title: 'Đang hoạt động',
    icon: <BadgeCheck className="h-5 w-5 text-emerald-400" />,
    valueClass: 'text-emerald-400',
  },
  {
    key: 'blockedUsers',
    title: 'Đã khóa',
    icon: <Ban className="h-5 w-5 text-rose-400" />,
    valueClass: 'text-rose-400',
  },
];

export default function AdminUsersStatsGrid({ userStats }) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((card) => (
        <div key={card.key} className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-md">
          <div className="flex items-start justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{card.title}</h3>
            {card.icon}
          </div>
          <p className={`mt-4 text-4xl font-bold ${card.valueClass}`}>{userStats[card.key]}</p>
        </div>
      ))}
    </div>
  );
}
