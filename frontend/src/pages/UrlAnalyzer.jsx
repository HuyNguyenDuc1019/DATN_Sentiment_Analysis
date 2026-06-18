import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  HiFaceFrown,
  HiFaceSmile,
  HiOutlineChartBar,
  HiOutlineLink,
  HiOutlineSparkles,
} from 'react-icons/hi2';
import { supabase } from '@/services/supabaseClient';
import { computeStats } from '@/utils/stats';
import StatCard from '@/components/ui/StatCard';
import SentimentPieChart from '@/components/charts/SentimentPieChart';
import ConfidenceBarChart from '@/components/charts/ConfidenceBarChart';
import ResultsTable from '@/components/table/ResultsTable';
import FeedbackModal from '@/components/modals/FeedbackModal';
import ErrorState from '@/components/ui/ErrorState';
import Spinner from '@/components/ui/Spinner';

const SCRAPER_API = 'http://localhost:3000/api/scrape';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const normalizePrediction = (value) => {
  if (value === 1 || value === '1') return 1;
  if (value === 0 || value === '0') return 0;

  const label = String(value ?? '').trim().toLowerCase();
  return ['positive', 'pos', 'label_1', 'tích cực', 'tich cuc'].includes(label) ? 1 : 0;
};

const normalizeConfidence = (value) => {
  const confidence = Number(value) || 0;
  return confidence > 1 ? confidence / 100 : confidence;
};

const normalizeResult = (item) => ({
  text: item?.text ?? item?.content ?? item?.comment ?? item?.review ?? '',
  prediction: normalizePrediction(item?.prediction ?? item?.label ?? item?.ai_label),
  confidence: normalizeConfidence(item?.confidence),
});

// Node trả { success, data }, còn FastAPI trả { results }.
const extractResults = (payload, depth = 0) => {
  if (!payload || depth > 5) return [];
  if (Array.isArray(payload)) return payload;

  for (const key of ['results', 'data', 'reviews', 'comments', 'predictions']) {
    const results = extractResults(payload[key], depth + 1);
    if (results.length) return results;
  }

  return [];
};

const getCurrentUserId = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (!error && data?.user?.id) return data.user.id;

  return localStorage.getItem('user_id');
};

const UrlAnalyzer = () => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [editItem, setEditItem] = useState(null);

  const trimmedUrl = url.trim();
  const isValidUrl = /^https?:\/\//i.test(trimmedUrl);

  const analyze = async () => {
    if (!isValidUrl) {
      toast.error('Vui lòng nhập đường dẫn bắt đầu bằng http:// hoặc https://.');
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);
    setProgress(4);

    const ticker = window.setInterval(() => {
      setProgress((current) => Math.min(current + 1.2, 92));
    }, 500);

    try {
      const userId = await getCurrentUserId();

      if (!userId || !UUID_PATTERN.test(userId)) {
        throw new Error('Không tìm thấy user_id hợp lệ. Vui lòng đăng nhập lại.');
      }

      const response = await fetch(SCRAPER_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: trimmedUrl,
          user_id: userId,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || payload?.success === false) {
        throw new Error(
          payload?.error || payload?.detail || payload?.message || 'Máy cào dữ liệu trả về lỗi.'
        );
      }

      const normalizedResults = extractResults(payload)
        .map(normalizeResult)
        .filter((item) => item.text.trim());

      setProgress(100);
      setResults(normalizedResults);

      if (normalizedResults.length === 0) {
        throw new Error(
          payload?.data?.message ||
            payload?.message ||
            'Đã cào xong nhưng không tìm thấy bình luận hợp lệ.'
        );
      }

      toast.success(`Đã phân tích ${normalizedResults.length} bình luận.`);
    } catch (err) {
      const message =
        err instanceof TypeError && err.message === 'Failed to fetch'
          ? 'Không kết nối được máy cào. Hãy chạy file scraper/index.js ở cổng 3000.'
          : err.message;

      setError(message);
      toast.error(message);
    } finally {
      window.clearInterval(ticker);
      setLoading(false);
    }
  };

  const handleFeedbackSuccess = (item, newPrediction) => {
    setResults((current) =>
      current.map((result) =>
        result.text === item.text ? { ...result, prediction: newPrediction } : result
      )
    );
  };

  const stats = computeStats(results);

  return (
    <div className="space-y-6 sm:space-y-8">
      <motion.header initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-xl font-bold text-ink dark:text-white sm:text-2xl">
          URL Analyzer
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Dán link Foody hoặc Shopee để cào và phân tích bình luận
        </p>
      </motion.header>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl border border-border bg-white p-4 shadow-card dark:border-slate-700 dark:bg-slate-800 sm:p-6"
      >
        <label className="mb-3 block text-sm font-semibold text-slate-600 dark:text-slate-300">
          Đường dẫn cần phân tích
        </label>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <HiOutlineLink className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && !loading && analyze()}
              placeholder="https://www.foody.vn/..."
              disabled={loading}
              className="w-full rounded-xl border border-border bg-slate-50 py-3 pl-11 pr-4 text-sm text-ink outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-500/30 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900/50 dark:text-white"
            />
          </div>

          <button
            type="button"
            onClick={analyze}
            disabled={!isValidUrl || loading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? <Spinner size="sm" className="text-white" /> : <HiOutlineSparkles className="h-4 w-4" />}
            {loading ? 'Đang cào dữ liệu...' : 'Analyze'}
          </button>
        </div>

        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-5 overflow-hidden"
            >
              <div className="mb-2 flex justify-between gap-4 text-sm">
                <span className="text-slate-500 dark:text-slate-400">
                  Đang cào bình luận và gửi sang AI...
                </span>
                <span className="font-mono text-primary-600">{progress.toFixed(0)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                <motion.div
                  className="h-full rounded-full bg-primary-600"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>

      {error && <ErrorState message={error} onRetry={analyze} />}

      {results.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Tổng" value={stats.total} icon={<HiOutlineChartBar className="h-5 w-5 text-white" />} gradient="bg-gradient-to-br from-primary-600 to-blue-400" iconBg="bg-white/20" delay={0} />
            <StatCard label="Tích cực" value={stats.positive} icon={<HiFaceSmile className="h-5 w-5 text-white" />} gradient="bg-gradient-to-br from-green-500 to-emerald-400" iconBg="bg-white/20" delay={0.1} />
            <StatCard label="Tiêu cực" value={stats.negative} icon={<HiFaceFrown className="h-5 w-5 text-white" />} gradient="bg-gradient-to-br from-red-500 to-rose-400" iconBg="bg-white/20" delay={0.2} />
            <StatCard label="Avg Confidence" value={stats.avgConfidence * 100} suffix="%" icon={<HiOutlineSparkles className="h-5 w-5 text-white" />} gradient="bg-gradient-to-br from-violet-600 to-purple-400" iconBg="bg-white/20" delay={0.3} isFloat />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <SentimentPieChart positive={stats.positive} negative={stats.negative} />
            <ConfidenceBarChart results={results} />
          </div>

          <ResultsTable data={results} onEdit={setEditItem} />
          <FeedbackModal
            item={editItem}
            onClose={() => setEditItem(null)}
            onSuccess={handleFeedbackSuccess}
          />
        </>
      )}
    </div>
  );
};

export default UrlAnalyzer;
