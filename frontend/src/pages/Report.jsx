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
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import cloud from 'd3-cloud';
import { useAuth } from '../contexts/AuthContext';
import { fetchKeywordAnalytics } from '../services/api';
import UpgradeModal from '../components/common/UpgradeModal';
import { confidenceRatio, fetchUserReviews } from '../services/reviews';

const SOURCE_OPTIONS = ['Tất cả', 'CSV', 'Foody', 'Shopee'];

export default function ReportContent() {
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
        fetchUserReviews(user.id, { ...filters, source }),
        fetchKeywordAnalytics({ userId: user.id, sourceUrl }),
      ]);

      if (reviewRows.status === 'fulfilled') setReviews(reviewRows.value);
      else throw reviewRows.reason;

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
      ? reviews.reduce((sum, item) => sum + confidenceRatio(item.confidence), 0) / reviews.length
      : 0;
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
      confidence,
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

      <FilterBar filters={filters} setFilters={setFilters} loading={loading} onRefresh={load} />

      <div ref={reportRef} className="print-report space-y-6 bg-[#0f172a] p-1">
        <div className={`${exporting ? 'block' : 'hidden'} pdf-heading text-white`}>
          <h2 className="text-2xl font-bold">Báo cáo phản hồi khách hàng</h2>
          <p className="mt-1 text-sm text-slate-400">Ngày xuất: {new Date().toLocaleDateString('vi-VN')}</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <ComparisonChartCard groups={report.groups} />
          <WordCloudCard words={report.words} isVip={isVip} onUpgrade={() => setIsUpgradeModalOpen(true)} />
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

function ReportSkeleton() {
  return (
    <div className="flex h-full flex-col space-y-6 overflow-y-auto p-8 font-sans animate-pulse">
      <div className="mb-2 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="space-y-3">
          <div className="h-8 w-64 rounded-xl bg-slate-800" />
          <div className="h-4 w-96 max-w-full rounded-lg bg-slate-800/80" />
        </div>
        <div className="h-11 w-36 rounded-xl bg-slate-800" />
      </div>
      <div className="h-24 rounded-2xl border border-slate-700 bg-slate-800/50" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="h-[430px] rounded-2xl border border-slate-700 bg-slate-800/50 lg:col-span-2" />
        <div className="h-[430px] rounded-2xl border border-slate-700 bg-slate-800/50" />
      </div>
      <div className="h-52 rounded-2xl border border-slate-700 bg-slate-800/50" />
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
          <select
            value={filters.source}
            onChange={update('source')}
            className="min-w-[150px] rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-2 text-slate-200 transition-colors hover:border-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {SOURCE_OPTIONS.map((source) => (
              <option key={source} value={source}>
                {source === 'Tất cả' ? 'Tất cả nguồn' : source}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        className="flex items-center gap-2 self-start text-slate-400 transition-colors hover:text-white disabled:opacity-60 xl:self-center"
      >
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
        <input
          type="date"
          value={value}
          onChange={onChange}
          className="rounded-lg border border-slate-700 bg-slate-900/50 py-2 pl-10 pr-3 text-slate-200 transition-colors [color-scheme:dark] hover:border-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </span>
    </label>
  );
}

function ComparisonChartCard({ groups }) {
  return (
    <div className="break-inside-avoid flex flex-col rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-md lg:col-span-2">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-medium text-white">So sánh theo nguồn dữ liệu</h3>
      </div>

      {groups.length ? (
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={groups} margin={{ top: 10, right: 20, left: -20, bottom: 5 }}>
              <CartesianGrid stroke="#334155" strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="source" stroke="#94a3b8" tick={{ fontSize: 12 }} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip
                cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }}
                contentStyle={{
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: 12,
                  color: '#e2e8f0',
                }}
                labelStyle={{ color: '#f8fafc' }}
              />
              <Legend wrapperStyle={{ color: '#cbd5e1', fontSize: 12 }} />
              <Bar dataKey="positive" name="Khách hài lòng" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="negative" name="Khách chưa hài lòng" fill="#fb7185" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyData text="Không có dữ liệu trong khoảng đã chọn." />
      )}
    </div>
  );
}

function WordCloudCard({ words, isVip, onUpgrade }) {
  const [layoutWords, setLayoutWords] = useState([]);
  const isLocked = !isVip || !words.length;
  const cloudWords = useMemo(() => {
    const normalized = words.map((word) => ({
      text: word.text,
      value: Number(word.value || 1),
      sentiment: word.sentiment || 'neutral',
    }));
    const max = Math.max(1, ...normalized.map((word) => word.value));
    const min = Math.min(...normalized.map((word) => word.value), max);

    return normalized.slice(0, 40).map((word) => ({
      ...word,
      size: scaleWord(word.value, min, max),
    }));
  }, [words]);

  useEffect(() => {
    if (!cloudWords.length) {
      setLayoutWords([]);
      return undefined;
    }

    const layout = cloud()
      .size([440, 300])
      .words(cloudWords)
      .padding(5)
      .rotate((_, index) => (index % 7 === 0 ? -10 : index % 5 === 0 ? 10 : 0))
      .font('Inter, Arial, sans-serif')
      .fontWeight(700)
      .fontSize((word) => word.size)
      .on('end', (items) => setLayoutWords(items));

    layout.start();
    return () => layout.stop();
  }, [cloudWords]);

  return (
    <div className="break-inside-avoid flex flex-col rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-md lg:col-span-1">
      <h3 className="mb-1 text-lg font-medium text-white">Bản đồ từ khóa</h3>
      <p className="mb-4 text-xs text-slate-500">Từ càng lớn nghĩa là khách nhắc càng nhiều.</p>

      <div className="flex min-h-[300px] flex-1 items-center justify-center overflow-hidden rounded-xl border border-slate-700/50 bg-slate-900/50 p-5">
        {isLocked ? (
          <button
            type="button"
            onClick={onUpgrade}
            className="flex min-h-[220px] w-full flex-col items-center justify-center rounded-xl border border-amber-400/25 bg-slate-950/40 px-6 text-center text-sm text-slate-300 transition-colors hover:bg-slate-950/60"
          >
            <span className="mb-3 text-3xl">🔒</span>
            <span className="font-semibold text-amber-200">Mở khóa biểu đồ Đám mây từ khóa trực quan với gói VIP</span>
          </button>
        ) : layoutWords.length ? (
          <div className="relative h-[300px] w-full max-w-[440px]">
            {layoutWords.map((word) => (
              <span
                key={`${word.text}-${word.value}`}
                title={`${word.text}: ${word.value} lần`}
                className="absolute left-1/2 top-1/2 cursor-default whitespace-nowrap font-bold leading-none transition-transform hover:scale-110"
                style={{
                  color: wordColor(word.sentiment),
                  fontSize: `${word.size}px`,
                  transform: `translate(${word.x}px, ${word.y}px) translate(-50%, -50%) rotate(${word.rotate}deg)`,
                }}
              >
                {word.text}
              </span>
            ))}
          </div>
        ) : (
          <EmptyData text="Chưa đủ dữ liệu từ khóa." />
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-400">
        <LegendItem color="bg-emerald-500" label="Khách hài lòng" />
        <LegendItem color="bg-rose-500" label="Khách chưa hài lòng" />
        <LegendItem color="bg-slate-400" label="Trung tính" />
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
      <div className="mb-3 flex items-center gap-2 text-xs font-medium text-slate-400">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <div className={`text-3xl font-bold tracking-tight ${color}`}>
        {typeof value === 'number' ? value.toLocaleString('vi-VN') : value}
      </div>
      <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full rounded-full ${barColor} ${glow} transition-[width] duration-700 ease-out`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function LegendItem({ color, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {label}
    </div>
  );
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

function toAnalyticsSource(source) {
  if (source === 'CSV') return 'CSV_Upload';
  if (source === 'Foody') return 'Foody';
  if (source === 'Shopee') return 'Shopee';
  return 'all';
}

function wordColor(sentiment) {
  if (sentiment === 'positive') return '#34d399';
  if (sentiment === 'negative') return '#fb7185';
  return '#cbd5e1';
}

function scaleWord(value, min, max) {
  if (max === min) return 22;
  return Math.round(14 + ((value - min) / (max - min)) * 28);
}

function extractWordCloud(payload) {
  const words = payload?.wordcloud || payload?.data?.wordcloud;
  return Array.isArray(words) ? normalizeWordCloudWords(words) : null;
}

function buildWordCloudFromReviews(reviews) {
  return normalizeWordCloudWords(
    reviews.flatMap((item) => {
      const sentiment = Number(item.ai_label) === 1 ? 'positive' : 'negative';
      return extractReportKeywords(item).map((keyword) => ({
        text: keyword,
        value: 1,
        sentiment,
      }));
    })
  );
}

function extractReportKeywords(item) {
  if (Array.isArray(item.keywords)) return item.keywords;
  if (typeof item.keywords === 'string') {
    return item.keywords
      .split(',')
      .map((word) => word.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeWordCloudWords(words) {
  const counts = new Map();

  words.forEach((word) => {
    const classified = classifyWordCloudKeyword(word?.text, word?.sentiment);
    if (!classified) return;

    const key = `${normalizeText(classified.text)}|${classified.sentiment}`;
    const current = counts.get(key) || { ...classified, value: 0 };
    current.value += Math.max(1, Number(word?.value || 1));
    counts.set(key, current);
  });

  return [...counts.values()]
    .sort((a, b) => b.value - a.value)
    .slice(0, 36);
}

function classifyWordCloudKeyword(rawText, rawSentiment) {
  const text = cleanKeyword(rawText);
  if (!text) return null;

  const normalized = normalizeText(text);
  const sentiment = normalizeSentiment(rawSentiment);
  const positive = findKeywordLabel(normalized, POSITIVE_WORD_CLOUD_TERMS);
  const negative = findKeywordLabel(normalized, NEGATIVE_WORD_CLOUD_TERMS);

  if (negative) return { text: negative, sentiment: 'negative' };
  if (positive && sentiment !== 'negative') return { text: positive, sentiment: 'positive' };
  if (positive && sentiment === 'negative') return null;

  return null;
}

function findKeywordLabel(normalizedText, terms) {
  const match = terms.find((item) =>
    item.matches.some((term) => normalizedText.includes(normalizeText(term)))
  );
  return match?.label || null;
}

function cleanKeyword(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/[.,;:!?()[\]{}"'`]/g, '')
    .trim();
}

function normalizeSentiment(value) {
  const sentiment = normalizeText(value);
  if (['positive', 'pos', '1', 'true', 'tich cuc', 'hai long', 'khach hai long'].includes(sentiment)) return 'positive';
  if (['negative', 'neg', '0', 'false', 'tieu cuc', 'chua hai long', 'khach chua hai long'].includes(sentiment)) return 'negative';
  return 'neutral';
}

function normalizeText(value) {
  return String(value || '')
    .toLocaleLowerCase('vi-VN')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const POSITIVE_WORD_CLOUD_TERMS = [
  { label: 'Ngon', matches: ['ngon', 'ngon quá', 'rất ngon', 'đậm đà', 'vừa miệng'] },
  { label: 'Sạch sẽ', matches: ['sạch', 'sạch sẽ', 'vệ sinh'] },
  { label: 'Phục vụ tốt', matches: ['phục vụ tốt', 'phục vụ nhanh', 'nhiệt tình', 'thân thiện'] },
  { label: 'Nhân viên thân thiện', matches: ['nhân viên thân thiện', 'nhân viên nhiệt tình', 'nhân viên vui vẻ'] },
  { label: 'Giá hợp lý', matches: ['giá hợp lý', 'giá rẻ', 'đáng tiền', 'giá ổn'] },
  { label: 'Không gian tốt', matches: ['không gian', 'thoáng', 'rộng rãi', 'mát mẻ'] },
  { label: 'Giao nhanh', matches: ['giao nhanh', 'lên món nhanh', 'ra món nhanh'] },
  { label: 'Đóng gói kỹ', matches: ['đóng gói', 'gói kỹ', 'đóng gói kỹ'] },
  { label: 'Sẽ quay lại', matches: ['quay lại', 'ủng hộ', 'ghé lại'] },
];

const NEGATIVE_WORD_CLOUD_TERMS = [
  { label: 'Không ngon', matches: ['không ngon', 'dở', 'tệ', 'nhạt', 'khó ăn', 'thất vọng'] },
  { label: 'Chờ lâu', matches: ['chờ lâu', 'đợi lâu', 'lâu', 'chậm', 'quá lâu'] },
  { label: 'Phục vụ kém', matches: ['phục vụ kém', 'thái độ', 'khó chịu', 'không thân thiện'] },
  { label: 'Nhân viên chưa tốt', matches: ['nhân viên tệ', 'nhân viên khó chịu', 'nhân viên chậm'] },
  { label: 'Giá cao', matches: ['giá cao', 'đắt', 'mắc', 'không đáng tiền'] },
  { label: 'Quá mặn', matches: ['mặn', 'quá mặn'] },
  { label: 'Quá ngọt', matches: ['ngọt gắt', 'quá ngọt'] },
  { label: 'Không sạch', matches: ['bẩn', 'không sạch', 'mất vệ sinh'] },
  { label: 'Sai món', matches: ['sai món', 'thiếu món', 'nhầm món'] },
  { label: 'Đóng gói kém', matches: ['đổ', 'tràn', 'bể', 'đóng gói kém'] },
  { label: 'Khó tìm quán', matches: ['khó tìm', 'địa chỉ khó tìm'] },
];
