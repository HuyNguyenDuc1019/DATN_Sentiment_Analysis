export default function ProcessSummary({ file, count, column, resultCount, averageConfidence }) {
  return (
    <div className="rounded-3xl border border-slate-700 bg-slate-800/40 p-5 backdrop-blur-md">
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Tóm tắt phiên xử lý</h3>

      <div className="mt-4 space-y-3 text-sm">
        <SummaryRow label="File" value={file?.name || 'Chưa chọn'} />
        <SummaryRow label="Cột dữ liệu" value={column || 'Chưa chọn'} />
        <SummaryRow label="Đã đọc" value={`${Number(count || 0).toLocaleString('vi-VN')} phản hồi`} />
        <SummaryRow label="Đã xử lý" value={`${Number(resultCount || 0).toLocaleString('vi-VN')} dòng`} />
        <SummaryRow label="Tin cậy TB" value={resultCount ? `${averageConfidence}%` : '—'} />
      </div>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-700/50 bg-slate-950/25 px-3 py-2">
      <span className="text-slate-500">{label}</span>
      <span className="max-w-[180px] truncate text-right font-semibold text-slate-200" title={String(value)}>
        {value}
      </span>
    </div>
  );
}
