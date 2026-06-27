import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Database,
  Download,
  Frown,
  RefreshCcw,
  ShieldCheck,
  Smile,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { fetchKeywordAnalytics } from '../services/api';
import { confidenceRatio, fetchUserReviews } from '../services/reviews';

const SOURCE_OPTIONS = ['Tất cả', 'CSV', 'Foody', 'Shopee'];

export default function ReportContent() {
  const { user } = useAuth();
  const reportRef = useRef(null);
  const [reviews, setReviews] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [filters, setFilters] = useState({ startDate: '', endDate: '', source: 'Tất cả' });
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
      const source = filters.source === 'Tất cả' ? '' : filters.source;
      const [reviewRows, keywordPayload] = await Promise.allSettled([
        fetchUserReviews(user.id, { ...filters, source }),
        fetchKeywordAnalytics({ userId: user.id, sourceUrl: 'all' }),
      ]);

      if (reviewRows.status === 'fulfilled') setReviews(reviewRows.value);
      else throw reviewRows.reason;

      setAnalytics(keywordPayload.status === 'fulfilled' ? keywordPayload.value : null);
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
      ? reviews.reduce((sum, item) => sum + confidenceRatio(item.confidence), 0) / reviews.length
      : 0;
    const groups = {};

    reviews.forEach((item) => {
      const key = getSourceName(item.source_url);
      groups[key] ||= { positive: 0, negative: 0 };
      groups[key][Number(item.ai_label) === 1 ? 'positive' : 'negative'] += 1;
    });

    return {
      positive,
      negative: reviews.length - positive,
      confidence,
      groups: Object.entries(groups),
      words: extractWordCloud(analytics) || buildWordCloudData(reviews),
    };
  }, [analytics, reviews]);

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
          className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 font-medium text-white shadow-lg shadow-indigo-600/20 transition-colors hover:bg-indigo-700 disabled:opacity-60"
        >
          <Download className="h-4 w-4" />
          {exporting ? 'Đang tạo PDF...' : 'Xuất PDF'}
        </button>
      </div>

      <FilterBar filters={filters} setFilters={setFilters} loading={loading} onRefresh={load} />

      <div ref={reportRef} className="print-report space-y-6 bg-[#0f172a] p-1">
        <div className={`${exporting ? 'block' : 'hidden'} pdf-heading text-white`}>
          <h2 className="text-2xl font-bold">Báo cáo phản hồi khách hàng</h2>
          <p className="mt-1 text-sm text-slate-400">Ngày xuất: {new Date().toLocaleDateString('vi-VN')}</p>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <ComparisonChartCard groups={report.groups} />
          <WordCloudCard words={report.words} />
        </div>
        <PerformanceSummaryCard total={reviews.length} positive={report.positive} negative={report.negative} confidence={report.confidence} />
      </div>
    </div>
  );
}

function FilterBar({ filters, setFilters, loading, onRefresh }) {
  const update = (field) => (event) => setFilters((current) => ({ ...current, [field]: event.target.value }));

  return (
    <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-700 bg-slate-800/50 p-4 text-sm backdrop-blur-md xl:flex-row xl:items-center">
      <div className="flex flex-col gap-4 text-slate-300 lg:flex-row lg:items-end">
        <div className="flex flex-wrap items-end gap-3">
          <span className="pb-2 text-slate-400">Khoảng thời gian:</span>
          <DateField label="Từ ngày" value={filters.startDate} onChange={update('startDate')} />
          <DateField label="Đến ngày" value={filters.endDate} onChange={update('endDate')} />
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-slate-500">Nguồn</span>
          <select value={filters.source} onChange={update('source')} className="min-w-[150px] rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-2 text-slate-200 transition-colors hover:border-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500">
            {SOURCE_OPTIONS.map((source) => (
              <option key={source} value={source}>{source === 'Tất cả' ? 'Tất cả nguồn' : source}</option>
            ))}
          </select>
        </label>
      </div>
      <button type="button" onClick={onRefresh} disabled={loading} className="flex items-center gap-2 self-start text-slate-400 transition-colors hover:text-white disabled:opacity-60 xl:self-center">
        <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        {loading ? 'Đang cập nhật...' : 'Làm mới dữ liệu'}
      </button>
    </div>
  );
}

function DateField({ label, value, onChange }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="relative">
        <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input type="date" value={value} onChange={onChange} className="rounded-lg border border-slate-700 bg-slate-900/50 py-2 pl-10 pr-3 text-slate-200 transition-colors [color-scheme:dark] hover:border-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
      </span>
    </label>
  );
}

function ComparisonChartCard({ groups }) {
  const max = Math.max(1, ...groups.flatMap(([, values]) => [values.positive, values.negative]));

  return (
    <div className="break-inside-avoid flex flex-col rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-md lg:col-span-2">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-medium text-white">So sánh theo nguồn dữ liệu</h3>
        <div className="flex items-center gap-4 text-sm text-slate-300">
          <Legend color="bg-emerald-500" label="Khách hài lòng" />
          <Legend color="bg-rose-500" label="Khách chưa hài lòng" />
        </div>
      </div>
      {groups.length ? (
        <div className="relative flex min-h-[220px] flex-1 items-end justify-around gap-5 border-b border-slate-700/50 pb-4 pt-4">
          {groups.map(([name, values]) => (
            <div key={name} className="flex flex-col items-center gap-3">
              <div className="flex h-48 items-end gap-2">
                <ChartBar value={values.positive} max={max} color="bg-emerald-500" />
                <ChartBar value={values.negative} max={max} color="bg-rose-500" />
              </div>
              <span className="text-sm font-medium text-slate-300">{name}</span>
            </div>
          ))}
        </div>
      ) : <EmptyData text="Không có dữ liệu trong khoảng đã chọn." />}
    </div>
  );
}

function ChartBar({ value, max, color }) {
  return (
    <div title={`${value} phản hồi`} className={`relative w-8 rounded-t-sm transition-all hover:opacity-80 md:w-12 ${color}`} style={{ height: `${Math.max(value ? 3 : 0, (value / max) * 100)}%` }}>
      {value > 0 && <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-slate-300">{value}</span>}
    </div>
  );
}

function WordCloudCard({ words }) {
  const max = Math.max(1, ...words.map((word) => word.value));
  const min = Math.min(...words.map((word) => word.value), max);

  return (
    <div className="break-inside-avoid flex flex-col rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-md lg:col-span-1">
      <h3 className="mb-1 text-lg font-medium text-white">Bản đồ từ khóa</h3>
      <p className="mb-4 text-xs text-slate-500">Từ càng lớn nghĩa là khách nhắc càng nhiều.</p>
      <div className="flex min-h-[220px] flex-1 items-center justify-center overflow-hidden rounded-xl border border-slate-700/50 bg-slate-900/50 p-5">
        {words.length ? (
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 leading-none">
            {words.map((word) => (
              <span key={word.text} title={`${word.text}: ${word.value} lần`} className={`${wordColor(word.sentiment)} cursor-default font-semibold transition-transform hover:scale-110`} style={{ fontSize: `${scaleWord(word.value, min, max)}px` }}>
                {word.text}
              </span>
            ))}
          </div>
        ) : <EmptyData text="Chưa đủ dữ liệu từ khóa." />}
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-400">
        <Legend color="bg-emerald-500" label="Khách hài lòng" />
        <Legend color="bg-rose-500" label="Khách chưa hài lòng" />
        <Legend color="bg-slate-400" label="Trung tính" />
      </div>
    </div>
  );
}

function PerformanceSummaryCard({ total, positive, negative, confidence }) {
  return (
    <div className="break-inside-avoid rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-md">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-medium text-white">Tóm tắt tình hình</h2>
        <div className="flex items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold tracking-wider text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5" />
          ĐANG THEO DÕI
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon={Database} label="Tổng phản hồi" value={total} barColor="bg-indigo-400" progress={100} />
        <Metric icon={Smile} label="Khách hài lòng" value={positive} color="text-emerald-400" barColor="bg-emerald-500" progress={total ? (positive / total) * 100 : 0} glow="shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
        <Metric icon={Frown} label="Khách chưa hài lòng" value={negative} color="text-rose-400" barColor="bg-rose-500" progress={total ? (negative / total) * 100 : 0} glow="shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
        <Metric icon={ShieldCheck} label="Độ chắc chắn trung bình" value={`${(confidence * 100).toFixed(1)}%`} barColor="bg-indigo-400" progress={confidence * 100} />
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, color = 'text-white', barColor, progress, glow = '' }) {
  const width = Math.min(100, Math.max(0, Number(progress) || 0));
  return (
    <div className="flex flex-col justify-between rounded-xl border border-slate-700 bg-slate-900/50 p-5">
      <div className="mb-3 flex items-center gap-2 text-xs font-medium text-slate-400"><Icon className="h-4 w-4" />{label}</div>
      <div className={`text-3xl font-bold tracking-tight ${color}`}>{typeof value === 'number' ? value.toLocaleString('vi-VN') : value}</div>
      <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-slate-800"><div className={`h-full rounded-full ${barColor} ${glow} transition-[width] duration-700 ease-out`} style={{ width: `${width}%` }} /></div>
    </div>
  );
}

function Legend({ color, label }) {
  return <div className="flex items-center gap-1.5"><div className={`h-2.5 w-2.5 rounded-full ${color}`} />{label}</div>;
}

function EmptyData({ text }) {
  return <div className="flex min-h-[180px] items-center justify-center text-center text-sm text-slate-500">{text}</div>;
}

function getSourceName(sourceUrl = '') {
  if (sourceUrl === 'CSV_Upload') return 'CSV';
  if (sourceUrl.toLowerCase().includes('foody')) return 'Foody';
  if (sourceUrl.toLowerCase().includes('shopee')) return 'Shopee';
  return 'Khác';
}

function wordColor(sentiment) {
  if (sentiment === 'positive') return 'text-emerald-400';
  if (sentiment === 'negative') return 'text-rose-400';
  return 'text-slate-300';
}

function scaleWord(value, min, max) {
  if (max === min) return 18;
  return Math.round(12 + ((value - min) / (max - min)) * 18);
}

function extractWordCloud(payload) {
  const words = payload?.wordcloud || payload?.data?.wordcloud;
  return Array.isArray(words) ? words : null;
}

function buildWordCloudData(reviews) {
  const stopWords = new Set(['và', 'là', 'có', 'cho', 'của', 'mình', 'tôi', 'bạn', 'này', 'đó', 'thì', 'mà', 'nhưng', 'rất', 'được', 'không', 'với', 'một', 'những', 'cũng', 'đã', 'khi', 'lại', 'ở', 'để', 'nên']);
  const counts = new Map();

  reviews.forEach((review) => {
    const label = Number(review.ai_label);
    const words = String(review.content || '').toLocaleLowerCase('vi-VN').normalize('NFC').match(/[\p{L}\p{N}]+/gu) || [];
    const usefulWords = words.filter((word) => word.length >= 3 && !stopWords.has(word) && !/^\d+$/.test(word));
    const terms = [...new Set(usefulWords)];

    terms.forEach((text) => {
      const current = counts.get(text) || { text, value: 0, positive: 0, negative: 0 };
      current.value += 1;
      if (label === 1) current.positive += 1;
      if (label === 0) current.negative += 1;
      counts.set(text, current);
    });
  });

  return [...counts.values()]
    .filter((word) => word.value >= (reviews.length > 30 ? 2 : 1))
    .sort((a, b) => b.value - a.value)
    .slice(0, 30)
    .map((word) => ({
      text: word.text,
      value: word.value,
      sentiment: word.positive === word.negative ? 'neutral' : word.positive > word.negative ? 'positive' : 'negative',
    }));
}
