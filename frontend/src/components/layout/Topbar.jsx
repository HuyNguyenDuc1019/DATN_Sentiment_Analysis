import React, { useState } from 'react';
import {
  HiOutlineBell,
  HiOutlineMoon,
  HiOutlineSun,
  HiOutlineUser,
  HiBars3,
  HiMagnifyingGlass,
  HiOutlineArrowRightOnRectangle,
} from 'react-icons/hi2';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
  { label: 'Dashboard', path: '/' },
  { label: 'Batch', path: '/batch' },
  { label: 'URL', path: '/url' },
  { label: 'Feedback', path: '/feedback' },
  { label: 'Reports', path: '/reports' },
  { label: 'Settings', path: '/settings' },
];

const Topbar = ({ sidebarWidth }) => {
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <header
        className="fixed left-0 right-0 top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-white/85 px-3 shadow-sm backdrop-blur-xl transition-[left] duration-200 dark:border-slate-800 dark:bg-slate-900/85 sm:px-5 lg:left-[var(--sidebar-width)]"
        style={{ '--sidebar-width': `${sidebarWidth}px` }}
      >
        <button
          className="flex h-9 w-9 items-center justify-center rounded-xl transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          type="button"
        >
          <HiBars3 className="h-5 w-5 text-slate-500 dark:text-slate-400" />
        </button>

        <div className="relative hidden min-w-0 max-w-sm flex-1 sm:block">
          <HiMagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            placeholder="Tìm kiếm..."
            className="w-full rounded-xl bg-slate-100 py-2 pl-9 pr-4 text-sm text-ink outline-none transition focus:ring-2 focus:ring-primary-500/30 dark:bg-slate-800 dark:text-white placeholder-slate-400"
          />
        </div>

        <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-2">
          <button className="relative flex h-9 w-9 items-center justify-center rounded-xl transition-colors hover:bg-slate-100 dark:hover:bg-slate-800" type="button">
            <HiOutlineBell className="h-5 w-5 text-slate-500 dark:text-slate-400" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
          </button>

          <button
            onClick={toggle}
            className="flex h-9 w-9 items-center justify-center rounded-xl transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
            type="button"
          >
            {theme === 'dark'
              ? <HiOutlineSun className="h-5 w-5 text-amber-400" />
              : <HiOutlineMoon className="h-5 w-5 text-slate-500" />}
          </button>

          <div className="relative flex min-w-0 items-center gap-2 border-l border-border pl-2 dark:border-slate-700">
            <button
              onClick={() => setShowConfirm((v) => !v)}
              className="flex min-w-0 items-center gap-2 rounded-xl px-1.5 py-1 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 sm:px-2"
              type="button"
            >
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600 to-blue-400 shadow-sm">
                <HiOutlineUser className="h-4 w-4 text-white" />
              </div>
              <div className="hidden max-w-[150px] text-left text-sm sm:block">
                <p className="truncate font-semibold leading-tight text-ink dark:text-white">
                  {user?.email?.split('@')[0] ?? 'Admin'}
                </p>
                <p className="text-xs text-slate-400">Quản trị viên</p>
              </div>
            </button>

            <AnimatePresence>
              {showConfirm && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowConfirm(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-12 z-50 w-56 rounded-2xl border border-border bg-white p-1.5 shadow-card-hover dark:border-slate-700 dark:bg-slate-900"
                  >
                    <div className="mb-1 border-b border-border px-3 py-2 dark:border-slate-700">
                      <p className="text-xs text-slate-400">Đăng nhập với</p>
                      <p className="truncate text-sm font-medium text-ink dark:text-white">{user?.email ?? 'admin@gmail.com'}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                      type="button"
                    >
                      <HiOutlineArrowRightOnRectangle className="h-4 w-4" />
                      Đăng xuất
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.nav
              initial={{ x: -288 }}
              animate={{ x: 0 }}
              exit={{ x: -288 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="fixed left-0 top-0 z-50 h-full w-72 border-r border-border bg-white px-3 py-4 shadow-2xl dark:border-slate-800 dark:bg-slate-900 lg:hidden"
            >
              <div className="mb-6 flex items-center gap-3 px-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600 to-blue-400">
                  <span className="font-display text-sm font-bold text-white">AI</span>
                </div>
                <span className="font-display font-bold text-ink dark:text-white">Sentiment Analytics</span>
              </div>
              {navItems.map(({ label, path }) => (
                <NavLink
                  key={path}
                  to={path}
                  end={path === '/'}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `mb-0.5 block rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400'
                        : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Topbar;
