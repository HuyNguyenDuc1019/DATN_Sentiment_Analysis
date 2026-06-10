import React, { useState } from 'react';
import { HiOutlineBell, HiOutlineMoon, HiOutlineSun, HiOutlineUser, HiBars3, HiMagnifyingGlass } from 'react-icons/hi2';
import { useTheme } from '@/contexts/ThemeContext';
import { NavLink } from 'react-router-dom';
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
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header
        className="fixed top-0 right-0 h-16 z-30 flex items-center px-4 sm:px-6 gap-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-border dark:border-slate-800"
        style={{ left: `${sidebarWidth}px`, transition: 'left 0.25s ease' }}
      >
        {/* Mobile menu button */}
        <button
          className="lg:hidden w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          onClick={() => setMobileOpen((v) => !v)}
        >
          <HiBars3 className="w-5 h-5 text-slate-500 dark:text-slate-400" />
        </button>

        {/* Search */}
        <div className="relative flex-1 max-w-sm hidden sm:block">
          <HiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            placeholder="Tìm kiếm..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-100 dark:bg-slate-800 rounded-xl border-none outline-none focus:ring-2 focus:ring-primary-500/30 text-ink dark:text-white placeholder-slate-400"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Notification */}
          <button className="relative w-9 h-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors">
            <HiOutlineBell className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>

          {/* Dark mode toggle */}
          <button
            onClick={toggle}
            className="w-9 h-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
          >
            {theme === 'dark' ? (
              <HiOutlineSun className="w-5 h-5 text-amber-400" />
            ) : (
              <HiOutlineMoon className="w-5 h-5 text-slate-500" />
            )}
          </button>

          {/* User */}
          <div className="flex items-center gap-2 pl-2 border-l border-border dark:border-slate-700">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-600 to-blue-400 flex items-center justify-center shadow-sm">
              <HiOutlineUser className="w-4 h-4 text-white" />
            </div>
            <div className="hidden sm:block text-sm">
              <p className="font-semibold text-ink dark:text-white leading-tight">Admin</p>
              <p className="text-slate-400 text-xs">Quản trị viên</p>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile nav drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.nav
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.25 }}
              className="fixed left-0 top-0 h-full w-64 z-50 bg-white dark:bg-slate-900 border-r border-border dark:border-slate-800 py-4 px-3 lg:hidden"
            >
              <div className="flex items-center gap-3 px-2 mb-6">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-600 to-blue-400 flex items-center justify-center">
                  <span className="text-white font-display font-bold text-sm">AI</span>
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
                    `block px-3 py-2.5 rounded-xl text-sm font-medium mb-0.5 transition-colors ${
                      isActive
                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
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