import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, MessageSquare, TrendingUp, Users } from 'lucide-react';
import toast from 'react-hot-toast';

import AdminActivityLog from './AdminActivityLog';

import AdminDashboardHeader from '../../components/admin/dashboard/AdminDashboardHeader';
import AdminStatsGrid from '../../components/admin/dashboard/AdminStatsGrid';
import SentimentChartCard from '../../components/admin/dashboard/SentimentChartCard';
import RecentUsersCard from '../../components/admin/dashboard/RecentUsersCard';

import {
  emptyStats,
  formatAdminChartData,
  formatNumber,
  getRecentUsers,
} from '../../utils/admin/dashboardUtils';

import {
  exportAdminDashboardReport,
  fetchAdminDashboardData,
} from '../../services/admin/dashboardService';

function getAdminDashboardCards(stats) {
  return [
    {
      title: 'Tổng bình luận đã phân tích',
      value: stats.apiCalls,
      icon: <Activity className="h-5 w-5 text-indigo-400" />,
      formatter: formatNumber,
    },
    {
      title: 'Tổng người dùng',
      value: stats.users,
      icon: <Users className="h-5 w-5 text-indigo-400" />,
      formatter: formatNumber,
    },
    {
      title: 'Phản hồi chờ xử lý',
      value: stats.pendingFeedback,
      icon: <MessageSquare className="h-5 w-5 text-indigo-400" />,
      formatter: formatNumber,
    },
    {
      title: 'Tỉ lệ tích cực',
      value: stats.positiveRate,
      icon: <TrendingUp className="h-5 w-5 text-indigo-400" />,
      formatter: (value) => `${Number(value || 0).toFixed(0)}%`,
    },
  ];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(emptyStats);
  const [weeklyData, setWeeklyData] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);

    try {
      const { metricsData, chartDataResponse, usersData } = await fetchAdminDashboardData();

      setStats({
        apiCalls: Number(
          metricsData.total_analyzed_reviews ?? metricsData.total_api_calls ?? 0,
        ),
        users: Number(metricsData.total_users ?? 0),
        pendingFeedback: Number(metricsData.pending_feedbacks ?? 0),
        positiveRate: Number(metricsData.global_positive_ratio ?? 0),
      });

      setWeeklyData(formatAdminChartData(chartDataResponse.chart_data || []));
      setRecentUsers(getRecentUsers(usersData || []));
    } catch (error) {
      console.error('Load admin dashboard failed:', error);
      toast.error('Không thể tải dữ liệu thống kê từ máy chủ Backend.', {
        id: 'admin-dashboard-load-error',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const chartData = useMemo(
    () =>
      weeklyData.map((item) => ({
        date: item.key,
        positive: item.positive || 0,
        negative: item.negative || 0,
      })),
    [weeklyData],
  );

  const cardConfig = useMemo(() => getAdminDashboardCards(stats), [stats]);

  const handleExportPdf = useCallback(() => {
    try {
      exportAdminDashboardReport({
        stats,
        chartData,
        recentUsers,
        formatNumber,
      });

      toast.success('Đã mở bản báo cáo. Chọn Save as PDF để lưu file.');
    } catch (error) {
      console.error('Export admin report failed:', error);
      toast.error(`Không thể xuất báo cáo: ${error.message}`);
    }
  }, [chartData, recentUsers, stats]);

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500 font-sans">
      <AdminDashboardHeader
        isLoading={isLoading}
        onExportPdf={handleExportPdf}
        onRefresh={loadData}
      />

      <AdminStatsGrid
        isLoading={isLoading}
        cards={cardConfig}
      />

      <SentimentChartCard
        isLoading={isLoading}
        chartData={chartData}
      />

      <AdminActivityLog />

      <RecentUsersCard
        isLoading={isLoading}
        recentUsers={recentUsers}
      />
    </div>
  );
}
