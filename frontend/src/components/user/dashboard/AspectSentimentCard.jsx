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

export default function AspectSentimentCard({ data }) {
  const topPositive = data.reduce(
    (best, item) => (item.positive > (best?.positive || 0) ? item : best),
    null,
  );
  const topNegative = data.reduce(
    (best, item) => (item.negative > (best?.negative || 0) ? item : best),
    null,
  );

  return (
    <section className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-md">
      <div className="mb-5 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Khía cạnh được khen và chê</h2>
          <p className="mt-1 text-sm text-slate-400">
            So sánh số lượt hài lòng và chưa hài lòng theo từng khía cạnh khách hàng nhắc đến.
          </p>
        </div>

        {!!data.length && (
          <div className="flex flex-wrap gap-2 text-xs">
            {topPositive?.positive > 0 && (
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-emerald-300">
                Khen nhiều nhất: <strong>{topPositive.aspect}</strong>
              </span>
            )}
            {topNegative?.negative > 0 && (
              <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-rose-300">
                Chê nhiều nhất: <strong>{topNegative.aspect}</strong>
              </span>
            )}
          </div>
        )}
      </div>

      {data.length ? (
        <div className="h-[340px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 8, right: 24, left: 12, bottom: 8 }}
            >
              <CartesianGrid stroke="#334155" strokeDasharray="4 4" horizontal={false} />
              <XAxis type="number" allowDecimals={false} stroke="#94a3b8" />
              <YAxis
                type="category"
                dataKey="aspect"
                width={110}
                stroke="#94a3b8"
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                cursor={{ fill: 'rgba(51, 65, 85, 0.25)' }}
                contentStyle={{
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: 12,
                  color: '#e2e8f0',
                }}
              />
              <Legend wrapperStyle={{ color: '#cbd5e1', fontSize: 12 }} />
              <Bar dataKey="positive" name="Hài lòng" fill="#10b981" radius={[0, 6, 6, 0]} />
              <Bar dataKey="negative" name="Chưa hài lòng" fill="#fb7185" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-slate-700 text-center text-sm text-slate-500">
          Chưa có dữ liệu khía cạnh. Dữ liệu mới sau khi phân tích sẽ xuất hiện tại đây.
        </div>
      )}
    </section>
  );
}
