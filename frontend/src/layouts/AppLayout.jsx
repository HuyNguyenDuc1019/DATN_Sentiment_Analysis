import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';

const AppLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const sidebarWidth = collapsed ? 76 : 236;

  return (
    <div className="min-h-screen bg-surface text-ink antialiased dark:bg-slate-950 dark:text-white">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      <Topbar sidebarWidth={sidebarWidth} />

      <motion.main
        animate={{ paddingLeft: sidebarWidth }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="hidden min-h-screen pt-16 lg:block"
      >
        <div className="mx-auto w-full max-w-[1680px] px-5 py-6 xl:px-7 xl:py-7 2xl:px-8">
          <Outlet />
        </div>
      </motion.main>

      <main className="min-h-screen px-3 pb-5 pt-[76px] sm:px-4 lg:hidden">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
