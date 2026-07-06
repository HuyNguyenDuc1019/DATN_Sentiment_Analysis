import {
  isNegativeKeyword,
  isPositiveKeyword,
  normalizeLeaderboardItems,
} from '../../../utils/user/dashboardUtils';

export default function KeywordList({ title, icon, items, positive = false }) {
  const displayItems = normalizeLeaderboardItems(items)
    .filter((item) => (positive ? isPositiveKeyword(item.text) : isNegativeKeyword(item.text)))
    .slice(0, 5);

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-4">
      <h3 className={`mb-4 flex items-center gap-2 text-sm font-semibold ${positive ? 'text-emerald-300' : 'text-rose-300'}`}>
        {icon}
        {title}
      </h3>
      <div className="space-y-3">
        {displayItems.length ? (
          displayItems.map((item, index) => {
            const { text, value } = item;
            return (
              <div key={`${text}-${index}`} className="flex items-center justify-between gap-3 rounded-lg bg-slate-950/35 px-3 py-2">
                <span className="truncate text-sm text-slate-200">{index + 1}. {text}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${positive ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'}`}>
                  {value}
                </span>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-slate-500">Chưa có dữ liệu.</p>
        )}
      </div>
    </div>
  );
}
