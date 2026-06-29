import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart2,
  Link as LinkIcon,
  MessageSquare,
  Search,
  ShieldCheck,
  ThumbsUp,
} from 'lucide-react';
import { useTasks } from '../contexts/TaskContext';

export default function UrlAnalyzerContent() {
  const { urlAnalyzer } = useTasks();
  const { url, setUrl, results, count, loading, filter, setFilter, analyze } = urlAnalyzer;
  const [page, setPage] = useState(1);
  const pageSize = 6;
  const receivedCount = Number(count || results.length || 0);

  const positive = results.filter((item) => item.prediction === 1).length;
  const avgConfidence = results.length
    ? results.reduce((sum, item) => sum + normalizeConfidence(item.confidence), 0) / results.length
    : 0;

  const visible = results.filter((item) =>
    filter === 'all' || (filter === 'positive' ? item.prediction === 1 : item.prediction === 0)
  );
  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
  const pagedVisible = useMemo(() => visible.slice((page - 1) * pageSize, page * pageSize), [visible, page]);

  useEffect(() => {
    setPage(1);
  }, [filter, results.length]);

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500 font-sans">
      <div>
        <h1 className="text-2xl font-semibold text-white tracking-wide mb-1">Thu thập phản hồi từ đường dẫn</h1>
        <p className="text-slate-400 text-sm">
          Dán link quán hoặc gian hàng để hệ thống thu thập phản hồi và cập nhật trang Tổng quan.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl p-6 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-4 text-slate-200 font-medium">
            <LinkIcon className="w-5 h-5 text-indigo-400" />
            <h2>Đường dẫn cần theo dõi</h2>
          </div>

          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && !loading && analyze()}
                  placeholder="Dán link Foody/Shopee vào đây..."
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
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
                <BarChart2 className="w-5 h-5" />
                {loading ? 'ĐANG THU THẬP...' : 'THU THẬP'}
              </button>
            </div>

            {loading && (
              <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3">
                <div className="mb-2 flex flex-col gap-1 text-xs font-medium text-indigo-100 sm:flex-row sm:items-center sm:justify-between">
                  <span>Đang nạp dữ liệu từ đường dẫn.</span>
                  <span className="text-slate-300">Bạn có thể chuyển trang, hệ thống vẫn tiếp tục xử lý.</span>
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
            Số phản hồi đã nhận
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
                strokeDashoffset={251.2 - Math.min(receivedCount / 500, 1) * 251.2}
                strokeLinecap="round"
                className="drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-white">{receivedCount}</span>
            </div>
          </div>
          <div className="text-sm text-slate-400 mt-2">/ 500 phản hồi</div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-medium text-white mb-4">Thông tin vừa thu thập</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            icon={<MessageSquare className="w-5 h-5 text-indigo-400" />}
            title="Tổng phản hồi"
            value={receivedCount.toLocaleString('vi-VN')}
          />
          <StatCard
            icon={<ShieldCheck className="w-5 h-5 text-indigo-400" />}
            title="Độ chắc chắn trung bình"
            value={`${(avgConfidence * 100).toFixed(1)}%`}
          />
          <StatCard
            icon={<ThumbsUp className="w-5 h-5 text-emerald-400" />}
            title="Tỷ lệ khách hài lòng"
            value={`${receivedCount ? ((positive / receivedCount) * 100).toFixed(1) : '0.0'}%`}
          />
        </div>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl p-6">
        <div className="flex flex-col gap-4 mb-6 pb-4 border-b border-slate-700 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-medium text-white">Phản hồi đã nhận</h3>
          <div className="flex gap-2 text-sm">
            <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>
              Tất cả
            </FilterButton>
            <FilterButton active={filter === 'positive'} tone="positive" onClick={() => setFilter('positive')}>
              Hài lòng
            </FilterButton>
            <FilterButton active={filter === 'negative'} tone="negative" onClick={() => setFilter('negative')}>
              Chưa hài lòng
            </FilterButton>
          </div>
        </div>

        <div className="space-y-4">
          {loading && <ReviewListSkeleton />}

          {pagedVisible.map((item, index) => (
            <ReviewItem
              key={`${item.text}-${index}`}
              content={item.text}
              date="Vừa xử lý"
              sentiment={item.prediction === 1 ? 'positive' : 'negative'}
              confidence={Math.round(normalizeConfidence(item.confidence) * 100)}
            />
          ))}

          {!loading && !visible.length && (
            <p className="py-8 text-center text-slate-500">Chưa có dữ liệu phản hồi.</p>
          )}
          {!loading && visible.length > 0 && (
            <div className="flex items-center justify-between border-t border-slate-700 pt-4 text-sm text-slate-400">
              <span>Hiển thị {pagedVisible.length} trên tổng {visible.length} phản hồi</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1} className="rounded-lg border border-slate-700 px-3 py-1.5 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40">
                  Trước
                </button>
                <span className="rounded-lg bg-slate-700 px-3 py-1.5 text-white">{page}/{totalPages}</span>
                <button onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages} className="rounded-lg border border-slate-700 px-3 py-1.5 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40">
                  Sau
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterButton({ active, tone = 'default', onClick, children }) {
  const activeClass = {
    default: 'bg-slate-700 text-white border-slate-600',
    positive: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    negative: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  }[tone];

  const idleClass = {
    default: 'bg-transparent text-slate-400 border-transparent hover:bg-slate-700/40',
    positive: 'bg-transparent text-emerald-400 border-transparent hover:bg-emerald-500/10',
    negative: 'bg-transparent text-rose-400 border-transparent hover:bg-rose-500/10',
  }[tone];

  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-lg font-medium border transition-colors ${active ? activeClass : idleClass}`}
    >
      {children}
    </button>
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

function ReviewListSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-4">
          <div className="mb-3 h-4 w-3/4 rounded bg-slate-700" />
          <div className="h-3 w-1/3 rounded bg-slate-700/80" />
        </div>
      ))}
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

      <div className="w-36 flex flex-col items-end flex-shrink-0">
        <span
          className={`px-3 py-1 text-xs font-semibold rounded-md mb-3 ${
            isPositive
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
          }`}
        >
          {isPositive ? 'Khách hài lòng' : 'Khách chưa hài lòng'}
        </span>

        <div className="w-full flex flex-col gap-1.5">
          <div className="flex justify-between text-[10px] text-slate-400 font-medium">
            <span>Độ chắc chắn</span>
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

function normalizeConfidence(value) {
  const number = Number(value) || 0;
  return number > 1 ? number / 100 : number;
}
