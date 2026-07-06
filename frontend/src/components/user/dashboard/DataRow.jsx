import { Globe, Hash } from 'lucide-react';

import { getConfidenceRatio } from '../../../utils/user/dashboardUtils';

export default function DataRow({ item }) {
  const isPositive = Number(item.ai_label) === 1;

  return (
    <div className="grid grid-cols-12 items-center gap-4 rounded-lg border-b border-slate-700/50 px-2 py-4 transition-colors last:border-0 hover:bg-slate-800/30">
      <div className="col-span-1 flex pl-2 text-slate-400">
        {item.source_url === 'CSV_Upload' ? <Hash className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
      </div>
      <div className="col-span-7 truncate pr-4 text-sm text-slate-300">{item.content}</div>
      <div className="col-span-2 flex justify-center">
        <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${isPositive ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border-rose-500/20 bg-rose-500/10 text-rose-400'}`}>
          {isPositive ? 'Khách hài lòng' : 'Khách chưa hài lòng'}
        </span>
      </div>
      <div className="col-span-2 pr-2 text-right font-mono text-sm text-slate-300">
        {(getConfidenceRatio(item.confidence) * 100).toFixed(1)}%
      </div>
    </div>
  );
}
