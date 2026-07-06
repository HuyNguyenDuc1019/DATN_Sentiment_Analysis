export default function FeedbackLabelBadge({ value }) {
  if (value === null || value === undefined) {
    return (
      <span className="inline-flex items-center justify-center whitespace-nowrap px-2.5 py-1 text-xs rounded-full font-medium leading-none border bg-slate-500/10 text-slate-400 border-slate-500/20">
        Chưa có nhãn
      </span>
    );
  }

  if (Number(value) === 1) {
    return (
      <span className="inline-flex items-center justify-center whitespace-nowrap px-2.5 py-1 text-xs rounded-full font-medium leading-none border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
        Tích cực (1)
      </span>
    );
  }

  if (Number(value) === 0) {
    return (
      <span className="inline-flex items-center justify-center whitespace-nowrap px-2.5 py-1 text-xs rounded-full font-medium leading-none border bg-rose-500/10 text-rose-400 border-rose-500/20">
        Tiêu cực (0)
      </span>
    );
  }

  return (
    <span className="inline-flex items-center justify-center whitespace-nowrap px-2.5 py-1 text-xs rounded-full font-medium leading-none border bg-orange-500/10 text-orange-400 border-orange-500/20">
      Khác ({value})
    </span>
  );
}
