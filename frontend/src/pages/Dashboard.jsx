import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  HiOutlineChartBar,
  HiFaceSmile,
  HiFaceFrown,
  HiOutlineSparkles,
} from 'react-icons/hi2';
import { supabase } from "@/services/supabaseClient";
import StatCard from '@/components/ui/StatCard';
import SentimentPieChart from '@/components/charts/SentimentPieChart';
import ConfidenceBarChart from '@/components/charts/ConfidenceBarChart';
import Spinner from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';

const normalizeConfidence = (value) => {
  const num = Number(value) || 0;
  return num > 1 ? num / 100 : num;
};

const normalizeRow = (row) => ({
  text: row.content || '',
  prediction: Number(row.ai_label) === 1 ? 1 : 0,
  confidence: normalizeConfidence(row.confidence),
  created_at: row.created_at,
});

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
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    allRows = [...allRows, ...(data || [])];

    if (!data || data.length < pageSize) break;

    from += pageSize;
  }

  return allRows;
};

const Dashboard = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
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
        setError(err.message || 'Không tải được dữ liệu Dashboard.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const stats = useMemo(() => {
    const total = rows.length;
    const positive = rows.filter((r) => r.prediction === 1).length;
    const negative = total - positive;
    const avgConfidence = total
      ? rows.reduce((sum, r) => sum + r.confidence, 0) / total
      : 0;

    return { total, positive, negative, avgConfidence };
  }, [rows]);

  if (loading) {
    return (
      <div className="min-h-[360px] flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-300">
          <Spinner />
          Đang tải dữ liệu Dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-xs font-semibold rounded-full border border-primary-100 dark:border-primary-800">
            <HiOutlineSparkles className="w-3.5 h-3.5" />
            Supabase Live
          </span>
        </div>
        <h1 className="font-display font-bold text-2xl text-ink dark:text-white">Dashboard Tổng quan</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Thống kê từ bảng scraped_reviews theo tài khoản đang đăng nhập</p>
      </motion.div>

      {error && <ErrorState message={error} onRetry={() => window.location.reload()} />}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Tổng bình luận" value={stats.total} icon={<HiOutlineChartBar className="w-5 h-5 text-white" />} gradient="bg-gradient-to-br from-primary-600 to-blue-400" iconBg="bg-white/20" delay={0} />
        <StatCard label="Tích cực" value={stats.positive} icon={<HiFaceSmile className="w-5 h-5 text-white" />} gradient="bg-gradient-to-br from-green-500 to-emerald-400" iconBg="bg-white/20" delay={0.1} />
        <StatCard label="Tiêu cực" value={stats.negative} icon={<HiFaceFrown className="w-5 h-5 text-white" />} gradient="bg-gradient-to-br from-red-500 to-rose-400" iconBg="bg-white/20" delay={0.2} />
        <StatCard label="Avg Confidence" value={stats.avgConfidence * 100} suffix="%" icon={<HiOutlineSparkles className="w-5 h-5 text-white" />} gradient="bg-gradient-to-br from-violet-600 to-purple-400" iconBg="bg-white/20" delay={0.3} isFloat />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SentimentPieChart positive={stats.positive} negative={stats.negative} />
        <ConfidenceBarChart results={rows} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-gradient-to-br from-primary-600 to-blue-500 rounded-2xl p-6 text-white"
      >
        <h3 className="font-display font-bold text-lg mb-1">Dữ liệu thật từ Supabase</h3>
        <p className="text-blue-100 text-sm mb-4">Dashboard chỉ lấy các dòng trong scraped_reviews có user_id trùng với tài khoản hiện tại.</p>
        <div className="flex flex-wrap gap-3">
          <a href="/batch" className="inline-flex items-center gap-2 px-4 py-2 bg-white text-primary-600 font-semibold text-sm rounded-xl hover:bg-blue-50 transition-colors">
            Upload CSV
          </a>
          <a href="/url" className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 text-white font-semibold text-sm rounded-xl hover:bg-white/30 transition-colors border border-white/30">
            Phân tích URL
          </a>
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
