import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

const COLORS = ['#22C55E', '#EF4444'];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-border dark:border-slate-700 rounded-xl px-4 py-2.5 shadow-lg text-sm">
      <p className="font-semibold text-ink dark:text-white">{payload[0].name}</p>
      <p className="text-slate-500 dark:text-slate-400">{payload[0].value} bình luận ({payload[0].payload.pct}%)</p>
    </div>
  );
};

const SentimentPieChart = ({ positive = 0, negative = 0 }) => {
  const total = positive + negative;
  const data = [
    { name: 'Tích cực', value: positive, pct: total ? ((positive / total) * 100).toFixed(1) : 0 },
    { name: 'Tiêu cực', value: negative, pct: total ? ((negative / total) * 100).toFixed(1) : 0 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-card border border-border dark:border-slate-700"
    >
      <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Phân bổ cảm xúc</h3>
      <p className="text-ink dark:text-white font-display font-bold text-lg mb-4">Positive vs Negative</p>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value" stroke="none">
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value) => <span className="text-sm text-slate-600 dark:text-slate-300">{value}</span>}
            iconType="circle"
            iconSize={8}
          />
        </PieChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

export default SentimentPieChart;