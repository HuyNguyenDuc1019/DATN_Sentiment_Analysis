import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { ArrowLeft, BarChart3, MessageSquare, Moon, Sparkles, Sun, Users } from 'lucide-react';
import { useUserProfile } from '../../hooks/useUserProfile';

const navItems = [
  { to: '/admin/dashboard', label: 'Bảng điều khiển', icon: BarChart3 },
  { to: '/admin/feedback', label: 'Quản lý phản hồi', icon: MessageSquare },
  { to: '/admin/users', label: 'Quản lý người dùng', icon: Users },
];

const themes = {
  dark: {
    app: 'bg-slate-950 text-slate-100',
    sidebar: 'border-slate-800 bg-slate-950',
    logo: 'text-white',
    navBase: 'bg-slate-900/70 text-slate-300 hover:bg-slate-800 hover:text-white',
    navActive: 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30',
    header: 'border-slate-800 bg-slate-950',
    main: 'bg-slate-950',
    card: 'border-slate-700 bg-slate-900/80 shadow-slate-950/30',
    cardSoft: 'border-slate-700 bg-slate-950/70',
    text: 'text-white',
    muted: 'text-slate-400',
    faint: 'text-slate-500',
    input: 'border-slate-700 bg-slate-950 text-white placeholder:text-slate-500 focus:border-indigo-500',
    tableHead: 'border-slate-800 bg-slate-950/70 text-slate-400',
    tableDivide: 'divide-slate-800',
    rowHover: 'hover:bg-slate-800/60',
    buttonGhost: 'border-slate-700 bg-slate-900 text-slate-200 hover:border-indigo-400 hover:text-white',
    avatar: 'border-slate-700 bg-slate-800 text-white',
  },
  light: {
    app: 'bg-[#eef5ff] text-slate-900',
    sidebar: 'border-slate-200 bg-white/85 shadow-xl shadow-slate-200/70',
    logo: 'text-slate-950',
    navBase: 'bg-white text-slate-700 shadow-sm hover:bg-indigo-50 hover:text-indigo-700',
    navActive: 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30',
    header: 'border-slate-200 bg-white/80 shadow-sm shadow-slate-200/80',
    main: 'bg-[#eef5ff]',
    card: 'border-slate-200 bg-white shadow-xl shadow-slate-200/70',
    cardSoft: 'border-slate-200 bg-slate-50',
    text: 'text-slate-950',
    muted: 'text-slate-600',
    faint: 'text-slate-500',
    input: 'border-slate-300 bg-white text-slate-950 placeholder:text-slate-400 focus:border-indigo-500',
    tableHead: 'border-slate-200 bg-slate-50 text-slate-500',
    tableDivide: 'divide-slate-200',
    rowHover: 'hover:bg-indigo-50/70',
    buttonGhost: 'border-slate-300 bg-white text-slate-700 hover:border-indigo-400 hover:text-indigo-700',
    avatar: 'border-slate-300 bg-indigo-50 text-indigo-700',
  },
};

export default function AdminLayout() {
  const { fullName, initials, roleLabel } = useUserProfile();
  const [mode, setMode] = useState(() => localStorage.getItem('admin-theme') || 'dark');
  const isDark = mode === 'dark';
  const theme = themes[mode] || themes.dark;

  useEffect(() => {
    localStorage.setItem('admin-theme', mode);
  }, [mode]);

  const outletContext = useMemo(() => ({ isDark, theme }), [isDark, theme]);

  return (
    <div className={`flex h-screen overflow-hidden transition-colors duration-300 ${theme.app}`}>
      <aside className={`flex w-64 shrink-0 flex-col border-r p-4 transition-colors duration-300 ${theme.sidebar}`}>
        <div className="mb-8 flex items-center gap-3 px-2">
          <Sparkles className="h-7 w-7 text-indigo-500" fill="currentColor" />
          <span className={`text-xl font-black ${theme.logo}`}>Almotion</span>
        </div>

        <nav className="space-y-2">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition ${
                  isActive ? theme.navActive : theme.navBase
                }`
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto space-y-3">
          <Link
            to="/dashboard"
            className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-500"
          >
            <ArrowLeft className="h-4 w-4" />
            Về trang khách
          </Link>

          <div className={`rounded-xl border p-4 transition-colors duration-300 ${theme.card}`}>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-black text-white">
                {initials || 'AD'}
              </div>
              <div className="min-w-0">
                <p className={`truncate text-sm font-black ${theme.text}`}>{fullName || 'Admin User'}</p>
                <p className={`text-xs font-semibold ${theme.muted}`}>{roleLabel || 'Quản trị viên'}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className={`flex h-20 items-center justify-end gap-3 border-b px-8 transition-colors duration-300 ${theme.header}`}>
          <button
            type="button"
            onClick={() => setMode((current) => (current === 'dark' ? 'light' : 'dark'))}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition ${theme.buttonGhost}`}
            title={isDark ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
          >
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          <div className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-black ${theme.avatar}`}>
            {initials || 'AD'}
          </div>
        </header>

        <main className={`flex-1 overflow-y-auto p-8 transition-colors duration-300 ${theme.main}`}>
          <Outlet context={outletContext} />
        </main>
      </div>
    </div>
  );
}
