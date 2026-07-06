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
      setReviews(reviewRows);

      const [alertRows, keywordPayload] = await Promise.allSettled([
        fetchAlertsForSources(user.id, reviewRows),
        fetchDashboardKeywordAnalytics({ userId: user.id, sourceUrl: 'all' }),
      ]);

      setAlerts(alertRows.status === 'fulfilled' ? alertRows.value : []);
      setKeywordAnalytics(keywordPayload.status === 'fulfilled' ? keywordPayload.value : null);
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
    const positive = reviews.filter((item) => Number(item.ai_label) === 1).length;
    const negative = reviews.length - positive;
    const sources = new Set(reviews.map((item) => item.source_url).filter(Boolean)).size;
    const now = Date.now();
    const week = 7 * 24 * 60 * 60 * 1000;
    const current = reviews.filter((item) => isInRange(item.created_at, now - week, now)).length;
    const previous = reviews.filter((item) => isInRange(item.created_at, now - week * 2, now - week)).length;
    const growth = previous > 0 ? ((current - previous) / previous) * 100 : current > 0 ? 100 : 0;

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
    const source = uniqueAlerts([...alerts, ...reviews]);

    return source
      .filter(isCriticalAlert)
      .sort((a, b) => {
        const actionScore = Number(Boolean(b.is_action_required)) - Number(Boolean(a.is_action_required));
        if (actionScore !== 0) return actionScore;

        const dateScore = new Date(b.review_date || b.created_at || 0) - new Date(a.review_date || a.created_at || 0);
        if (dateScore !== 0) return dateScore;

        return Number(b.confidence || 0) - Number(a.confidence || 0);
      })
      .slice(0, 4)
      .map((item) => normalizeAlert(item));
  }, [alerts, reviews]);

  if (loading && !reviews.length) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500 font-sans">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-wide text-white">Tổng quan hoạt động</h1>
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
