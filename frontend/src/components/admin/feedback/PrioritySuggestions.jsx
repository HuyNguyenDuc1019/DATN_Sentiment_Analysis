export default function PrioritySuggestions({
  priorityStats,
  priorityFilter,
  onApplyPriorityFilter,
  onClearPriorityFilter,
}) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-5 backdrop-blur-md">
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-white">Gợi ý ưu tiên xử lý</h2>
        <p className="text-sm text-slate-400">
          Tự động gom các phản hồi nên kiểm tra trước để giảm dữ liệu sai khi xuất dataset.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <PriorityCard
          tone="rose"
          title="AI tự tin nhưng sai"
          description="AI confidence ≥ 80% nhưng khác nhãn người dùng sửa."
          count={`${priorityStats.confidentWrong.length} mẫu`}
          onClick={() => onApplyPriorityFilter('confident_wrong')}
        />

        <PriorityCard
          tone="indigo"
          title="Nội dung dài đáng duyệt"
          description="Câu dài từ 80 ký tự trở lên, thường có nhiều ngữ cảnh hơn."
          count={`${priorityStats.longContent.length} mẫu`}
          onClick={() => onApplyPriorityFilter('long_content')}
        />

        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-amber-300">Nội dung bị lặp</p>
              <p className="mt-1 text-xs text-slate-400">Phát hiện nội dung giống nhau để tránh dataset bị lệch.</p>
            </div>
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-sm font-bold text-amber-300">
              {priorityStats.duplicateGroups.length} nhóm
            </span>
          </div>

          <div className="mb-3 space-y-1">
            {priorityStats.duplicateGroups.slice(0, 2).map((group) => (
              <p key={group.text} className="truncate text-xs text-slate-300" title={group.text}>
                {group.text} - xuất hiện {group.count} lần
              </p>
            ))}

            {priorityStats.duplicateGroups.length === 0 && (
              <p className="text-xs text-slate-500">Chưa phát hiện nội dung bị lặp.</p>
            )}
          </div>

          <button
            onClick={() => onApplyPriorityFilter('duplicate')}
            className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300 transition-colors hover:bg-amber-500/20"
          >
            Xem ngay
          </button>
        </div>
      </div>

      {priorityFilter !== 'all' && (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900/40 px-4 py-3">
          <p className="text-sm text-slate-300">Đang lọc theo gợi ý ưu tiên.</p>
          <button
            onClick={onClearPriorityFilter}
            className="text-xs font-medium text-slate-400 transition-colors hover:text-white"
          >
            Bỏ lọc ưu tiên
          </button>
        </div>
      )}
    </div>
  );
}

function PriorityCard({ tone, title, description, count, onClick }) {
  const tones = {
    rose: {
      box: 'border-rose-500/20 bg-rose-500/10',
      text: 'text-rose-300',
      badge: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
      button: 'border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20',
    },
    indigo: {
      box: 'border-indigo-500/20 bg-indigo-500/10',
      text: 'text-indigo-300',
      badge: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300',
      button: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20',
    },
  }[tone];

  return (
    <div className={`rounded-xl border p-4 ${tones.box}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className={`text-sm font-semibold ${tones.text}`}>{title}</p>
          <p className="mt-1 text-xs text-slate-400">{description}</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-sm font-bold ${tones.badge}`}>
          {count}
        </span>
      </div>

      <button
        onClick={onClick}
        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${tones.button}`}
      >
        Xem ngay
      </button>
    </div>
  );
}
