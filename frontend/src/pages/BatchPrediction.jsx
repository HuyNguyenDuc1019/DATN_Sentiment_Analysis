import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Papa from 'papaparse';
import toast from 'react-hot-toast';
import {
  HiOutlineArrowUpTray,
  HiOutlineDocumentText,
  HiXMark,
  HiOutlineSparkles,
} from 'react-icons/hi2';
import { predictBatch } from '@/services/api';
import { computeStats } from '@/utils/stats';
import StatCard from '@/components/ui/StatCard';
import SentimentPieChart from '@/components/charts/SentimentPieChart';
import ConfidenceBarChart from '@/components/charts/ConfidenceBarChart';
import ResultsTable from '@/components/table/ResultsTable';
import FeedbackModal from '@/components/modals/FeedbackModal';
import ErrorState from '@/components/ui/ErrorState';
import Spinner from '@/components/ui/Spinner';
import { HiOutlineChartBar, HiFaceSmile, HiFaceFrown } from 'react-icons/hi2';

const BatchPrediction = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const handleFile = (f) => {
    if (!f.name.endsWith('.csv')) { 
      toast.error('Vui lòng chọn file .csv'); 
      return; 
    }
    setFile(f);
    setResults([]);
    setError(null);
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const analyze = () => {
    if (!file) return;
    setLoading(true);
    setProgress(0);
    setError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (parsed) => {
        // Find text column – look for common names
        const cols = parsed.meta.fields || [];
        const textCol = cols.find((c) =>
          ['comment', 'text', 'review', 'content', 'bình luận', 'noi_dung'].includes(c.toLowerCase())
        ) || cols[0];

        if (!textCol) {
          setError('Không tìm thấy cột văn bản. Đổi tên cột thành "comment" hoặc "text".');
          setLoading(false);
          return;
        }

        const texts = parsed.data.map((row) => row[textCol]).filter(Boolean);
        if (!texts.length) {
          setError('File CSV trống hoặc không có dữ liệu hợp lệ.');
          setLoading(false);
          return;
        }

        // Simulate progress while waiting
        const ticker = setInterval(() => setProgress((p) => Math.min(p + 2, 90)), 200);
        try {
          const data = await predictBatch({ texts });
          clearInterval(ticker);
          setProgress(100);
          setResults(data);
          toast.success(`Phân tích xong ${data.length} bình luận!`);
        } catch (err) {
          clearInterval(ticker);
          setError(err.message);
          toast.error(err.message);
        } finally {
          setLoading(false);
        }
      },
      error: (err) => {
        setError(`Lỗi đọc CSV: ${err.message}`);
        setLoading(false);
      },
    });
  };

  const stats = computeStats(results);

  const handleFeedbackSuccess = (item, newPred) => {
    setResults((prev) =>
      prev.map((r) => r.text === item.text ? { ...r, prediction: newPred } : r)
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display font-bold text-2xl text-ink dark:text-white">Batch Prediction</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Upload file CSV để phân tích hàng loạt bình luận</p>
      </motion.div>

      {/* Upload zone */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => !loading && inputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
            dragging
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
              : 'border-border dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
          } ${loading ? 'pointer-events-none' : ''}`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <AnimatePresence mode="wait">
            {file ? (
              <motion.div key="file" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 bg-primary-50 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center">
                  <HiOutlineDocumentText className="w-7 h-7 text-primary-600" />
                </div>
                <div>
                  <p className="font-semibold text-ink dark:text-white">{file.name}</p>
                  <p className="text-slate-400 text-sm">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null); setResults([]); setError(null); }}
                  className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors"
                >
                  <HiXMark className="w-3.5 h-3.5" /> Xóa file
                </button>
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center">
                  <HiOutlineArrowUpTray className="w-7 h-7 text-slate-400" />
                </div>
                <div>
                  <p className="font-semibold text-slate-600 dark:text-slate-300">Kéo thả file CSV vào đây</p>
                  <p className="text-slate-400 text-sm mt-1">hoặc <span className="text-primary-600 font-medium">click để chọn file</span></p>
                </div>
                <p className="text-xs text-slate-400">Cột: <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">comment</code> hoặc <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">text</code></p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Progress */}
        <AnimatePresence>
          {loading && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <Spinner size="sm" />
                  Đang phân tích {file?.name}...
                </div>
                <span className="text-sm font-mono text-primary-600">{progress}%</span>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary-600 to-blue-400 rounded-full"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Analyze button */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={analyze}
            disabled={!file || loading}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {loading ? <Spinner size="sm" className="text-white" /> : <HiOutlineSparkles className="w-4 h-4" />}
            {loading ? 'Đang phân tích...' : 'Phân tích ngay'}
          </button>
        </div>
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

export default BatchPrediction;