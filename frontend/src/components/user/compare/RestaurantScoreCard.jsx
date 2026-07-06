import { ExternalLink } from 'lucide-react';

import KeywordBlock from './KeywordBlock';
import MetricBox from './MetricBox';
import {
  getDataSourceBadge,
  getRiskTone,
  normalizeKeywordList,
} from '../../../utils/user/compareUtils';

export default function RestaurantScoreCard({ item, index }) {
  const riskTone = getRiskTone(item.risk_score);
  const positiveRate = Number(item.positive_rate || 0);
  const negativeRate = Number(item.negative_rate || 0);
  const positiveKeywords = normalizeKeywordList(item.top_positive_keywords);
  const negativeKeywords = normalizeKeywordList(item.top_negative_keywords);

  return (
    <article className={`rounded-3xl border ${riskTone.border} bg-slate-800/45 p-6 backdrop-blur-md`}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
            Quán {String.fromCharCode(65 + index)}
          </p>
          <h3 className="mt-1 line-clamp-2 text-lg font-bold text-white">
            {item.restaurant_name || item.source_url || `Quán ${index + 1}`}
          </h3>
          {item.source_url && (
            <a
              href={item.source_url}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs text-indigo-300 hover:text-indigo-200"
            >
              Xem nguồn <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className={`rounded-full border px-3 py-1 text-xs font-bold ${riskTone.bg} ${riskTone.border} ${riskTone.text}`}>
            {riskTone.label}
          </span>
          <span className={`rounded-full border px-3 py-1 text-[11px] font-bold ${getDataSourceBadge(item.data_source).className}`}>
            {getDataSourceBadge(item.data_source).label}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MetricBox label="Hài lòng" value={`${positiveRate.toFixed(1)}%`} tone="emerald" />
        <MetricBox label="Chưa hài lòng" value={`${negativeRate.toFixed(1)}%`} tone="rose" />
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
          <span>Risk score</span>
          <span>{Number(item.risk_score || 0).toFixed(0)}/100</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-950/70">
          <div
            className={`h-full rounded-full ${riskTone.bar}`}
            style={{ width: `${Math.min(100, Math.max(0, Number(item.risk_score || 0)))}%` }}
          />
        </div>
      </div>

      <KeywordBlock title="Điểm mạnh" items={positiveKeywords} tone="emerald" />
      <KeywordBlock title="Điểm cần lưu ý" items={negativeKeywords} tone="rose" />

      <div className="mt-5 rounded-2xl border border-slate-700/70 bg-slate-950/35 p-4">
        <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">Lời khuyên</p>
        <p className="text-sm leading-6 text-slate-300">
          {item.recommendation || 'Chưa có đủ dữ liệu để đưa ra lời khuyên.'}
        </p>
      </div>
    </article>
  );
}
