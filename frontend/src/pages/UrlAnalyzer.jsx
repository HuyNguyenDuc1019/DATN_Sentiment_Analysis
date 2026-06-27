import React, { useState } from 'react';
import toast from 'react-hot-toast';
import {
  Link as LinkIcon,
  Search,
  BarChart2,
  Loader2,
  MessageSquare,
  ShieldCheck,
  ThumbsUp,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { analyzeUrl } from '../services/api';

export default function UrlAnalyzerContent() {
  const { user } = useAuth();
  const [url, setUrl] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');

  const analyze = async () => {
    if (!/^https?:\/\//i.test(url.trim()) || !user?.id) {
      toast.error('Vui lòng nhập URL hợp lệ.');
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading('Đang cào và phân tích bình luận...');

    try {
      const data = await analyzeUrl({ url: url.trim(), user_id: user.id });
      setResults(data);
      toast.success(`Cào link thành công: ${data.length} bình luận.`, { id: loadingToast });
    } catch (error) {
      toast.error(
        error.message === 'Failed to fetch'
          ? 'Không kết nối được scraper Node.js tại cổng 3000.'
          : error.message,
        { id: loadingToast }
      );
    } finally {
      setLoading(false);
    }
  };

  const positive = results.filter((item) => item.prediction === 1).length;
  const avgConfidence = results.length
    ? results.reduce((sum, item) => sum + item.confidence, 0) / results.length
    : 0;

  const visible = results.filter((item) =>
    filter === 'all' || (filter === 'positive' ? item.prediction === 1 : item.prediction === 0)
  );

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500 font-sans">
      <div>
        <h1 className="text-2xl font-semibold text-white tracking-wide mb-1">Trình phân tích URL</h1>
        <p className="text-slate-400 text-sm">
          Phân tích cảm xúc hàng loạt từ các nền tảng thương mại điện tử.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl p-6 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-4 text-slate-200 font-medium">
            <LinkIcon className="w-5 h-5 text-indigo-400" />
            <h2>Nguồn dữ liệu</h2>
          </div>

          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !loading && analyze()}
                  disabled={loading}
                  placeholder="Dán link Shopee/Foody vào đây..."
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-70 disabled:cursor-wait"
                />
              </div>

              <button
                onClick={analyze}
                disabled={loading}
                className={`flex items-center justify-center gap-2 rounded-xl py-3 px-8 font-semibold text-white transition-all shadow-lg whitespace-nowrap ${
                  loading
                    ? 'cursor-wait border border-indigo-300/50 bg-indigo-600 shadow-indigo-600/30'
                    : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20 hover:shadow-indigo-500/30'
                }`}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <BarChart2 className="w-5 h-5" />}
                {loading ? 'ĐANG CÀO...' : 'PHÂN TÍCH'}
              </button>
            </div>

            {loading && (
              <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3">
                <div className="mb-2 flex items-center justify-between text-xs font-medium text-indigo-200">
                  <span>Đang cào bình luận từ đường link...</span>
                  <span>Vui lòng chờ</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-900">
                  <div className="h-full w-full origin-left animate-pulse rounded-full bg-gradient-to-r from-indigo-500 via-violet-400 to-cyan-300" />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl p-6 flex flex-col items-center justify-center">
          <h3 className="text-xs font-semibold tracking-wider text-slate-400 uppercase mb-4">
            Mức sử dụng API
          </h3>
          <div className="relative w-32 h-32 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90 transform">
              <circle cx="50" cy="50" r="40" fill="transparent" stroke="#1e293b" strokeWidth="8" />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                stroke="#6366f1"
                strokeWidth="8"
                strokeDasharray="251.2"
                strokeDashoffset={251.2 - Math.min(results.length / 500, 1) * 251.2}
                strokeLinecap="round"
                className="drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-white">{results.length}</span>
            </div>
          </div>
          <div className="text-sm text-slate-400 mt-2">/ 500 yêu cầu</div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-medium text-white mb-4">Thông tin trích xuất</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            icon={<MessageSquare className="w-5 h-5 text-indigo-400" />}
            title="Tổng số bình luận"
            value={results.length.toLocaleString('vi-VN')}
          />
          <StatCard
            icon={<ShieldCheck className="w-5 h-5 text-indigo-400" />}
            title="Độ tin cậy trung bình"
            value={`${(avgConfidence * 100).toFixed(1)}%`}
          />
          <StatCard
            icon={<ThumbsUp className="w-5 h-5 text-emerald-400" />}
            title="Tỷ lệ tích cực"
            value={`${results.length ? ((positive / results.length) * 100).toFixed(1) : '0.0'}%`}
          />
        </div>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl p-6">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-700">
          <h3 className="text-lg font-medium text-white">Dữ liệu thô</h3>
          <div className="flex gap-2 text-sm">
            <button
              onClick={() => setFilter('all')}
              className="px-4 py-1.5 rounded-lg bg-slate-700 text-white font-medium border border-slate-600"
            >
              Tất cả
            </button>
            <button
              onClick={() => setFilter('positive')}
              className="px-4 py-1.5 rounded-lg bg-transparent text-emerald-400 hover:bg-emerald-500/10 border border-transparent transition-colors"
            >
              Tích cực
            </button>
            <button
              onClick={() => setFilter('negative')}
              className="px-4 py-1.5 rounded-lg bg-transparent text-rose-400 hover:bg-rose-500/10 border border-transparent transition-colors"
            >
              Tiêu cực
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {visible.map((item, index) => (
            <ReviewItem
              key={`${item.text}-${index}`}
              content={item.text}
              date="Vừa phân tích"
              sentiment={item.prediction === 1 ? 'positive' : 'negative'}
              confidence={Math.round(item.confidence * 100)}
            />
          ))}

          {!visible.length && (
            <p className="py-8 text-center text-slate-500">Chưa có dữ liệu phân tích.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, title, value }) {
  return (
    <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-xl p-5 flex items-center gap-4 hover:bg-slate-800 transition-colors">
      <div className="w-12 h-12 rounded-lg bg-slate-900/50 border border-slate-700 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-1">
          {title}
        </h3>
        <div className="text-2xl font-bold text-white leading-none">{value}</div>
      </div>
    </div>
  );
}

function ReviewItem({ content, date, sentiment, confidence }) {
  const isPositive = sentiment === 'positive';

  return (
    <div
      className={`flex justify-between items-start gap-6 p-4 bg-slate-900/50 rounded-xl border border-slate-700/50 border-l-4 ${
        isPositive ? 'border-l-emerald-500' : 'border-l-rose-500'
      }`}
    >
      <div className="flex-1">
        <p className="text-slate-300 text-sm leading-relaxed mb-2">{content}</p>
        <span className="text-xs text-slate-500">{date}</span>
      </div>

      <div className="w-32 flex flex-col items-end flex-shrink-0">
        <span
          className={`px-3 py-1 text-xs font-semibold rounded-md uppercase tracking-wider mb-3 ${
            isPositive
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
          }`}
        >
          {isPositive ? 'Tích cực' : 'Tiêu cực'}
        </span>

        <div className="w-full flex flex-col gap-1.5">
          <div className="flex justify-between text-[10px] text-slate-400 font-medium">
            <span>Tin cậy</span>
            <span>{confidence}%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${isPositive ? 'bg-emerald-500' : 'bg-rose-500'}`}
              style={{ width: `${confidence}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}