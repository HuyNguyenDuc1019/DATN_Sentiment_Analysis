import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { HiOutlineLink, HiOutlineSparkles, HiOutlineChartBar, HiFaceSmile, HiFaceFrown } from 'react-icons/hi2';
import { analyzeUrl } from '@/services/api';
import { computeStats } from '@/utils/stats';
import StatCard from '@/components/ui/StatCard';
import SentimentPieChart from '@/components/charts/SentimentPieChart';
import ConfidenceBarChart from '@/components/charts/ConfidenceBarChart';
import ResultsTable from '@/components/table/ResultsTable';
import FeedbackModal from '@/components/modals/FeedbackModal';
import ErrorState from '@/components/ui/ErrorState';
import Spinner from '@/components/ui/Spinner';

const URL_PATTERNS = [
  'shopee.vn/product/',
  'foody.vn/',
  'shopee.vn/',
];

const UrlAnalyzer = () => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [editItem, setEditItem] = useState(null);

  const isValidUrl = url.trim().startsWith('http');

  const analyze = async () => {
    if (!isValidUrl) { 
      toast.error('Vui lòng nhập URL hợp lệ.'); 
      return; 
    }
    setLoading(true);
    setError(null);
    setProgress(0);
    setResults([]);

    const ticker = setInterval(() => setProgress((p) => Math.min(p + 1.5, 88)), 300);
    try {
      const data = await analyzeUrl({ url: url.trim() });
      clearInterval(ticker);
      setProgress(100);
      setResults(data);
      toast.success(`Phân tích xong ${data.length} bình luận từ URL!`);
    } catch (err) {
      clearInterval(ticker);
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFeedbackSuccess = (item, newPred) => {
    setResults((prev) => prev.map((r) => r.text === item.text ? { ...r, prediction: newPred } : r));
  };

  const stats = computeStats(results);

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display font-bold text-2xl text-ink dark:text-white">URL Analyzer</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Phân tích bình luận trực tiếp từ Shopee hoặc Foody</p>
      </motion.div>

      {/* URL Input */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-card border border-border dark:border-slate-700"
      >
        <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-3">
          Nhập URL sản phẩm
        </label>
        <div className="flex gap-3 flex-col sm:flex-row">
          <div className="relative flex-1">
            <HiOutlineLink className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && analyze()}
              placeholder="Dán link Shopee hoặc Foody tại đây..."
              disabled={loading}
              className="w-full pl-11 pr-4 py-3 text-sm bg-slate-50 dark:bg-slate-900/50 border border-border dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 text-ink dark:text-white placeholder-slate-400 disabled:opacity-60 transition-all"
            />
          </div>
          <button
            onClick={analyze}
            disabled={!isValidUrl || loading}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm whitespace-nowrap"
          >
            {loading ? <Spinner size="sm" className="text-white" /> : <HiOutlineSparkles className="w-4 h-4" />}
            {loading ? 'Đang phân tích...' : 'Analyze'}
          </button>
        </div>

        {/* Quick examples */}
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="text-xs text-slate-400">Ví dụ:</span>
          {URL_PATTERNS.map((p) => (
            <button
              key={p}
              onClick={() => setUrl(`https://${p}123456`)}
              className="text-xs text-primary-500 hover:text-primary-700 font-mono bg-primary-50 dark:bg-primary-900/20 px-2 py-0.5 rounded-md hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors"
            >
              {p}...
            </button>
          ))}
        </div>

        {/* Progress */}
        <AnimatePresence>
          {loading && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-5">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-slate-500 dark:text-slate-400">Đang crawl & phân tích bình luận...</span>
                <span className="text-sm font-mono text-primary-600">{progress.toFixed(0)}%</span>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary-600 to-blue-400 rounded-full"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Error */}
      {error && <ErrorState message={error} onRetry={() => setError(null)} />}

      {/* Results */}
      {results.length > 0 && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Tổng" value={stats.total} icon={<HiOutlineChartBar className="w-5 h-5 text-white" />} gradient="bg-gradient-to-br from-primary-600 to-blue-400" iconBg="bg-white/20" delay={0} />
            <StatCard label="Tích cực" value={stats.positive} icon={<HiFaceSmile className="w-5 h-5 text-white" />} gradient="bg-gradient-to-br from-green-500 to-emerald-400" iconBg="bg-white/20" delay={0.1} />
            <StatCard label="Tiêu cực" value={stats.negative} icon={<HiFaceFrown className="w-5 h-5 text-white" />} gradient="bg-gradient-to-br from-red-500 to-rose-400" iconBg="bg-white/20" delay={0.2} />
            <StatCard label="Avg Confidence" value={stats.avgConfidence * 100} suffix="%" icon={<HiOutlineSparkles className="w-5 h-5 text-white" />} gradient="bg-gradient-to-br from-violet-600 to-purple-400" iconBg="bg-white/20" delay={0.3} isFloat />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SentimentPieChart positive={stats.positive} negative={stats.negative} />
            <ConfidenceBarChart results={results} />
          </div>
          <ResultsTable data={results} onEdit={setEditItem} />
          <FeedbackModal item={editItem} onClose={() => setEditItem(null)} onSuccess={handleFeedbackSuccess} />
        </>
      )}
    </div>
  );
};

export default UrlAnalyzer;