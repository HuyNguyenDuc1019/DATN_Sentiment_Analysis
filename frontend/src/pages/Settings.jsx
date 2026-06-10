import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import { HiOutlineCog6Tooth, HiOutlineServer } from 'react-icons/hi2';

const Settings = () => {
  const { theme, toggle } = useTheme();
  const [apiUrl, setApiUrl] = useState('http://localhost:8000');

  return (
    <div className="space-y-8 max-w-2xl">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display font-bold text-2xl text-ink dark:text-white">Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Cấu hình hệ thống và giao diện</p>
      </motion.div>

      {/* Appearance */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-card border border-border dark:border-slate-700 space-y-4"
      >
        <div className="flex items-center gap-3 pb-4 border-b border-border dark:border-slate-700">
          <HiOutlineCog6Tooth className="w-5 h-5 text-slate-500" />
          <h2 className="font-semibold text-ink dark:text-white">Giao diện</h2>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-slate-700 dark:text-slate-300 text-sm">Chế độ tối</p>
            <p className="text-slate-400 text-xs mt-0.5">Hiện tại: {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</p>
          </div>
          <button
            onClick={toggle}
            className={`relative w-12 h-6 rounded-full transition-colors ${theme === 'dark' ? 'bg-primary-600' : 'bg-slate-200'}`}
          >
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${theme === 'dark' ? 'translate-x-6.5 left-0.5' : 'left-0.5'}`} />
          </button>
        </div>
      </motion.div>

      {/* API */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-card border border-border dark:border-slate-700 space-y-4"
      >
        <div className="flex items-center gap-3 pb-4 border-b border-border dark:border-slate-700">
          <HiOutlineServer className="w-5 h-5 text-slate-500" />
          <h2 className="font-semibold text-ink dark:text-white">Kết nối Backend</h2>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">API Base URL</label>
          <input
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            className="w-full px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-900/50 border border-border dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-primary-500/30 font-mono text-ink dark:text-white"
          />
          <p className="text-xs text-slate-400 mt-2">Đảm bảo FastAPI đang chạy: <code className="font-mono bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-xs">uvicorn main:app --reload</code></p>
        </div>
        <button className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-xl transition-colors">
          Lưu cấu hình
        </button>
      </motion.div>
    </div>
  );
};

export default Settings;