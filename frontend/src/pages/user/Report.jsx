import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, FileSpreadsheet, LoaderCircle, RefreshCcw, Store, WifiOff } from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '../../contexts/AuthContext';
import ReportSkeleton from '../../components/user/report/ReportSkeleton';
import FilterBar from '../../components/user/report/FilterBar';
import PerformanceSummaryCard from '../../components/user/report/PerformanceSummaryCard';
import LazyVisible from '../../components/common/LazyVisible';
import { extractWordCloud } from '../../utils/user/reportUtils';
import { fetchReportSummary } from '../../services/user/reportService';
import { fetchDashboardRestaurantOptions } from '../../services/user/dashboardService';

const ComparisonChartCard = lazy(() => import('../../components/user/report/ComparisonChartCard'));
const WordCloudCard = lazy(() => import('../../components/user/report/WordCloudCard'));

const DEFAULT_FILTERS = {
  startDate: '',
  endDate: '',
  source: 'Tất cả',
  restaurantKey: 'all',
};

function normalizeConfidence(value) {
  const number = Number(value || 0);
  return number > 1 ? number / 100 : number;
}

function normalizeSource(source) {
  return ['Foody', 'Google Maps', 'CSV'].includes(source) ? source : 'all';
}

function ChartPlaceholder() {
  return <div className="min-h-[320px] animate-pulse rounded-2xl border border-slate-700 bg-slate-800/40" />;
}

export default function Report() {
  const { user } = useAuth();
  const reportRef = useRef(null);
  const loadSequenceRef = useRef(0);
  const [payload, setPayload] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
  const [restaurants, setRestaurants] = useState([]);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [contextReady, setContextReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;
    setContextReady(false);

    fetchDashboardRestaurantOptions(user.id)
      .then((options) => {
        if (cancelled) return;

        setRestaurants(options);
        try {
          const saved = JSON.parse(window.sessionStorage.getItem(`almotion:report:filters:${user.id}`));
          const restaurantExists = saved?.restaurantKey === 'all'
            || options.some((item) => item.key === saved?.restaurantKey);
          const restored = saved && restaurantExists
            ? { ...DEFAULT_FILTERS, ...saved }
            : DEFAULT_FILTERS;
          setFilters(restored);
          setAppliedFilters(restored);
        } catch {
          setFilters(DEFAULT_FILTERS);
          setAppliedFilters(DEFAULT_FILTERS);
        }
      })
      .catch(() => {
        if (!cancelled) setRestaurants([]);
      })
      .finally(() => {
        if (!cancelled) setContextReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const selectedRestaurant = useMemo(
    () => restaurants.find((item) => item.key === appliedFilters.restaurantKey) || null,
    [appliedFilters.restaurantKey, restaurants],
  );

  const selectedSourceUrls = useMemo(
    () => selectedRestaurant?.source_urls || [],
    [selectedRestaurant],
  );

  const filtersDirty = useMemo(
    () => JSON.stringify(filters) !== JSON.stringify(appliedFilters),
    [appliedFilters, filters],
  );

  const load = useCallback(async (force = false) => {
    if (!user?.id || !contextReady) return;
    if (appliedFilters.startDate && appliedFilters.endDate && appliedFilters.startDate > appliedFilters.endDate) {
      toast.error('Ngày bắt đầu không được lớn hơn ngày kết thúc.');
      return;
    }

    const sequence = ++loadSequenceRef.current;
    setLoading(true);
    setLoadError('');
    try {
      const value = await fetchReportSummary({
        userId: user.id,
        startDate: appliedFilters.startDate,
        endDate: appliedFilters.endDate,
        source: normalizeSource(appliedFilters.source),
        sourceUrls: selectedSourceUrls,
        force,
      });
      if (sequence !== loadSequenceRef.current) return;
      setPayload(value || {});
      setUpdatedAt(new Date());
    } catch (error) {
      if (sequence !== loadSequenceRef.current) return;
      setLoadError(error.message || 'Không tải được báo cáo.');
      toast.error(error.message || 'Không tải được báo cáo.');
    } finally {
      if (sequence === loadSequenceRef.current) setLoading(false);
    }
  }, [appliedFilters, contextReady, selectedSourceUrls, user?.id]);

  useEffect(() => { load(); }, [load]);

  const applyFilters = () => {
    if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) {
      toast.error('Ngày bắt đầu không được lớn hơn ngày kết thúc.');
      return;
    }
    loadSequenceRef.current += 1;
    const nextFilters = { ...filters };
    setAppliedFilters(nextFilters);
    if (user?.id) {
      try {
        window.sessionStorage.setItem(
          `almotion:report:filters:${user.id}`,
          JSON.stringify(nextFilters),
        );
      } catch {
        // Bộ lọc vẫn được áp dụng nếu trình duyệt chặn sessionStorage.
      }
    }
  };

  const report = useMemo(() => ({
    total: Number(payload?.total || 0),
    positive: Number(payload?.positive || 0),
    negative: Number(payload?.negative || 0),
    confidence: normalizeConfidence(payload?.confidence),
    groups: Array.isArray(payload?.groups) ? payload.groups : [],
    words: extractWordCloud(payload) || [],
  }), [payload]);

  const reportScope = useMemo(() => {
    const period = appliedFilters.startDate || appliedFilters.endDate
      ? `${appliedFilters.startDate || 'Từ đầu'} → ${appliedFilters.endDate || 'Hiện tại'}`
      : 'Toàn bộ thời gian';

    return {
      restaurant: selectedRestaurant?.name || 'Tất cả quán',
      source: appliedFilters.source === 'Tất cả' ? 'Tất cả nguồn' : appliedFilters.source,
      period,
    };
  }, [appliedFilters, selectedRestaurant]);

  const resetFilters = () => {
    loadSequenceRef.current += 1;
    setFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
    if (user?.id) {
      window.sessionStorage.removeItem(`almotion:report:filters:${user.id}`);
    }

    if (JSON.stringify(appliedFilters) === JSON.stringify(DEFAULT_FILTERS)) {
      load(true);
    }
  };

  const exportCsv = () => {
    if (!report.total) {
      toast.error('Không có dữ liệu trong bộ lọc hiện tại để xuất CSV.');
      return;
    }

    const rows = [
      ['Phạm vi báo cáo', 'Giá trị', 'Hài lòng', 'Chưa hài lòng', 'Tổng'],
      ['Quán', reportScope.restaurant, '', '', ''],
      ['Nguồn', reportScope.source, '', '', ''],
      ['Khoảng thời gian', reportScope.period, '', '', ''],
      ['Tổng hợp', '', report.positive, report.negative, report.total],
      ...report.groups.map((group) => [
        'Theo nguồn',
        group.source || 'Khác',
        Number(group.positive || 0),
        Number(group.negative || 0),
        Number(group.positive || 0) + Number(group.negative || 0),
      ]),
    ];
    const escapeCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const csv = `\uFEFF${rows.map((row) => row.map(escapeCell).join(',')).join('\r\n')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeRestaurant = reportScope.restaurant
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase() || 'tat-ca';
    link.href = url;
    link.download = `bao-cao-${safeRestaurant}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const exportPdf = async () => {
    if (!reportRef.current || exporting) return;
    setExporting(true);

    try {
      // Buoc nay cung buoc cac khoi lazy hien ra truoc khi chup PDF.
      await new Promise((resolve) => setTimeout(resolve, 120));
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const html2pdf = (await import('html2pdf.js')).default;
      const date = new Date().toISOString().slice(0, 10);

      await html2pdf().set({
        margin: 8,
        filename: `bao-cao-phan-hoi-${date}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#0f172a', logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      }).from(reportRef.current).save();
    } catch (error) {
      toast.error(`Không thể xuất PDF: ${error.message}`);
    } finally {
      setExporting(false);
    }
  };

  if ((!contextReady || loading) && !payload) return <ReportSkeleton />;

  return (
    <div className="flex h-full flex-col space-y-6 overflow-y-auto p-8 font-sans animate-in fade-in duration-500">
      <div className="mb-2 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="mb-1 text-2xl font-semibold tracking-wide text-white">Báo cáo phản hồi</h1>
          <p className="text-sm text-slate-400">Tổng hợp tình hình khách hàng theo thời gian và nguồn dữ liệu.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={exportCsv} disabled={loading || !report.total} className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-5 py-2.5 font-medium text-slate-200 transition-colors hover:border-emerald-500/50 hover:text-emerald-200 disabled:opacity-50">
            <FileSpreadsheet className="h-4 w-4" />
            Xuất CSV
          </button>
          <button type="button" onClick={exportPdf} disabled={exporting || loading || !report.total} className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 font-medium text-white shadow-lg shadow-indigo-600/20 transition-colors hover:bg-indigo-700 disabled:opacity-60">
            <Download className="h-4 w-4" />
            {exporting ? 'Đang tạo PDF...' : 'Xuất PDF'}
          </button>
        </div>
      </div>

      <FilterBar
        filters={filters}
        setFilters={setFilters}
        restaurants={restaurants}
        loading={loading}
        dirty={filtersDirty}
        onApply={applyFilters}
        onRefresh={() => load(true)}
        onReset={resetFilters}
      />

      {loadError && (
        <div className="flex flex-col gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3 text-rose-100">
            <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
            <div>
              <p className="font-semibold">Không thể cập nhật báo cáo</p>
              <p className="mt-0.5 text-xs leading-5 text-rose-200/80">{loadError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => load(true)}
            disabled={loading}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-rose-300/30 bg-rose-500/10 px-4 py-2 font-semibold text-rose-100 transition hover:bg-rose-500/20 disabled:opacity-60"
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Thử lại
          </button>
        </div>
      )}

      <div
        ref={reportRef}
        className="print-report relative space-y-6 overflow-hidden rounded-[28px] border border-slate-700/50 bg-[#0f172a] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.12)]"
      >
        {loading && payload && (
          <div className="absolute right-5 top-5 z-20 flex items-center gap-2 rounded-full border border-indigo-400/20 bg-slate-950/85 px-3 py-1.5 text-xs text-indigo-200 shadow-lg backdrop-blur-md">
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            Đang cập nhật dữ liệu mới
          </div>
        )}

        <div className={`${exporting ? 'block' : 'hidden'} pdf-heading text-white`}>
          <h2 className="text-2xl font-bold">Báo cáo phản hồi khách hàng</h2>
          <p className="mt-1 text-sm text-slate-400">Ngày xuất: {new Date().toLocaleDateString('vi-VN')}</p>
        </div>

        <div className="grid gap-3 rounded-2xl border border-slate-700/70 bg-slate-900/55 p-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Quán đang xem</p>
            <p className="mt-1 flex items-center gap-1.5 truncate font-semibold text-slate-200">
              <Store className="h-3.5 w-3.5 shrink-0 text-indigo-300" />
              {reportScope.restaurant}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Khoảng thời gian</p>
            <p className="mt-1 font-semibold text-slate-200">{reportScope.period}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Nguồn dữ liệu</p>
            <p className="mt-1 font-semibold text-slate-200">{reportScope.source}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Cập nhật gần nhất</p>
            <p className="mt-1 font-semibold text-slate-200">
              {updatedAt ? updatedAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Chưa cập nhật'}
            </p>
          </div>
        </div>

        <PerformanceSummaryCard total={report.total} positive={report.positive} negative={report.negative} confidence={report.confidence} />

        {report.total > 0 ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <LazyVisible force={exporting} minHeight={320} className="lg:col-span-2">
              <Suspense fallback={<ChartPlaceholder />}><ComparisonChartCard groups={report.groups} /></Suspense>
            </LazyVisible>
            <LazyVisible force={exporting} minHeight={320}>
              <Suspense fallback={<ChartPlaceholder />}><WordCloudCard words={report.words} /></Suspense>
            </LazyVisible>
          </div>
        ) : (
          <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/35 px-6 text-center">
            <Store className="mb-4 h-10 w-10 text-slate-500" />
            <h3 className="text-lg font-semibold text-slate-200">Không có dữ liệu phù hợp</h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
              Không tìm thấy phản hồi theo quán, nguồn hoặc khoảng thời gian đang chọn. Hãy thay đổi bộ lọc rồi bấm “Áp dụng bộ lọc”.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
