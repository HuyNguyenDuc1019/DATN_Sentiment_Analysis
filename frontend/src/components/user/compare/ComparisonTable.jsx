import { getDataSourceBadge, getRiskTone } from '../../../utils/user/compareUtils';

export default function ComparisonTable({ items }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-700 bg-slate-800/45 backdrop-blur-md">
      <div className="border-b border-slate-700 px-6 py-5">
        <h2 className="text-lg font-semibold text-white">Bảng so sánh chi tiết</h2>
        <p className="mt-1 text-sm text-slate-400">
          Bảng này chỉ dùng cho kết quả so sánh, không ảnh hưởng số liệu Dashboard.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] table-fixed text-left text-sm">
          <thead className="border-b border-slate-700 bg-slate-900/40 text-xs uppercase tracking-wider text-slate-400">
            <tr>
              <th className="w-[300px] px-5 py-4">Quán</th>
              <th className="w-[110px] px-5 py-4">Tổng review</th>
              <th className="w-[110px] px-5 py-4">Hài lòng</th>
              <th className="w-[120px] px-5 py-4">Chưa hài lòng</th>
              <th className="w-[120px] px-5 py-4">Risk score</th>
              <th className="w-[130px] px-5 py-4">Nguồn</th>
              <th className="px-5 py-4">Khuyên dùng khi</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-700/60">
            {items.map((item, index) => {
              const tone = getRiskTone(item.risk_score);

              return (
                <tr key={`${item.source_url || 'comparison-row'}-${index}`} className="transition hover:bg-slate-800/40">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-200">{item.restaurant_name || `Quán ${index + 1}`}</p>
                    <p className="mt-1 max-w-[280px] truncate text-xs text-slate-500">{item.source_url}</p>
                  </td>
                  <td className="px-5 py-4 text-slate-300">{Number(item.total_reviews || 0).toLocaleString('vi-VN')}</td>
                  <td className="px-5 py-4 text-emerald-300">{Number(item.positive_rate || 0).toFixed(1)}%</td>
                  <td className="px-5 py-4 text-rose-300">{Number(item.negative_rate || 0).toFixed(1)}%</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex whitespace-nowrap rounded-full border px-3 py-1 text-xs font-bold leading-none ${tone.bg} ${tone.border} ${tone.text}`}>
                      {Number(item.risk_score || 0).toFixed(0)}/100
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex whitespace-nowrap rounded-full border px-3 py-1 text-xs font-bold leading-none ${getDataSourceBadge(item.data_source).className}`}>
                      {getDataSourceBadge(item.data_source).label}
                    </span>
                  </td>
                  <td className="px-5 py-4 leading-6 text-slate-400">
                    {item.recommendation || 'Chưa có lời khuyên.'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
