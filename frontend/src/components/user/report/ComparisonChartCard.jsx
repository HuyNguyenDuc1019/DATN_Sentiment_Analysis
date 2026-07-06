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

import EmptyData from './EmptyData';

export default function ComparisonChartCard({ groups }) {
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
