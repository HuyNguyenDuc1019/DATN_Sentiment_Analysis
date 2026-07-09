import React, { useEffect, useMemo, useState } from 'react';
import { MessageSquare, ShieldCheck, ThumbsUp } from 'lucide-react';

import { useTasks } from '../../contexts/TaskContext';

import UrlInputPanel from '../../components/user/url-analyzer/UrlInputPanel';
import ResponseCounterCard from '../../components/user/url-analyzer/ResponseCounterCard';
import UrlStatsCard from '../../components/user/url-analyzer/UrlStatsCard';
import ReviewsPanel from '../../components/user/url-analyzer/ReviewsPanel';

import { normalizeConfidence } from '../../utils/user/urlAnalyzerUtils';

export default function UrlAnalyzer() {
  const { urlAnalyzer } = useTasks();
  const { url, setUrl, results, count, loading, filter, setFilter, analyze } = urlAnalyzer;

  const [page, setPage] = useState(1);

  // Mốc thời gian bắt đầu cào.
  // Bỏ trống: backend tự dùng lastScrapedDate để cào tiếp nối dữ liệu cũ.
  // Có chọn ngày: backend cào lại từ ngày này.
  const [customDate, setCustomDate] = useState('');

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

  const pagedVisible = useMemo(
    () => visible.slice((page - 1) * pageSize, page * pageSize),
    [visible, page],
  );

  useEffect(() => {
    setPage(1);
  }, [filter, results.length]);

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500 font-sans">
      <div>
        <h1 className="text-2xl font-semibold text-white tracking-wide mb-1">
          Thu thập phản hồi từ đường dẫn
        </h1>
        <p className="text-slate-400 text-sm">
          Dán link quán hoặc gian hàng để hệ thống thu thập phản hồi và cập nhật trang Tổng quan.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <UrlInputPanel
          url={url}
          setUrl={setUrl}
          loading={loading}
          analyze={() => analyze({ customDate })}
          customDate={customDate}
          setCustomDate={setCustomDate}
        />

        <ResponseCounterCard receivedCount={receivedCount} />
      </div>

      <div>
        <h2 className="text-lg font-medium text-white mb-4">Thông tin vừa thu thập</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <UrlStatsCard
            icon={<MessageSquare className="w-5 h-5 text-indigo-400" />}
            title="Tổng phản hồi"
            value={receivedCount.toLocaleString('vi-VN')}
          />

          <UrlStatsCard
            icon={<ShieldCheck className="w-5 h-5 text-indigo-400" />}
            title="Độ chắc chắn trung bình"
            value={`${(avgConfidence * 100).toFixed(1)}%`}
          />

          <UrlStatsCard
            icon={<ThumbsUp className="w-5 h-5 text-emerald-400" />}
            title="Tỷ lệ khách hài lòng"
            value={`${receivedCount ? ((positive / receivedCount) * 100).toFixed(1) : '0.0'}%`}
          />
        </div>
      </div>

      <ReviewsPanel
        filter={filter}
        setFilter={setFilter}
        loading={loading}
        visible={visible}
        pagedVisible={pagedVisible}
        page={page}
        totalPages={totalPages}
        setPage={setPage}
      />
    </div>
  );
}