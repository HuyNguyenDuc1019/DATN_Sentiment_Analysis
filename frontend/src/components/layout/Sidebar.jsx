import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineSquares2X2,
  HiOutlineTableCells,
  HiOutlineLink,
  HiOutlineChatBubbleLeftRight,
  HiOutlineChartBarSquare,
  HiOutlineCog6Tooth,
  HiChevronLeft,
  HiChevronRight,
} from 'react-icons/hi2';

const navItems = [
  { label: 'Dashboard', path: '/', icon: HiOutlineSquares2X2 },
  { label: 'Batch Prediction', path: '/batch', icon: HiOutlineTableCells },
  { label: 'URL Analyzer', path: '/url', icon: HiOutlineLink },
  { label: 'Feedback Center', path: '/feedback', icon: HiOutlineChatBubbleLeftRight },
  { label: 'Reports', path: '/reports', icon: HiOutlineChartBarSquare },
  { label: 'Settings', path: '/settings', icon: HiOutlineCog6Tooth },
];

const Sidebar = ({ collapsed, onToggle }) => {
  return (
    <motion.aside
      animate={{ width: collapsed ? 76 : 236 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="fixed left-0 top-0 z-40 hidden h-full flex-col overflow-visible border-r border-border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:flex"
    >
      <div className="flex h-16 flex-shrink-0 items-center gap-3 border-b border-border px-4 dark:border-slate-800">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600 to-blue-400 shadow-glow">
          <span className="font-display text-sm font-bold text-white">AI</span>
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="whitespace-nowrap text-sm font-bold leading-tight text-ink dark:text-white"
            >
              Sentiment<br />
              <span className="text-xs font-normal text-primary-600">Analytics</span>
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-visible px-2 py-4">
        {navItems.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all ${
                isActive
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute inset-0 rounded-xl bg-primary-50 dark:bg-primary-900/20"
                    transition={{ duration: 0.18 }}
                  />
                )}
                <Icon className="relative z-10 h-5 w-5 flex-shrink-0" />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.12 }}
                      className="relative z-10 whitespace-nowrap text-sm font-medium"
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {collapsed && (
                  <div className="pointer-events-none absolute left-full z-50 ml-3 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 dark:bg-slate-700">
                    {label}
                  </div>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="flex-shrink-0 px-2 pb-4">
        <button
          onClick={onToggle}
          className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          type="button"
        >
          {collapsed ? (
            <HiChevronRight className="h-4 w-4" />
          ) : (
            <>
              <HiChevronLeft className="h-4 w-4" />
              <span className="text-xs">Thu gọn</span>
            </>
          )}
        </button>
      </div>
    </motion.aside>
  );
};

export default Sidebar;
