import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  Globe,
  Hash,
  MessageSquare,
  Network,
  RefreshCcw,
  Search,
  Store,
  WifiOff,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '../../contexts/AuthContext';
import QuickConclusionCard from '../../components/user/dashboard/QuickConclusionCard';

import AlertsSection from '../../components/user/dashboard/AlertsSection';
import DashboardSkeleton from '../../components/user/dashboard/DashboardSkeleton';
import EmptyDashboardState from '../../components/user/dashboard/EmptyDashboardState';
import LeaderboardCard from '../../components/user/dashboard/LeaderboardCard';
import PositiveRateCard from '../../components/user/dashboard/PositiveRateCard';
import StatCard from '../../components/user/dashboard/StatCard';
import LazyVisible from '../../components/common/LazyVisible';

const TrendCard = lazy(() => import('../../components/user/dashboard/TrendCard'));
const AspectSentimentCard = lazy(() => import('../../components/user/dashboard/AspectSentimentCard'));

import {
  buildBusinessLeaderboard,
  isCriticalAlert,
  normalizeAlert,
} from '../../utils/user/dashboardUtils';

import {
  fetchAlertsForSources,
  fetchDashboardRestaurantOptions,
  fetchDashboardSummary,
} from '../../services/user/dashboardService';

const ALL_RESTAURANTS_KEY = 'all';
const DASHBOARD_RESTAURANT_STORAGE_KEY = 'almotion.dashboard.restaurant';

const DANGER_KEYWORDS = [
  'tệ',
  'dở',
  'chán',
  'bẩn',
  'mất vệ sinh',
  'không ngon',
  'quá lâu',
  'chờ lâu',
  'đợi lâu',
  'phục vụ kém',
  'thái độ',
  'khó chịu',
  'đắt',
  'mắc',
  'không đáng tiền',
  'thất vọng',
  'lừa',
  'sai món',
  'thiếu món',
  'nguội',
  'mặn',
  'nhạt',
];

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeTextWithAccents(value) {
  return String(value || '')
    .toLocaleLowerCase('vi-VN')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function containsNormalizedPhrase(target, keyword) {
  const rawTarget = normalizeTextWithAccents(target);
  const rawKeyword = normalizeTextWithAccents(keyword);
  const normalizedTarget = normalizeText(target);
  const normalizedKeyword = normalizeText(keyword);

  if (!normalizedTarget || !normalizedKeyword) return false;

  const escapedRawKeyword = rawKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (new RegExp(`(?:^|\\s)${escapedRawKeyword}(?:$|\\s)`, 'u').test(rawTarget)) {
    return true;
  }

  // Các từ ngắn sau khi bỏ dấu dễ trùng nghĩa: "dở" -> "do" có thể
  // khớp nhầm "đồ", "bẩn" -> "ban" có thể liên quan tới "bánh".
  if (normalizedKeyword.length <= 3 && rawKeyword !== normalizedKeyword) {
    return false;
  }

  const escapedKeyword = normalizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|\\s)${escapedKeyword}(?:$|\\s)`, 'u').test(normalizedTarget);
}

function normalizeLabel(value) {
  if (value === 1 || value === '1') return 1;
  if (value === 0 || value === '0') return 0;

  const text = normalizeText(value);

  if (
    [
      'positive',
      'pos',
      'label 1',
      'tich cuc',
      'khach hai long',
      'hai long',
    ].includes(text)
  ) {
    return 1;
  }

  if (
    [
      'negative',
      'neg',
      'label 0',
      'tieu cuc',
      'khach chua hai long',
      'chua hai long',
    ].includes(text)
  ) {
    return 0;
  }

  return 0;
}

function isNegativeReview(item) {
  return (
    normalizeLabel(
      item?.ai_label ??
        item?.prediction ??
        item?.label ??
        item?.sentiment,
    ) === 0
  );
}

function getAlertContent(item) {
  return String(
    item?.content ||
      item?.comment ||
      item?.text ||
      item?.review ||
      item?.original_content ||
      '',
  );
}

function getAlertContentKey(item) {
  return normalizeText(getAlertContent(item));
}

function getAlertTime(item) {
  const value = item?.review_date || item?.created_at || item?.updated_at;

  if (!value) return 0;

  const time = new Date(value).getTime();

  return Number.isFinite(time) ? time : 0;
}

function getAlertKeywords(item) {
  if (Array.isArray(item?.keywords)) {
    return item.keywords;
  }

  if (typeof item?.keywords === 'string') {
    return item.keywords
      .split(',')
      .map((keyword) => keyword.trim())
      .filter(Boolean);
  }

  return [];
}

function hasDangerKeyword(item) {
  const content = getAlertContent(item);
  const keywords = getAlertKeywords(item).join(' ');

  const target = `${content} ${keywords}`;

  return DANGER_KEYWORDS.some((keyword) =>
    containsNormalizedPhrase(target, keyword),
  );
}

function isActionableAlert(item) {
  if (!isNegativeReview(item)) return false;

  // isCriticalAlert kiểm tra cả tín hiệu ngôn ngữ, nên loại được câu tích cực
  // bị AI gán nhầm nhãn 0 và câu hỏi trung tính như "Bao nhiêu tiền".
  return hasDangerKeyword(item) || isCriticalAlert(item);
}

function normalizeConfidenceValue(value) {
  const number = Number(value || 0);

  if (!Number.isFinite(number)) return 0;

  return number > 1 ? number / 100 : number;
}

function calculateAlertScore(item) {
  let score = 0;

  if (item?.is_action_required) {
    score += 100;
  }

  if (hasDangerKeyword(item)) {
    score += 40;
  }

  if (isCriticalAlert(item)) {
    score += 30;
  }

  score += normalizeConfidenceValue(item?.confidence) * 20;

  const time = getAlertTime(item);

  if (time) {
    const ageHours = Math.max(0, (Date.now() - time) / (1000 * 60 * 60));
    const recencyScore = Math.max(0, 10 - ageHours / 24);
    score += recencyScore;
  }

  return score;
}

function mergeAlertsWithReviews(alerts, reviews) {
  const map = new Map();

  [...alerts, ...reviews].forEach((item) => {
    const contentKey = getAlertContentKey(item);
    const idKey = item?.id ? `id:${item.id}` : '';
    const key = contentKey || idKey;

    if (!key) return;

    const oldItem = map.get(key);

    if (!oldItem) {
      map.set(key, item);
      return;
    }

    const oldScore = calculateAlertScore(oldItem);
    const newScore = calculateAlertScore(item);

    if (newScore > oldScore) {
      map.set(key, {
        ...oldItem,
        ...item,
      });
    }
  });

  return [...map.values()];
}

function sortAlertsStable(a, b) {
  const scoreA = calculateAlertScore(a);
  const scoreB = calculateAlertScore(b);

  if (scoreB !== scoreA) {
    return scoreB - scoreA;
  }

  const timeScore = getAlertTime(b) - getAlertTime(a);

  if (timeScore !== 0) {
    return timeScore;
  }

  const confidenceScore =
    normalizeConfidenceValue(b?.confidence) -
    normalizeConfidenceValue(a?.confidence);

  if (confidenceScore !== 0) {
    return confidenceScore;
  }

  const idA = String(a?.id || '');
  const idB = String(b?.id || '');

  if (idA && idB && idA !== idB) {
    return idA.localeCompare(idB);
  }

  return getAlertContentKey(a).localeCompare(getAlertContentKey(b));
}

function buildVisibleAlerts(alerts, reviews) {
  /**
   * Mục tiêu:
   * 1. Chỉ lấy bình luận tiêu cực.
   * 2. Không lặp cùng một nội dung.
   * 3. Ưu tiên is_action_required.
   * 4. Nếu chưa đủ 4, bổ sung bình luận tiêu cực có keyword nguy hiểm.
   * 5. Nếu vẫn chưa đủ 4, bổ sung bình luận tiêu cực còn lại theo score.
   * 6. Danh sách sort ổn định, hạn chế nhảy comment.
   */
  const merged = mergeAlertsWithReviews(alerts, reviews);

  const negativeItems = merged
    .filter(isActionableAlert)
    .filter((item) => getAlertContentKey(item));

  const tier1 = negativeItems.filter((item) => item?.is_action_required);
  const tier2 = negativeItems.filter(
    (item) => !item?.is_action_required && hasDangerKeyword(item),
  );
  const tier3 = negativeItems.filter(
    (item) => !item?.is_action_required && !hasDangerKeyword(item),
  );

  const picked = [];
  const seen = new Set();

  const addItems = (items) => {
    items
      .sort(sortAlertsStable)
      .forEach((item) => {
        if (picked.length >= 4) return;

        const key = getAlertContentKey(item);

        if (!key || seen.has(key)) return;

        seen.add(key);
        picked.push(item);
      });
  };

  addItems(tier1);
  addItems(tier2);
  addItems(tier3);

  return picked.slice(0, 4).map((item) => normalizeAlert(item));
}

export default function Dashboard() {
  const { user } = useAuth();

  const [summary, setSummary] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [keywordAnalytics, setKeywordAnalytics] = useState(null);
  const [restaurantOptions, setRestaurantOptions] = useState([]);
  const [selectedRestaurantKey, setSelectedRestaurantKey] = useState(
    ALL_RESTAURANTS_KEY,
  );
  const [restaurantMenuOpen, setRestaurantMenuOpen] = useState(false);
  const [restaurantSearch, setRestaurantSearch] = useState('');
  const [optionsReady, setOptionsReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);
  const restaurantMenuRef = useRef(null);
  const loadSequenceRef = useRef(0);

  useEffect(() => {
    if (!user?.id) return undefined;

    let active = true;

    const loadRestaurantOptions = async () => {
      setOptionsReady(false);

      try {
        const rows = await fetchDashboardRestaurantOptions(user.id);
        if (!active) return;

        const safeRows = Array.isArray(rows) ? rows : [];
        const storedKey = window.localStorage.getItem(
          DASHBOARD_RESTAURANT_STORAGE_KEY,
        );
        const nextKey = safeRows.some((item) => item.key === storedKey)
          ? storedKey
          : ALL_RESTAURANTS_KEY;

        setRestaurantOptions(safeRows);
        setSelectedRestaurantKey(nextKey);
      } catch (error) {
        if (!active) return;
        setRestaurantOptions([]);
        setSelectedRestaurantKey(ALL_RESTAURANTS_KEY);
        toast.error(error.message || 'Không tải được danh sách quán.');
      } finally {
        if (active) setOptionsReady(true);
      }
    };

    loadRestaurantOptions();

    return () => {
      active = false;
    };
  }, [user?.id]);

  const selectedRestaurant = useMemo(
    () => restaurantOptions.find((item) => item.key === selectedRestaurantKey) || null,
    [restaurantOptions, selectedRestaurantKey],
  );

  const totalRestaurantReviews = useMemo(
    () => restaurantOptions.reduce(
      (total, item) => total + Number(item.review_count || 0),
      0,
    ),
    [restaurantOptions],
  );

  const filteredRestaurantOptions = useMemo(() => {
    const query = restaurantSearch.trim().toLocaleLowerCase('vi-VN');
    if (!query) return restaurantOptions;

    return restaurantOptions.filter((item) =>
      String(item.name || '').toLocaleLowerCase('vi-VN').includes(query),
    );
  }, [restaurantOptions, restaurantSearch]);

  useEffect(() => {
    if (!restaurantMenuOpen) return undefined;

    const closeMenu = () => {
      setRestaurantMenuOpen(false);
      setRestaurantSearch('');
    };

    const handlePointerDown = (event) => {
      if (!restaurantMenuRef.current?.contains(event.target)) closeMenu();
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closeMenu();
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [restaurantMenuOpen]);

  const selectedSourceUrls = useMemo(
    () => (selectedRestaurant ? selectedRestaurant.source_urls || [] : []),
    [selectedRestaurant],
  );

  const load = useCallback(async (force = false) => {
    if (!user?.id || !optionsReady) return;

    const sequence = ++loadSequenceRef.current;
    setLoading(true);
    setLoadError('');

    try {
      const [summaryPayload, alertRows] = await Promise.allSettled([
        fetchDashboardSummary({
          userId: user.id,
          sourceUrls: selectedSourceUrls,
          force,
        }),
        fetchAlertsForSources(user.id, selectedSourceUrls, force),
      ]);

      if (summaryPayload.status !== 'fulfilled') throw summaryPayload.reason;
      if (sequence !== loadSequenceRef.current) return;

      const safeAlerts =
        alertRows.status === 'fulfilled' && Array.isArray(alertRows.value)
          ? alertRows.value
          : [];

      /**
       * Set state sau khi đã lấy xong cả reviews + alerts.
       * Giảm tình trạng UI render một lượt review trước, rồi nhảy khi alerts về sau.
       */
      setSummary(summaryPayload.value || {});
      setAlerts(safeAlerts);
      setKeywordAnalytics({ leaderboard: summaryPayload.value?.leaderboard || {} });
      setUpdatedAt(new Date());
    } catch (error) {
      if (sequence !== loadSequenceRef.current) return;
      setLoadError(error.message || 'Không tải được dữ liệu tổng quan.');
      toast.error(error.message || 'Không tải được dữ liệu tổng quan.');
    } finally {
      if (sequence === loadSequenceRef.current) setLoading(false);
    }
  }, [optionsReady, selectedSourceUrls, user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRestaurantSelect = (nextKey) => {
    setRestaurantMenuOpen(false);
    setRestaurantSearch('');

    if (nextKey === selectedRestaurantKey) return;

    loadSequenceRef.current += 1;
    setLoading(true);
    setSummary(null);
    setAlerts([]);
    setKeywordAnalytics(null);
    setSelectedRestaurantKey(nextKey);
    window.localStorage.setItem(DASHBOARD_RESTAURANT_STORAGE_KEY, nextKey);
  };

  const stats = useMemo(() => {
    const total = Number(summary?.total || 0);
    const positive = Number(summary?.positive || 0);
    const negative = Number(summary?.negative || 0);
    const sources = selectedRestaurant
      ? 1
      : restaurantOptions.length;

    return {
      total,
      positive,
      negative,
      sources,
      positiveRate: Number(summary?.positive_rate || 0),
      growth: Number(summary?.growth || 0),
    };
  }, [restaurantOptions.length, selectedRestaurant, summary]);

  const trendData = useMemo(() => summary?.trend || [], [summary]);
  const aspectData = useMemo(() => summary?.aspects || [], [summary]);

  const leaderboard = useMemo(() => {
    const value = keywordAnalytics?.leaderboard || keywordAnalytics?.data?.leaderboard;

    return buildBusinessLeaderboard(value, []);
  }, [keywordAnalytics]);

  const visibleAlerts = useMemo(() => {
    return buildVisibleAlerts(alerts, []);
  }, [alerts]);

  if (loading && !summary) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500 font-sans">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-wide text-white">
            {selectedRestaurant
              ? `Dashboard · ${selectedRestaurant.name}`
              : 'Tổng quan hoạt động'}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {selectedRestaurant
              ? `${Number(selectedRestaurant.review_count || 0).toLocaleString('vi-VN')} phản hồi của quán đang chọn.`
              : 'Theo dõi phản hồi khách hàng, điểm nổi bật và vấn đề cần xử lý.'}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {updatedAt
              ? `Cập nhật lúc ${updatedAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
              : 'Chưa cập nhật dữ liệu'}
          </p>
        </div>

        <div ref={restaurantMenuRef} className="relative min-w-0 lg:w-[380px]">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Dashboard theo quán
          </p>

          <button
            type="button"
            onClick={() => setRestaurantMenuOpen((current) => !current)}
            disabled={!optionsReady}
            aria-haspopup="listbox"
            aria-expanded={restaurantMenuOpen}
            className="group flex min-h-14 w-full items-center gap-3 rounded-2xl border border-slate-700/80 bg-slate-900/75 px-3 py-2.5 text-left shadow-sm outline-none transition duration-200 hover:border-indigo-500/50 hover:bg-slate-900 focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20 disabled:cursor-wait disabled:opacity-60"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-indigo-400/20 bg-indigo-500/10 text-indigo-300 transition group-hover:bg-indigo-500/15">
              <Store className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-slate-100">
                {selectedRestaurant?.name || 'Tất cả quán'}
              </span>
              <span className="mt-0.5 block truncate text-xs text-slate-400">
                {selectedRestaurant
                  ? `${Number(selectedRestaurant.review_count || 0).toLocaleString('vi-VN')} phản hồi`
                  : `${restaurantOptions.length.toLocaleString('vi-VN')} quán · ${totalRestaurantReviews.toLocaleString('vi-VN')} phản hồi`}
              </span>
            </span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
                restaurantMenuOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {restaurantMenuOpen && (
            <div className="absolute right-0 z-50 mt-2 w-full min-w-[320px] overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-950/95 p-2 shadow-2xl shadow-slate-950/35 backdrop-blur-xl">
              <div className="relative mb-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="search"
                  value={restaurantSearch}
                  onChange={(event) => setRestaurantSearch(event.target.value)}
                  placeholder="Tìm tên quán..."
                  autoFocus
                  className="h-10 w-full rounded-xl border border-slate-700/80 bg-slate-900/80 pl-9 pr-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-indigo-500/70 focus:ring-2 focus:ring-indigo-500/15"
                />
              </div>

              <div className="max-h-72 space-y-1 overflow-y-auto pr-1" role="listbox">
                {!restaurantSearch.trim() && (
                  <button
                    type="button"
                    role="option"
                    aria-selected={selectedRestaurantKey === ALL_RESTAURANTS_KEY}
                    onClick={() => handleRestaurantSelect(ALL_RESTAURANTS_KEY)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                      selectedRestaurantKey === ALL_RESTAURANTS_KEY
                        ? 'bg-indigo-500/15 text-indigo-100'
                        : 'text-slate-200 hover:bg-slate-800/80'
                    }`}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-indigo-300">
                      <Network className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">Tất cả quán</span>
                      <span className="block text-xs text-slate-400">
                        {restaurantOptions.length.toLocaleString('vi-VN')} quán · {totalRestaurantReviews.toLocaleString('vi-VN')} phản hồi
                      </span>
                    </span>
                    {selectedRestaurantKey === ALL_RESTAURANTS_KEY && (
                      <Check className="h-4 w-4 shrink-0 text-indigo-300" />
                    )}
                  </button>
                )}

                {filteredRestaurantOptions.map((item) => {
                  const isSelected = item.key === selectedRestaurantKey;

                  return (
                    <button
                      key={item.key}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleRestaurantSelect(item.key)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                        isSelected
                          ? 'bg-indigo-500/15 text-indigo-100'
                          : 'text-slate-200 hover:bg-slate-800/80'
                      }`}
                    >
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        isSelected
                          ? 'bg-indigo-500/20 text-indigo-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        <Store className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{item.name}</span>
                        <span className="block text-xs text-slate-400">
                          {Number(item.review_count || 0).toLocaleString('vi-VN')} phản hồi
                        </span>
                      </span>
                      {isSelected && <Check className="h-4 w-4 shrink-0 text-indigo-300" />}
                    </button>
                  );
                })}

                {filteredRestaurantOptions.length === 0 && (
                  <div className="px-4 py-8 text-center">
                    <Search className="mx-auto h-5 w-5 text-slate-600" />
                    <p className="mt-2 text-sm font-medium text-slate-300">Không tìm thấy quán</p>
                    <p className="mt-1 text-xs text-slate-500">Thử nhập tên ngắn hơn.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {loading && summary && (
        <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-200">
          Đang cập nhật số liệu cho quán đã chọn...
        </div>
      )}

      {loadError && (
        <div className="flex flex-col gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3 text-rose-100">
            <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
            <div>
              <p className="font-semibold">Không thể cập nhật Dashboard</p>
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

      {!loading && stats.total === 0 ? (
        <EmptyDashboardState />
      ) : (
        <>
          <AlertsSection
            alerts={visibleAlerts}
            loading={loading}
          />

          <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-3">
            <StatCard
              title="Tổng phản hồi"
              value={stats.total.toLocaleString('vi-VN')}
              icon={<MessageSquare className="h-5 w-5 text-indigo-400" />}
              trend={`${stats.growth >= 0 ? '+' : ''}${stats.growth.toFixed(1)}%`}
              trendUp={stats.growth >= 0}
            />

            <PositiveRateCard rate={stats.positiveRate} />

            <StatCard
              title={selectedRestaurant ? 'Quán đang xem' : 'Quán đang theo dõi'}
              value={stats.sources.toLocaleString('vi-VN')}
              icon={<Network className="h-5 w-5 text-indigo-400" />}
              subIcons={
                <div className="mb-1 flex gap-2 text-slate-500">
                  <Globe className="h-4 w-4" />
                  <Hash className="h-4 w-4" />
                  <Globe className="h-4 w-4" />
                </div>
              }
            />
          </div>

          <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-3">
            <LazyVisible minHeight={420} className="h-full min-w-0 lg:col-span-2">
              <Suspense fallback={<div className="h-full min-h-[420px] animate-pulse rounded-2xl border border-slate-700 bg-slate-800/40" />}>
                <TrendCard data={trendData} />
              </Suspense>
            </LazyVisible>

            <QuickConclusionCard
              totalFeedback={stats.total}
              positiveCount={stats.positive}
              negativeCount={stats.negative}
              alertCount={visibleAlerts.length}
            />
          </div>

          <LazyVisible minHeight={420}>
            <Suspense fallback={<div className="min-h-[420px] animate-pulse rounded-2xl border border-slate-700 bg-slate-800/40" />}>
              <AspectSentimentCard data={aspectData} />
            </Suspense>
          </LazyVisible>
          <LeaderboardCard leaderboard={leaderboard} />
        </>
      )}

    </div>
  );
}
