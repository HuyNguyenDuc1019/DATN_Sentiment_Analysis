import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '../../contexts/AuthContext';

import ReportSkeleton from '../../components/user/report/ReportSkeleton';
import FilterBar from '../../components/user/report/FilterBar';
import ComparisonChartCard from '../../components/user/report/ComparisonChartCard';
import WordCloudCard from '../../components/user/report/WordCloudCard';
import PerformanceSummaryCard from '../../components/user/report/PerformanceSummaryCard';

import {
  buildWordCloudFromReviews,
  extractWordCloud,
  toAnalyticsSource,
} from '../../utils/user/reportUtils';

import {
  fetchReportKeywordAnalytics,
  fetchReportReviews,
} from '../../services/user/reportService';

function normalizeLabel(value) {
  if (value === 1 || value === '1') return 1;

  const text = String(value ?? '').trim().toLowerCase();

  if (
    [
      'positive',
      'pos',
      'label_1',
      'tích cực',
      'tich cuc',
      'khách hài lòng',
      'khach hai long',
    ].includes(text)
  ) {
    return 1;
  }

  return 0;
}

function normalizeConfidence(value) {
  const number = Number(value || 0);
  return number > 1 ? number / 100 : number;
}

function getReviewSource(item) {
  const datasetType = String(item.dataset_type || '').toLowerCase();
  const datasetName = String(item.dataset_name || '').toLowerCase();
  const sourceUrl = String(item.source_url || '').toLowerCase();

  if (
    datasetType === 'google_maps' ||
    datasetName.includes('google') ||
    sourceUrl.includes('google.com/maps') ||
    sourceUrl.includes('www.google.com/maps') ||
    sourceUrl.includes('maps.google.com') ||
    sourceUrl.includes('maps.app.goo.gl') ||
    sourceUrl.includes('goo.gl/maps') ||
    sourceUrl.includes('google.com/search')
  ) {
    return 'Google Maps';
  }

  if (
    datasetType === 'foody' ||
    datasetName.includes('foody') ||
    sourceUrl.includes('foody.vn')
  ) {
    return 'Foody';
  }

  if (
    datasetType === 'csv' ||
    datasetName.includes('csv') ||
    sourceUrl === 'csv_upload' ||
    sourceUrl.includes('csv_upload') ||
    sourceUrl === 'csv'
  ) {
    return 'CSV';
  }

  return 'Khác';
}

export default function Report() {
  const { user } = useAuth();
  const reportRef = useRef(null);

  const [reviews, setReviews] = useState([]);
  const [keywordAnalytics, setKeywordAnalytics] = useState(null);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    source: 'Tất cả',
  });
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;

    if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) {
      toast.error('Ngày bắt đầu không được lớn hơn ngày kết thúc.');
      return;
    }

    setLoading(true);

    try {
      /**
       * Ở đây vẫn lấy dữ liệu theo filter từ backend.
       * Sau đó phía dưới vẫn lọc lại local bằng filteredReviews.
       * Như vậy nếu backend chưa hỗ trợ Google Maps thì frontend vẫn lọc đúng.
       */
      const source = filters.source === 'Tất cả' ? '' : filters.source;
      const sourceUrl = toAnalyticsSource(filters.source);

      const [reviewRows, keywordPayload] = await Promise.allSettled([
        fetchReportReviews(user.id, {
          ...filters,
          source,
        }),
        fetchReportKeywordAnalytics({
          userId: user.id,
          sourceUrl,
        }),
      ]);

      if (reviewRows.status === 'fulfilled') {
        setReviews(Array.isArray(reviewRows.value) ? reviewRows.value : []);
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

  /**
   * Quan trọng:
   * Nếu chọn "Tất cả" thì giữ toàn bộ nguồn.
   * Nếu chọn "Google Maps" thì chỉ lấy review Google Maps.
   * Nếu chọn "Foody" thì chỉ lấy review Foody.
   * Nếu chọn "CSV" thì chỉ lấy review CSV.
   */
  const filteredReviews = useMemo(() => {
    if (filters.source === 'Tất cả') {
      return reviews;
    }

    return reviews.filter((item) => getReviewSource(item) === filters.source);
  }, [filters.source, reviews]);

  const report = useMemo(() => {
    const positive = filteredReviews.filter((item) => normalizeLabel(item.ai_label) === 1).length;

    const confidence = filteredReviews.length
      ? filteredReviews.reduce((sum, item) => sum + Number(item.confidence || 0), 0) /
        filteredReviews.length
      : 0;

    const normalizedConfidence = normalizeConfidence(confidence);

    const groups = {};

    filteredReviews.forEach((item) => {
      const sourceName = getReviewSource(item);
      const label = normalizeLabel(item.ai_label);

      groups[sourceName] ||= {
        source: sourceName,
        positive: 0,
        negative: 0,
        total: 0,
      };

      if (label === 1) {
        groups[sourceName].positive += 1;
      } else {
        groups[sourceName].negative += 1;
      }

      groups[sourceName].total += 1;
    });

    /**
     * Khi chọn "Tất cả nguồn":
     * hiện đủ Foody, Google Maps, CSV, Khác nếu có dữ liệu.
     *
     * Khi chọn riêng "Google Maps":
     * filteredReviews chỉ còn Google Maps nên chart chỉ hiện Google Maps.
     */
    const orderedSources = ['Foody', 'Google Maps', 'CSV', 'Khác'];

    const sourceGroups = orderedSources
      .filter((sourceName) => groups[sourceName])
      .map((sourceName) => groups[sourceName]);

    const otherGroups = Object.values(groups).filter(
      (group) => !orderedSources.includes(group.source),
    );

    const finalGroups = [...sourceGroups, ...otherGroups];

    const hasDateFilter = Boolean(filters.startDate || filters.endDate);

    return {
      positive,
      negative: filteredReviews.length - positive,
      confidence: normalizedConfidence,
      groups: finalGroups,
      words: filteredReviews.length
        ? hasDateFilter
          ? buildWordCloudFromReviews(filteredReviews)
          : extractWordCloud(keywordAnalytics) || buildWordCloudFromReviews(filteredReviews)
        : [],
    };
  }, [
    filters.endDate,
    filters.startDate,
    filteredReviews,
    keywordAnalytics,
  ]);

  const exportPdf = async () => {
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
          image: {
            type: 'jpeg',
            quality: 0.98,
          },
          html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: '#0f172a',
            logging: false,
          },
          jsPDF: {
            unit: 'mm',
            format: 'a4',
            orientation: 'landscape',
          },
          pagebreak: {
            mode: ['avoid-all', 'css', 'legacy'],
          },
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
          <h1 className="mb-1 text-2xl font-semibold tracking-wide text-white">
            Báo cáo phản hồi
          </h1>
          <p className="text-sm text-slate-400">
            Tổng hợp tình hình khách hàng theo thời gian và nguồn dữ liệu.
          </p>
        </div>

        <button
          type="button"
          onClick={exportPdf}
          disabled={exporting || loading}
          className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 font-medium text-white shadow-lg shadow-indigo-600/20 transition-colors hover:bg-indigo-700 disabled:opacity-60"
        >
          <Download className="h-4 w-4" />
          {exporting ? 'Đang tạo PDF...' : 'Xuất PDF'}
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
          <p className="mt-1 text-sm text-slate-400">
            Ngày xuất: {new Date().toLocaleDateString('vi-VN')}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <ComparisonChartCard groups={report.groups} />

          <WordCloudCard words={report.words} />
        </div>

        <PerformanceSummaryCard
          total={filteredReviews.length}
          positive={report.positive}
          negative={report.negative}
          confidence={report.confidence}
        />
      </div>

    </div>
  );
}
