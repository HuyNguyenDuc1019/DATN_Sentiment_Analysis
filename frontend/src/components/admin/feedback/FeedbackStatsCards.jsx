const cards = [
  { key: 'total', title: 'Tổng phản hồi', className: 'text-white' },
  { key: 'pending', title: 'Chờ xử lý', className: 'text-amber-400' },
  { key: 'approved', title: 'Đã duyệt', className: 'text-emerald-400' },
  { key: 'rejected', title: 'Đã từ chối', className: 'text-rose-400' },
];

export default function FeedbackStatsCards({ stats, isLoading }) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.key} className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-md">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{card.title}</h3>
          <p className={`mt-4 text-4xl font-bold ${card.className}`}>
            {isLoading ? '...' : stats[card.key]}
          </p>
        </div>
      ))}
    </div>
  );
}
