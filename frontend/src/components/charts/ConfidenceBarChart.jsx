import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'framer-motion';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-border dark:border-slate-700 rounded-xl px-4 py-2.5 shadow-lg text-sm">
      <p className="font-semibold text-ink dark:text-white mb-1">{label}</p>
      <p className="text-slate-500 dark:text-slate-400">Avg Confidence: <span className="font-bold text-primary-600">{(payload[0].value * 100).toFixed(1)}%</span></p>
    </div>
  );
};

const ConfidenceBarChart = ({ results }) => {
  // Phòng hờ trường hợp results bị undefined hoặc null khi component render lần đầu
  const safeResults = results || [];

  const posResults = safeResults.filter((r) => r.prediction === 1);
  const negResults = safeResults.filter((r) => r.prediction === 0);
  const avgPos = posResults.length ? posResults.reduce((a, r) => a + r.confidence, 0) / posResults.length : 0;
  const avgNeg = negResults.length ? negResults.reduce((a, r) => a + r.confidence, 0) / negResults.length : 0;

  const data = [
    { name: 'Tích cực', value: avgPos },
    { name: 'Tiêu cực', value: avgNeg },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-card border border-border dark:border-slate-700"
    >
      <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Độ tin cậy trung bình</h3>
      <p className="text-ink dark:text-white font-display font-bold text-lg mb-4">Confidence Score</p>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} barSize={48} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 13, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} domain={[0, 1]} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(37,99,235,0.04)' }} />
          <Bar dataKey="value" radius={[8, 8, 0, 0]}>
            <Cell fill="#22C55E" />
            <Cell fill="#EF4444" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

export default ConfidenceBarChart;