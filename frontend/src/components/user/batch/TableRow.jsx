import { CheckCircle2, XCircle } from 'lucide-react';

export default function TableRow({ data }) {
  const { id, content, sentiment, confidence } = data;
  const isPositive = sentiment === 'positive';

  return (
    <tr className="transition-colors hover:bg-slate-800/40">
      <td className="px-4 py-4 font-mono text-xs text-slate-500">{id}</td>
      <td className="px-4 py-4 text-slate-300">
        <p className="line-clamp-2 max-w-[520px] leading-6" title={content}>
          {content || '—'}
        </p>
      </td>
      <td className="px-4 py-4">
        <div className="flex justify-center">
          {sentiment ? (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${
                isPositive
                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                  : 'border-rose-500/20 bg-rose-500/10 text-rose-300'
              }`}
            >
              {isPositive ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
              {isPositive ? 'Khách hài lòng' : 'Khách chưa hài lòng'}
            </span>
          ) : (
            <span className="text-slate-500">Chưa xử lý</span>
          )}
        </div>
      </td>
      <td className="px-4 py-4 text-right">
        <div className="flex items-center justify-end gap-3">
          <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-slate-700 sm:block">
            <div
              className={`h-full rounded-full ${
                Number(confidence || 0) >= 80
                  ? 'bg-emerald-400'
                  : Number(confidence || 0) >= 60
                    ? 'bg-amber-400'
                    : 'bg-rose-400'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, Number(confidence || 0)))}%` }}
            />
          </div>
          <span className="font-mono text-xs font-semibold text-slate-300">
            {confidence === null ? '-' : `${confidence}%`}
          </span>
        </div>
      </td>
    </tr>
  );
}
