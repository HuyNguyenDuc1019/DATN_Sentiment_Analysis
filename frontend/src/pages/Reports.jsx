import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { HiOutlineArrowDownTray, HiOutlineArrowPath } from 'react-icons/hi2';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { supabase } from '@/services/supabaseClient';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';

const COLORS = ['#22C55E', '#EF4444'];

const normalizeConfidence = (value) => {
  const num = Number(value) || 0;
  return num > 1 ? num / 100 : num;
};

const getCurrentUserId = async () => {
  const { data } = await supabase.auth.getUser();
  return data?.user?.id || localStorage.getItem('user_id');
};

const fetchAllScrapedReviews = async (userId) => {
  const pageSize = 1000;
  let from = 0;
  let allRows = [];

  while (true) {
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from('scraped_reviews')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .range(from, to);

    if (error) throw error;

    allRows = [...allRows, ...(data || [])];
    if (!data || data.length < pageSize) break;

    from += pageSize;
  }

  return allRows;
};

const normalizeRow = (row) => ({
  text: row.content || '',
  prediction: Number(row.ai_label) === 1 ? 1 : 0,
  confidence: normalizeConfidence(row.confidence),
  created_at: row.created_at,
});

const dayLabel = (value) => {
  const date = value ? new Date(value) : new Date();
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};

const previousDayLabel = (label) => {
  const [day, month] = label.split('/').map(Number);
  const date = new Date(new Date().getFullYear(), month - 1, day);
  date.setDate(date.getDate() - 1);
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};

const Reports = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      const userId = await getCurrentUserId();

      if (!userId) {
        setRows([]);
        setError('Chưa có user_id. Hãy đăng nhập hoặc lưu UUID user vào localStorage.user_id.');
        return;
      }

      const data = await fetchAllScrapedReviews(userId);
      setRows((data || []).map(normalizeRow));
    } catch (err) {
      setError(err.message || 'Không tải được dữ liệu báo cáo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const summary = useMemo(() => {
    const total = rows.length;
    const positive = rows.filter((r) => r.prediction === 1).length;
    const negative = total - positive;
    const avgConfidence = total
      ? rows.reduce((sum, row) => sum + row.confidence, 0) / total
      : 0;
    const positiveRate = total ? (positive / total) * 100 : 0;

    return { total, positive, negative, avgConfidence, positiveRate };
  }, [rows]);

  const trendData = useMemo(() => {
    const grouped = new Map();

    rows.forEach((row) => {
      const key = dayLabel(row.created_at);
      const current = grouped.get(key) || { date: key, positive: 0, negative: 0 };

      if (row.prediction === 1) {
        current.positive += 1;
      } else {
        current.negative += 1;
      }

      grouped.set(key, current);
    });

    const data = Array.from(grouped.values()).slice(-14);

    if (data.length === 1) {
      return [
        { date: previousDayLabel(data[0].date), positive: 0, negative: 0 },
        data[0],
      ];
    }

    return data;
  }, [rows]);

  const pieData = useMemo(() => [
    { name: 'Tích cực', value: summary.positive },
    { name: 'Tiêu cực', value: summary.negative },
  ], [summary]);

  if (loading) {
    return (
      <div className="min-h-[360px] flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-300">
          <Spinner />
          Đang tải báo cáo...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-ink dark:text-white">Reports</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Báo cáo tổng hợp theo thời gian</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-border dark:border-slate-700 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-card"
          >
            <HiOutlineArrowPath className="w-4 h-4" />
            Làm mới
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-border dark:border-slate-700 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-card">
            <HiOutlineArrowDownTray className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </motion.div>

      {error && <ErrorState message={error} onRetry={loadData} />}

      <div className="grid grid-cols-1 xl:grid-cols-[1.7fr_0.8fr] gap-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-card border border-border dark:border-slate-700"
        >
          <h3 className="font-display font-bold text-ink dark:text-white mb-1">Xu hướng cảm xúc theo ngày</h3>
          <p className="text-slate-400 text-sm mb-5">Tích cực vs Tiêu cực trong các ngày gần nhất</p>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trendData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 13, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 12, fontSize: 13 }} />
              <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-sm text-slate-600 dark:text-slate-300">{v}</span>} />
              <Line type="monotone" dataKey="positive" name="Tích cực" stroke="#22C55E" strokeWidth={2.5} dot={{ r: 4, fill: '#22C55E' }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="negative" name="Tiêu cực" stroke="#EF4444" strokeWidth={2.5} dot={{ r: 4, fill: '#EF4444' }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="relative bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-card border border-border dark:border-slate-700 overflow-hidden"
        >
          <div className="absolute inset-x-10 -top-24 h-44 rounded-full bg-primary-500/20 blur-3xl" />
          <h3 className="relative font-display font-bold text-ink dark:text-white mb-1">Tỷ lệ cảm xúc</h3>
          <p className="relative text-slate-400 text-sm mb-4">Tổng {summary.total.toLocaleString('vi-VN')} bình luận</p>

          <div className="relative h-[250px]">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={72}
                    outerRadius={102}
                    paddingAngle={5}
                    dataKey="value"
                    startAngle={90}
                    endAngle={450}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={entry.name} fill={COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </motion.div>

            <div className="pointer-events-none absolute inset-0 flex items-center justify-center pb-8">
              <div className="text-center">
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="text-3xl font-display font-bold text-ink dark:text-white"
                >
                  {summary.positiveRate.toFixed(1)}%
                </motion.p>
                <p className="text-xs text-slate-400 mt-1">Tích cực</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-card border border-border dark:border-slate-700"
      >
        <h3 className="font-display font-bold text-ink dark:text-white mb-4">Tóm tắt hiệu suất mô hình</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'TOTAL', value: summary.total.toLocaleString('vi-VN'), color: 'text-primary-600' },
            { label: 'POSITIVE', value: summary.positive.toLocaleString('vi-VN'), color: 'text-green-600' },
            { label: 'NEGATIVE', value: summary.negative.toLocaleString('vi-VN'), color: 'text-red-600' },
            { label: 'AVG CONFIDENCE', value: `${(summary.avgConfidence * 100).toFixed(1)}%`, color: 'text-violet-600' },
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
};

export default Reports;
