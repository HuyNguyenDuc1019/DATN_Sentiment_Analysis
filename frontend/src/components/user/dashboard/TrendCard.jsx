import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export default function TrendCard({ data }) {
  return (
    <section className="flex h-full min-h-[420px] min-w-0 flex-col rounded-2xl border border-slate-700 bg-slate-800/50 p-5 backdrop-blur-md sm:p-6">
      <h3 className="mb-2 text-sm font-medium text-slate-200">Xu hướng phản hồi 7 ngày</h3>
      <p className="mb-6 text-xs text-slate-500">
        Đường xanh là phản hồi hài lòng, đường đỏ là phản hồi chưa hài lòng.
      </p>
      <div className="min-h-[280px] w-full flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 20, left: -20, bottom: 5 }}>
            <CartesianGrid stroke="#334155" strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 12 }} />
            <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: 12,
                color: '#e2e8f0',
              }}
              labelStyle={{ color: '#f8fafc' }}
            />
            <Legend wrapperStyle={{ color: '#cbd5e1', fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="positive"
              name="Hài lòng"
              stroke="#10b981"
              strokeWidth={3}
              dot={{ r: 4, fill: '#10b981' }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="negative"
              name="Chưa hài lòng"
              stroke="#fb7185"
              strokeWidth={3}
              dot={{ r: 4, fill: '#fb7185' }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
