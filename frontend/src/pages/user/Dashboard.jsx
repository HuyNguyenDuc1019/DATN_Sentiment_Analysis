import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Globe, Hash, MessageSquare, Network } from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '../../contexts/AuthContext';
import UpgradeModal from '../../components/common/UpgradeModal';
import QuickConclusionCard from '../../components/user/dashboard/QuickConclusionCard';

import AlertsSection from '../../components/user/dashboard/AlertsSection';
import DashboardSkeleton from '../../components/user/dashboard/DashboardSkeleton';
import EmptyDashboardState from '../../components/user/dashboard/EmptyDashboardState';
import LeaderboardCard from '../../components/user/dashboard/LeaderboardCard';
import PositiveRateCard from '../../components/user/dashboard/PositiveRateCard';
import RecentReviews from '../../components/user/dashboard/RecentReviews';
import StatCard from '../../components/user/dashboard/StatCard';
import TrendCard from '../../components/user/dashboard/TrendCard';

import {
  buildBusinessLeaderboard,
  buildTrendData,
  isCriticalAlert,
  isInRange,
  normalizeAlert,
  uniqueAlerts,
} from '../../utils/user/dashboardUtils';

import {
  fetchAlertsForSources,
  fetchDashboardKeywordAnalytics,
  fetchDashboardReviews,
} from '../../services/user/dashboardService';

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
  const { user, userProfile, refreshUserProfile } = useAuth();

  const [reviews, setReviews] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [keywordAnalytics, setKeywordAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  const isVip = userProfile?.tier === 'vip';

  const load = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);

    try {
      const reviewRows = await fetchDashboardReviews(user.id);
      const safeReviews = Array.isArray(reviewRows) ? reviewRows : [];

      const [alertRows, keywordPayload] = await Promise.allSettled([
        fetchAlertsForSources(user.id, safeReviews),
        fetchDashboardKeywordAnalytics({
          userId: user.id,
          sourceUrl: 'all',
        }),
      ]);

      const safeAlerts =
        alertRows.status === 'fulfilled' && Array.isArray(alertRows.value)
          ? alertRows.value
          : [];

      const safeKeywordAnalytics =
        keywordPayload.status === 'fulfilled' ? keywordPayload.value : null;

      /**
       * Set state sau khi đã lấy xong cả reviews + alerts.
       * Giảm tình trạng UI render một lượt review trước, rồi nhảy khi alerts về sau.
       */
      setReviews(safeReviews);
      setAlerts(safeAlerts);
      setKeywordAnalytics(safeKeywordAnalytics);
    } catch (error) {
      toast.error(error.message || 'Không tải được dữ liệu tổng quan.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const positive = reviews.filter((item) => normalizeLabel(item.ai_label) === 1).length;
    const negative = reviews.length - positive;
    const sources = new Set(reviews.map((item) => item.source_url).filter(Boolean)).size;

    const now = Date.now();
    const week = 7 * 24 * 60 * 60 * 1000;

    const current = reviews.filter((item) =>
      isInRange(item.created_at, now - week, now),
    ).length;

    const previous = reviews.filter((item) =>
      isInRange(item.created_at, now - week * 2, now - week),
    ).length;

    const growth =
      previous > 0
        ? ((current - previous) / previous) * 100
        : current > 0
          ? 100
          : 0;

    return {
      total: reviews.length,
      positive,
      negative,
      sources,
      positiveRate: reviews.length ? positive / reviews.length : 0,
      growth,
    };
  }, [reviews]);

  const trendData = useMemo(() => buildTrendData(reviews), [reviews]);

  const leaderboard = useMemo(() => {
    const value = keywordAnalytics?.leaderboard || keywordAnalytics?.data?.leaderboard;

    return buildBusinessLeaderboard(value, reviews);
  }, [keywordAnalytics, reviews]);

  const visibleAlerts = useMemo(() => {
    return buildVisibleAlerts(alerts, reviews);
  }, [alerts, reviews]);

  if (loading && !reviews.length) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500 font-sans">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-wide text-white">
          Tổng quan hoạt động
        </h1>
        <p className="text-sm text-slate-400">
          Theo dõi phản hồi khách hàng, điểm nổi bật và vấn đề cần xử lý.
        </p>
      </div>

      {!loading && stats.total === 0 ? (
        <EmptyDashboardState />
      ) : (
        <>
          <AlertsSection
            alerts={visibleAlerts}
            loading={loading}
            isVip={isVip}
            onUpgrade={() => setIsUpgradeModalOpen(true)}
          />

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <StatCard
              title="Tổng phản hồi"
              value={stats.total.toLocaleString('vi-VN')}
              icon={<MessageSquare className="h-5 w-5 text-indigo-400" />}
              trend={`${stats.growth >= 0 ? '+' : ''}${stats.growth.toFixed(1)}%`}
              trendUp={stats.growth >= 0}
            />

            <PositiveRateCard rate={stats.positiveRate} />

            <StatCard
              title="Nguồn đang theo dõi"
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

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <TrendCard data={trendData} />

            <QuickConclusionCard
              totalFeedback={stats.total}
              positiveCount={stats.positive}
              negativeCount={stats.negative}
              alertCount={visibleAlerts.length}
            />
          </div>

          <LeaderboardCard leaderboard={leaderboard} />

          <RecentReviews reviews={reviews} />
        </>
      )}

      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        onUpgraded={refreshUserProfile}
      />
    </div>
  );
}
