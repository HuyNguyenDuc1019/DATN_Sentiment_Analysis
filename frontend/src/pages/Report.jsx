import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Download,
  Calendar,
  RefreshCcw,
  CheckCircle2,
  Database,
  Smile,
  Frown,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { confidenceRatio, fetchUserReviews } from '../services/reviews';

const SOURCE_OPTIONS = ['Tất cả', 'CSV', 'Foody', 'Shopee'];

export default function ReportContent() {
  const { user } = useAuth();
  const reportRef = useRef(null);
  const [reviews, setReviews] = useState([]);
  const [filters, setFilters] = useState({ startDate: '', endDate: '', source: 'Tất cả' });
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) {
      window.alert('Ngày bắt đầu không được lớn hơn ngày kết thúc.');
      return;
    }

    setLoading(true);
    try {
      setReviews(await fetchUserReviews(user.id, {
        ...filters,
        source: filters.source === 'Tất cả' ? '' : filters.source,
      }));
    } catch (error) {
      window.alert(error.message);
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
      words: buildWordCloudData(reviews),
    };
  }, [reviews]);

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
          filename: `bao-cao-cam-xuc-${date}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: '#0f172a',
            logging: false,
          },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
        })
        .from(reportRef.current)
        .save();
    } catch (error) {
      window.alert(`Không thể xuất PDF: ${error.message}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-8 h-full flex flex-col space-y-6 animate-in fade-in duration-500 font-sans overflow-y-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-wide mb-1">Báo cáo</h1>
          <p className="text-slate-400 text-sm">Báo cáo tổng hợp theo thời gian</p>
        </div>
        <button type="button" onClick={exportPdf} disabled={exporting || loading} className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-6 rounded-xl transition-colors shadow-lg shadow-indigo-600/20 disabled:opacity-60">
          <Download className="w-4 h-4" />
          {exporting ? 'Đang tạo PDF...' : 'Xuất PDF'}
        </button>
      </div>

      <FilterBar filters={filters} setFilters={setFilters} loading={loading} onRefresh={load} />

      <div ref={reportRef} className="bg-[#0f172a] p-1 space-y-6 print-report">
        <div className={`${exporting ? 'block' : 'hidden'} pdf-heading text-white`}>
          <h2 className="text-2xl font-bold">Báo cáo phân tích cảm xúc</h2>
          <p className="text-slate-400 text-sm mt-1">Ngày xuất: {new Date().toLocaleDateString('vi-VN')}</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
    <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4 text-sm">
      <div className="flex flex-col lg:flex-row lg:items-end gap-4 text-slate-300">
        <div className="flex flex-wrap items-end gap-3">
          <span className="text-slate-400 pb-2">Khoảng thời gian:</span>
          <DateField label="Từ ngày" value={filters.startDate} onChange={update('startDate')} />
          <DateField label="Đến ngày" value={filters.endDate} onChange={update('endDate')} />
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-slate-500">Nguồn</span>
          <select value={filters.source} onChange={update('source')} className="bg-slate-900/50 border border-slate-700 hover:border-slate-500 transition-colors rounded-lg px-4 py-2 text-slate-200 min-w-[150px] focus:outline-none focus:ring-1 focus:ring-indigo-500">
            {SOURCE_OPTIONS.map((source) => <option key={source} value={source}>{source === 'Tất cả' ? 'Tất cả nguồn' : source}</option>)}
          </select>
        </label>
      </div>
      <button type="button" onClick={onRefresh} disabled={loading} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors self-start xl:self-center disabled:opacity-60">
        <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        {loading ? 'Đang tải...' : 'Làm mới dữ liệu'}
      </button>
    </div>
  );
}

function DateField({ label, value, onChange }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="relative">
        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input type="date" value={value} onChange={onChange} className="bg-slate-900/50 border border-slate-700 hover:border-slate-500 transition-colors rounded-lg py-2 pl-10 pr-3 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 [color-scheme:dark]" />
      </span>
    </label>
  );
}

function ComparisonChartCard({ groups }) {
  const max = Math.max(1, ...groups.flatMap(([, values]) => [values.positive, values.negative]));

  return (
    <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl p-6 flex flex-col break-inside-avoid">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-8">
        <h3 className="text-lg font-medium text-white">So sánh nền tảng</h3>
        <div className="flex items-center gap-4 text-sm text-slate-300">
          <Legend color="bg-emerald-500" label="Tích cực" />
          <Legend color="bg-rose-500" label="Tiêu cực" />
        </div>
      </div>
      {groups.length ? (
        <div className="flex-1 min-h-[220px] flex items-end justify-around gap-5 pb-4 pt-4 border-b border-slate-700/50 relative">
          {groups.map(([name, values]) => (
            <div key={name} className="flex flex-col items-center gap-3">
              <div className="flex items-end gap-2 h-48">
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
    <div title={`${value} bình luận`} className={`w-8 md:w-12 ${color} rounded-t-sm transition-all hover:opacity-80 relative`} style={{ height: `${Math.max(value ? 3 : 0, value / max * 100)}%` }}>
      {value > 0 && <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-slate-300">{value}</span>}
    </div>
  );
}

function WordCloudCard({ words }) {
  const max = Math.max(1, ...words.map((word) => word.value));
  const min = Math.min(...words.map((word) => word.value), max);

  return (
    <div className="lg:col-span-1 bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl p-6 flex flex-col break-inside-avoid">
      <h3 className="text-lg font-medium text-white mb-4">Bản đồ từ khóa</h3>
      <div className="flex-1 bg-slate-900/50 rounded-xl border border-slate-700/50 flex items-center justify-center p-5 min-h-[220px] overflow-hidden">
        {words.length ? (
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 leading-none">
            {words.map((word) => (
              <span key={word.text} title={`${word.text}: ${word.value} lần`} className={`${wordColor(word.sentiment)} font-semibold transition-transform hover:scale-110 cursor-default`} style={{ fontSize: `${scaleWord(word.value, min, max)}px` }}>
                {word.text}
              </span>
            ))}
          </div>
        ) : <EmptyData text="Chưa đủ dữ liệu từ khóa." />}
      </div>
      <div className="flex flex-wrap justify-center items-center gap-4 mt-5 text-[11px] text-slate-400">
        <Legend color="bg-emerald-500" label="Tích cực" />
        <Legend color="bg-rose-500" label="Tiêu cực" />
        <Legend color="bg-slate-400" label="Trung tính" />
      </div>
    </div>
  );
}

function PerformanceSummaryCard({ total, positive, negative, confidence }) {
  return (
    <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl p-6 break-inside-avoid">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-medium text-white">Tóm tắt hiệu suất mô hình</h2>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-md text-emerald-400 text-xs font-semibold tracking-wider"><CheckCircle2 className="w-3.5 h-3.5" />HOẠT ĐỘNG TỐT</div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Metric icon={Database} label="Tổng số dữ liệu" value={total} barColor="bg-indigo-400" progress={100} />
        <Metric icon={Smile} label="Tổng tích cực" value={positive} color="text-emerald-400" barColor="bg-emerald-500" progress={total ? positive / total * 100 : 0} glow="shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
        <Metric icon={Frown} label="Tổng tiêu cực" value={negative} color="text-rose-400" barColor="bg-rose-500" progress={total ? negative / total * 100 : 0} glow="shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
        <Metric icon={ShieldCheck} label="Độ tin cậy trung bình" value={`${(confidence * 100).toFixed(1)}%`} barColor="bg-indigo-400" progress={confidence * 100} />
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, color = 'text-white', barColor, progress, glow = '' }) {
  const width = Math.min(100, Math.max(0, Number(progress) || 0));
  return (
    <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-5 flex flex-col justify-between">
      <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-3"><Icon className="w-4 h-4" />{label}</div>
      <div className={`text-3xl font-bold tracking-tight ${color}`}>{typeof value === 'number' ? value.toLocaleString('vi-VN') : value}</div>
      <div className="h-1 w-full bg-slate-800 rounded-full mt-4 overflow-hidden"><div className={`h-full ${barColor} ${glow} rounded-full transition-[width] duration-700 ease-out`} style={{ width: `${width}%` }} /></div>
    </div>
  );
}

function Legend({ color, label }) {
  return <div className="flex items-center gap-1.5"><div className={`w-2.5 h-2.5 rounded-full ${color}`} />{label}</div>;
}

function EmptyData({ text }) {
  return <div className="min-h-[180px] flex items-center justify-center text-sm text-slate-500 text-center">{text}</div>;
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

function buildWordCloudData(reviews) {
  const stopWords = new Set([
    'và', 'là', 'có', 'cho', 'của', 'mình', 'tôi', 'bạn', 'này', 'đó', 'thì', 'mà', 'nhưng',
    'rất', 'được', 'không', 'với', 'một', 'những', 'cũng', 'đã', 'khi', 'lại', 'ở', 'để', 'nên',
    'the', 'and', 'this', 'that', 'was', 'were', 'are', 'for', 'not', 'but', 'you', 'too',
  ]);
  const counts = new Map();

  reviews.forEach((review) => {
    const label = Number(review.ai_label);
    const words = String(review.content || '')
      .toLocaleLowerCase('vi-VN')
      .normalize('NFC')
      .match(/[\p{L}\p{N}]+/gu) || [];
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
