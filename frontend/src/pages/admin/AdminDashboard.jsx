import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { Activity, Users, MessageSquare, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        const adminId = localStorage.getItem('userId');

        // Gọi đồng thời 2 API để tiết kiệm thời gian
        const [metricsRes, chartRes] = await Promise.all([
          fetch(`http://localhost:8000/api/admin/metrics?admin_id=${adminId}`),
          fetch(`http://localhost:8000/api/admin/metrics/chart?days=7&admin_id=${adminId}`)
        ]);

        if (!metricsRes.ok || !chartRes.ok) {
          throw new Error('Lỗi từ phía máy chủ Backend');
        }

        const metricsData = await metricsRes.json();
        const chartDataResult = await chartRes.json();

        setMetrics(metricsData);
        setChartData(chartDataResult.chart_data || []);

      } catch (error) {
        console.error("Lỗi fetch Dashboard:", error);
        toast.error('Không thể tải dữ liệu thống kê. Vui lòng kiểm tra lại Backend.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []); // Cố định mảng rỗng để không bao giờ bị lỗi render loop

  const cardConfig = [
    {
      title: 'Tổng số API Calls',
      key: 'total_api_calls',
      icon: <Activity className="h-5 w-5 text-indigo-400" />,
      formatter: (val) => new Intl.NumberFormat('vi-VN').format(val),
    },
    {
      title: 'Tổng Người dùng',
      key: 'total_users',
      icon: <Users className="h-5 w-5 text-indigo-400" />,
      formatter: (val) => new Intl.NumberFormat('vi-VN').format(val),
    },
    {
      title: 'Phản hồi chờ xử lý',
      key: 'pending_feedbacks',
      icon: <MessageSquare className="h-5 w-5 text-indigo-400" />,
      formatter: (val) => new Intl.NumberFormat('vi-VN').format(val),
    },
    {
      title: 'Tỉ lệ Tích cực',
      key: 'global_positive_ratio',
      icon: <TrendingUp className="h-5 w-5 text-indigo-400" />,
      formatter: (val) => `${val}%`,
    }
  ];

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500 font-sans">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-wide text-white">Tổng quan hệ thống</h1>
        <p className="text-sm text-slate-400">Theo dõi các chỉ số quan trọng của hệ thống AI.</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="flex flex-col justify-between rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <div className="w-24 h-4 bg-slate-700 rounded animate-pulse"></div>
                <div className="w-5 h-5 bg-slate-700 rounded animate-pulse"></div>
              </div>
              <div className="mt-4">
                <div className="w-32 h-10 bg-slate-700 rounded animate-pulse"></div>
              </div>
            </div>
          ))
        ) : (
          cardConfig.map((card, index) => {
            const value = metrics ? metrics[card.key] : 0;
            return (
              <div key={index} className="flex flex-col justify-between rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-md transition-colors hover:bg-slate-800">
                <div className="flex items-start justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{card.title}</h3>
                  {card.icon}
                </div>
                <div className="mt-4 flex items-end justify-between">
                  <div className="text-4xl font-bold text-white">{card.formatter(value)}</div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Chart Area */}
      <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-md">
        <h3 className="mb-2 text-sm font-medium text-slate-200">Lưu lượng API 7 ngày qua</h3>
        <p className="mb-6 text-xs text-slate-500">Biểu đồ thể hiện số lượng yêu cầu API được xử lý thành công.</p>
        
        <div className="h-64 w-full">
          {isLoading ? (
            <div className="w-full h-full relative overflow-hidden flex items-end pb-8 px-8 gap-4 justify-between">
              <div className="absolute inset-0 flex flex-col justify-between py-8">
                {Array(5).fill(0).map((_, i) => (
                  <div key={i} className="w-full h-px bg-slate-700/50"></div>
                ))}
              </div>
              {[40, 70, 45, 90, 65, 30, 80].map((height, i) => (
                <div 
                  key={i} 
                  className="w-full bg-slate-700/50 rounded-t-sm animate-pulse z-10" 
                  style={{ height: `${height}%`, animationDelay: `${i * 0.1}s` }}
                ></div>
              ))}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorApiCalls" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#334155" strokeDasharray="4 4" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#94a3b8" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(val) => {
                    const date = new Date(val);
                    return `${date.getDate()}/${date.getMonth() + 1}`;
                  }}
                />
                <YAxis 
                  stroke="#94a3b8" 
                  tick={{ fontSize: 12 }} 
                  allowDecimals={false}
                  tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                />
                <Tooltip 
                  contentStyle={{
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 12,
                    color: '#e2e8f0',
                  }}
                  labelStyle={{ color: '#f8fafc' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="api_calls" 
                  name="Yêu cầu API"
                  stroke="#818cf8" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorApiCalls)" 
                  activeDot={{ r: 6, fill: '#818cf8', stroke: '#0f172a', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;