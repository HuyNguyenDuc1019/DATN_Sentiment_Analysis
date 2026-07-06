import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import SentimentChartSkeleton from './SentimentChartSkeleton';

export default function SentimentChartCard({ isLoading, chartData }) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-md">
      <h3 className="mb-2 text-sm font-medium text-slate-200">
        Phân hóa phản hồi 7 ngày qua
      </h3>
      <p className="mb-6 text-xs text-slate-500">
        Đường xanh là phản hồi tích cực, đường đỏ là phản hồi tiêu cực.
      </p>

      <div className="h-64 w-full">
        {isLoading ? (
          <SentimentChartSkeleton />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 5 }}>
              <CartesianGrid stroke="#334155" strokeDasharray="4 4" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#94a3b8"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return Number.isNaN(date.getTime())
                    ? value
                    : `${date.getDate()}/${date.getMonth() + 1}`;
                }}
              />
              <YAxis
                stroke="#94a3b8"
                tick={{ fontSize: 12 }}
                allowDecimals={false}
                tickFormatter={(value) => (value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value)}
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
              <Line
                type="monotone"
                dataKey="positive"
                name="Tích cực"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ r: 4, fill: '#10b981' }}
                activeDot={{ r: 6, fill: '#10b981', stroke: '#0f172a', strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="negative"
                name="Tiêu cực"
                stroke="#f43f5e"
                strokeWidth={3}
                dot={{ r: 4, fill: '#f43f5e' }}
                activeDot={{ r: 6, fill: '#f43f5e', stroke: '#0f172a', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
