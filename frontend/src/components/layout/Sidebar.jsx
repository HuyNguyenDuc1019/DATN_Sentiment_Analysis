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
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="hidden lg:flex flex-col fixed left-0 top-0 h-full bg-white dark:bg-slate-900 border-r border-border dark:border-slate-800 z-40 overflow-hidden"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-border dark:border-slate-800 flex-shrink-0">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-600 to-blue-400 flex items-center justify-center flex-shrink-0 shadow-glow">
          <span className="text-white font-display font-bold text-sm">AI</span>
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="font-display font-bold text-ink dark:text-white text-sm leading-tight whitespace-nowrap"
            >
              Sentiment<br />
              <span className="text-primary-600 font-normal text-xs">Analytics</span>
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {navItems.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative ${
                isActive
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute inset-0 bg-primary-50 dark:bg-primary-900/20 rounded-xl"
                    transition={{ duration: 0.2 }}
                  />
                )}
                <Icon className="w-5 h-5 flex-shrink-0 relative z-10" />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="text-sm font-medium whitespace-nowrap relative z-10"
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {collapsed && (
                  <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-slate-900 dark:bg-slate-700 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
                    {label}
                  </div>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="px-2 pb-4 flex-shrink-0">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 transition-colors text-sm"
        >
          {collapsed ? (
            <HiChevronRight className="w-4 h-4" />
          ) : (
            <>
              <HiChevronLeft className="w-4 h-4" />
              <span className="text-xs">Thu gọn</span>
            </>
          )}
        </button>
      </div>
    </motion.aside>
  );
};

export default Sidebar;