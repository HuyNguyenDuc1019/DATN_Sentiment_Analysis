import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';

const AppLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const sidebarWidth = collapsed ? 72 : 240;

  return (
    <div className="min-h-screen bg-surface dark:bg-slate-950 font-sans">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      <Topbar sidebarWidth={sidebarWidth} />
      
      {/* Desktop main (with sidebar offset animation) */}
      <motion.main
        animate={{ paddingLeft: sidebarWidth }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="pt-16 min-h-screen hidden lg:block"
      >
        <div className="p-6 lg:p-8">
          <Outlet />
        </div>
      </motion.main>
      
      {/* Mobile main (no sidebar offset) */}
      <main className="lg:hidden pt-16 p-4">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;