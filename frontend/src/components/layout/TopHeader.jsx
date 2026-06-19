import { Bell, Search } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function TopHeader() {
  const { user } = useAuth();
  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

  return (
    <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-slate-800 bg-slate-950 px-4 sm:h-20 sm:px-8">
      <div className="relative hidden w-full max-w-[480px] sm:block">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input type="search" placeholder="Tìm kiếm..." className="w-full rounded-full bg-slate-800 py-2.5 pl-11 pr-4 text-sm text-slate-200 outline-none ring-indigo-500 focus:ring-1" />
      </div>
      <div className="ml-auto flex items-center gap-4">
        <button type="button" className="relative text-slate-400" aria-label="Thông báo"><Bell className="h-5 w-5" /><span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-indigo-500 ring-2 ring-slate-950" /></button>
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-indigo-600 text-xs font-semibold text-white">{initials}</div>
          <span className="hidden max-w-40 truncate text-sm text-slate-300 md:block">{name}</span>
        </div>
      </div>
    </header>
  );
}
