import React from 'react';
import { motion } from 'framer-motion';
import { HiOutlineArrowDownTray } from 'react-icons/hi2';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const mockMonthly = [
  { month: 'T1', positive: 120, negative: 40 },
  { month: 'T2', positive: 180, negative: 55 },
  { month: 'T3', positive: 220, negative: 48 },
  { month: 'T4', positive: 195, negative: 62 },
  { month: 'T5', positive: 310, negative: 38 },
  { month: 'T6', positive: 280, negative: 71 },
];

const Reports = () => (
  <div className="space-y-8">
    {/* Page Header */}
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between flex-wrap gap-4">
      <div>
        <h1 className="font-display font-bold text-2xl text-ink dark:text-white">Reports</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Báo cáo tổng hợp theo thời gian</p>
      </div>
      <button className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-border dark:border-slate-700 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-card">
        <HiOutlineArrowDownTray className="w-4 h-4" />
        Export PDF
      </button>
    </motion.div>

    {/* Sentiment Trend Chart */}
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-card border border-border dark:border-slate-700"
    >
      <h3 className="font-display font-bold text-ink dark:text-white mb-1">Xu hướng cảm xúc theo tháng</h3>
      <p className="text-slate-400 text-sm mb-5">Tích cực vs Tiêu cực 6 tháng gần nhất</p>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={mockMonthly} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 13, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 12, fontSize: 13 }}
          />
          <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-sm text-slate-600">{v}</span>} />
          <Line type="monotone" dataKey="positive" name="Tích cực" stroke="#22C55E" strokeWidth={2.5} dot={{ r: 4, fill: '#22C55E' }} activeDot={{ r: 6 }} />
          <Line type="monotone" dataKey="negative" name="Tiêu cực" stroke="#EF4444" strokeWidth={2.5} dot={{ r: 4, fill: '#EF4444' }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>

    {/* Model Evaluation Metrics */}
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-card border border-border dark:border-slate-700"
    >
      <h3 className="font-display font-bold text-ink dark:text-white mb-4">Tóm tắt hiệu suất mô hình</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Accuracy', value: '94.2%', color: 'text-green-600' },
          { label: 'Precision', value: '93.8%', color: 'text-blue-600' },
          { label: 'Recall', value: '95.1%', color: 'text-violet-600' },
          { label: 'F1 Score', value: '94.4%', color: 'text-amber-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">{label}</p>
            <p className={`text-2xl font-display font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>
    </motion.div>
  </div>
);

export default Reports;