import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '../../contexts/AuthContext';
import UpgradeModal from '../../components/common/UpgradeModal';

import ReportSkeleton from '../../components/user/report/ReportSkeleton';
import FilterBar from '../../components/user/report/FilterBar';
import ComparisonChartCard from '../../components/user/report/ComparisonChartCard';
import WordCloudCard from '../../components/user/report/WordCloudCard';
import PerformanceSummaryCard from '../../components/user/report/PerformanceSummaryCard';

import {
  buildWordCloudFromReviews,
  extractWordCloud,
  getSourceName,
  toAnalyticsSource,
} from '../../utils/user/reportUtils';

import {
  fetchReportKeywordAnalytics,
  fetchReportReviews,
} from '../../services/user/reportService';

export default function Report() {
  const { user, userProfile, refreshUserProfile } = useAuth();
  const reportRef = useRef(null);

  const [reviews, setReviews] = useState([]);
  const [keywordAnalytics, setKeywordAnalytics] = useState(null);
  const [filters, setFilters] = useState({ startDate: '', endDate: '', source: 'Tất cả' });
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  const isVip = userProfile?.tier === 'vip';

  const load = useCallback(async () => {
    if (!user?.id) return;

    if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) {
      toast.error('Ngày bắt đầu không được lớn hơn ngày kết thúc.');
      return;
    }

    setLoading(true);

    try {
      const source = filters.source === 'Tất cả' ? '' : filters.source;
      const sourceUrl = toAnalyticsSource(filters.source);

      const [reviewRows, keywordPayload] = await Promise.allSettled([
        fetchReportReviews(user.id, { ...filters, source }),
        fetchReportKeywordAnalytics({ userId: user.id, sourceUrl }),
      ]);

      if (reviewRows.status === 'fulfilled') {
        setReviews(reviewRows.value);
      } else {
        throw reviewRows.reason;
      }

      setKeywordAnalytics(keywordPayload.status === 'fulfilled' ? keywordPayload.value : null);
    } catch (error) {
      toast.error(error.message || 'Không tải được báo cáo.');
    } finally {
      setLoading(false);
    }
  }, [filters, user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const report = useMemo(() => {
    const positive = reviews.filter((item) => Number(item.ai_label) === 1).length;
    const confidence = reviews.length
      ? reviews.reduce((sum, item) => sum + Number(item.confidence || 0), 0) / reviews.length
      : 0;
    const normalizedConfidence = confidence > 1 ? confidence / 100 : confidence;

    const groups = {};

    reviews.forEach((item) => {
      const key = getSourceName(item.source_url);
      groups[key] ||= { source: key, positive: 0, negative: 0 };
      groups[key][Number(item.ai_label) === 1 ? 'positive' : 'negative'] += 1;
    });

    const hasDateFilter = Boolean(filters.startDate || filters.endDate);

    return {
      positive,
      negative: reviews.length - positive,
      confidence: normalizedConfidence,
      groups: Object.values(groups),
      words: reviews.length
        ? hasDateFilter
          ? buildWordCloudFromReviews(reviews)
          : extractWordCloud(keywordAnalytics) || buildWordCloudFromReviews(reviews)
        : [],
    };
  }, [filters.endDate, filters.startDate, keywordAnalytics, reviews]);

  const exportPdf = async () => {
    if (!isVip) {
      setIsUpgradeModalOpen(true);
      return;
    }

    if (!reportRef.current || exporting) return;

    setExporting(true);

    try {
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const html2pdf = (await import('html2pdf.js')).default;
      const date = new Date().toISOString().slice(0, 10);

      await html2pdf()
        .set({
          margin: 8,
          filename: `bao-cao-phan-hoi-${date}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: '#0f172a', logging: false },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
        })
        .from(reportRef.current)
        .save();
    } catch (error) {
      toast.error(`Không thể xuất PDF: ${error.message}`);
    } finally {
      setExporting(false);
    }
  };

  if (loading && !reviews.length) {
    return <ReportSkeleton />;
  }

  return (
    <div className="flex h-full flex-col space-y-6 overflow-y-auto p-8 font-sans animate-in fade-in duration-500">
      <div className="mb-2 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="mb-1 text-2xl font-semibold tracking-wide text-white">Báo cáo phản hồi</h1>
          <p className="text-sm text-slate-400">Tổng hợp tình hình khách hàng theo thời gian và nguồn dữ liệu.</p>
        </div>

        <button
          type="button"
          onClick={exportPdf}
          disabled={exporting || loading}
          className={`flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 font-medium shadow-lg transition-colors disabled:opacity-60 ${
            isVip
              ? 'bg-indigo-600 text-white shadow-indigo-600/20 hover:bg-indigo-700'
              : 'bg-slate-700 text-slate-300 shadow-slate-950/20 hover:bg-slate-600'
          }`}
        >
          <Download className="h-4 w-4" />
          {exporting ? 'Đang tạo PDF...' : isVip ? 'Xuất PDF' : '🔒 Xuất PDF'}
        </button>
      </div>

      <FilterBar
        filters={filters}
        setFilters={setFilters}
        loading={loading}
        onRefresh={load}
      />

      <div ref={reportRef} className="print-report space-y-6 bg-[#0f172a] p-1">
        <div className={`${exporting ? 'block' : 'hidden'} pdf-heading text-white`}>
          <h2 className="text-2xl font-bold">Báo cáo phản hồi khách hàng</h2>
          <p className="mt-1 text-sm text-slate-400">Ngày xuất: {new Date().toLocaleDateString('vi-VN')}</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <ComparisonChartCard groups={report.groups} />
          <WordCloudCard
            words={report.words}
            isVip={isVip}
            onUpgrade={() => setIsUpgradeModalOpen(true)}
          />
        </div>

        <PerformanceSummaryCard
          total={reviews.length}
          positive={report.positive}
          negative={report.negative}
          confidence={report.confidence}
        />
      </div>

      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        onUpgraded={refreshUserProfile}
      />
    </div>
  );
}
