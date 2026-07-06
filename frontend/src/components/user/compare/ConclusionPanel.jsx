import { AlertTriangle, BarChart3, CheckCircle2, Scale, Star, Trophy } from 'lucide-react';

import ConclusionRow from './ConclusionRow';
import { normalizeKeywordList } from '../../../utils/user/compareUtils';

export default function ConclusionPanel({ summary }) {
  return (
    <div className="rounded-3xl border border-slate-700 bg-slate-800/40 p-6 backdrop-blur-md">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-300">
          <Trophy className="h-5 w-5" />
        </div>

        <div>
          <h2 className="font-semibold text-white">Kết luận chọn quán</h2>
          <p className="text-xs text-slate-500">Tự động chọn theo từng nhu cầu.</p>
        </div>
      </div>

      {summary ? (
        <div className="space-y-3">
          <ConclusionRow
            icon={<Star className="h-4 w-4" />}
            label="Ưu tiên trải nghiệm tốt"
            value={summary.bestTaste?.restaurant_name}
            detail={`${Number(summary.bestTaste?.positive_rate || 0).toFixed(1)}% hài lòng`}
            tone="emerald"
          />
          <ConclusionRow
            icon={<CheckCircle2 className="h-4 w-4" />}
            label="An toàn nhất"
            value={summary.safest?.restaurant_name}
            detail={`Rủi ro ${Number(summary.safest?.risk_score || 0).toFixed(0)}/100`}
            tone="sky"
          />
          <ConclusionRow
            icon={<BarChart3 className="h-4 w-4" />}
            label="Ưu tiên giá/đáng tiền"
            value={summary.mostAffordable?.restaurant_name || 'Chưa rõ'}
            detail={summary.mostAffordable ? 'Có tín hiệu về giá hợp lý' : 'Chưa đủ tín hiệu về giá'}
            tone="violet"
          />
          <ConclusionRow
            icon={<AlertTriangle className="h-4 w-4" />}
            label="Cần né lúc cao điểm"
            value={summary.warning?.restaurant_name}
            detail={normalizeKeywordList(summary.warning?.top_negative_keywords).join(', ') || 'Có rủi ro cần xem'}
            tone="rose"
          />
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/30 p-6 text-center">
          <Scale className="mx-auto mb-3 h-10 w-10 text-slate-600" />
          <p className="text-sm font-semibold text-slate-300">Chưa có kết quả so sánh</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Nhập ít nhất 2 link quán rồi bấm “Bắt đầu so sánh”.
          </p>
        </div>
      )}
    </div>
  );
}
