import React, { useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Frown,
  ShieldAlert,
  SmilePlus,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

const numberFormat = new Intl.NumberFormat('vi-VN');

const safeNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const percent = (part, total) => {
  const safeTotal = safeNumber(total);
  if (safeTotal <= 0) return 0;
  return Math.round((safeNumber(part) / safeTotal) * 1000) / 10;
};

export function buildQuickConclusion({
  positiveCount = 0,
  negativeCount = 0,
  alertCount = 0,
  totalFeedback,
}) {
  const positive = safeNumber(positiveCount);
  const negative = safeNumber(negativeCount);
  const alerts = safeNumber(alertCount);

  const sentimentTotal = positive + negative;
  const total = safeNumber(totalFeedback) || sentimentTotal || alerts;

  const positiveRate = percent(positive, sentimentTotal);
  const negativeRate = percent(negative, sentimentTotal);
  const alertRate = percent(alerts, total);

  // Một bình luận tiêu cực thường đồng thời nằm trong danh sách cảnh báo.
  // Dùng giá trị lớn hơn thay vì cộng hai tỷ lệ để tránh tính trùng dữ liệu.
  // Cảnh báo đóng vai trò hỗ trợ và không thể một mình đẩy kết luận lên mức
  // nguy hiểm trong khi tỷ lệ hài lòng vẫn rất cao.
  const riskScore = Math.max(negativeRate, alertRate * 0.75);
  let level = 'good';

  if (total < 5) {
    level = 'insufficient';
  } else if (riskScore >= 50) {
    level = 'critical';
  } else if (riskScore >= 30) {
    level = 'high';
  } else if (riskScore >= 15) {
    level = 'medium';
  }

  const config = {
    insufficient: {
      title: 'Chưa đủ dữ liệu',
      badge: 'Cần thêm phản hồi',
      tone: 'amber',
      icon: AlertTriangle,
      description: 'Số lượng phản hồi hiện tại chưa đủ để đưa ra kết luận đáng tin cậy.',
      suggestion: 'Hãy thu thập ít nhất 5 phản hồi rồi kiểm tra lại kết luận tổng quan.',
    },
    good: {
      title: 'Đáng để thử',
      badge: 'Rủi ro thấp',
      tone: 'emerald',
      icon: CheckCircle2,
      description: 'Phần lớn khách hàng hài lòng và tỷ lệ tín hiệu tiêu cực đang ở mức thấp.',
      suggestion: 'Có thể cân nhắc trải nghiệm, đồng thời tiếp tục theo dõi các phản hồi mới.',
    },
    medium: {
      title: 'Nên thử có chọn lọc',
      badge: 'Cần theo dõi',
      tone: 'amber',
      icon: AlertTriangle,
      description: 'Phản hồi tích cực vẫn tốt, nhưng đã xuất hiện một số tín hiệu cần chú ý.',
      suggestion: 'Nên đọc kỹ các phản hồi tiêu cực gần đây trước khi ra quyết định.',
    },
    high: {
      title: 'Cần cân nhắc kỹ',
      badge: 'Rủi ro cao',
      tone: 'rose',
      icon: ShieldAlert,
      description: 'Tỷ lệ chưa hài lòng hoặc số cảnh báo đang ở mức cần kiểm tra lại.',
      suggestion: 'Nên xem các cảnh báo nổi bật và nguyên nhân bị phàn nàn trước khi thử.',
    },
    critical: {
      title: 'Không nên vội thử',
      badge: 'Rất rủi ro',
      tone: 'rose',
      icon: Frown,
      description: 'Tín hiệu tiêu cực đang cao hơn mức an toàn hoặc có nhiều cảnh báo nghiêm trọng.',
      suggestion: 'Nên tạm dừng quyết định và kiểm tra kỹ các vấn đề lặp lại.',
    },
  };

  return {
    ...config[level],
    level,
    total,
    positive,
    negative,
    alerts,
    positiveRate,
    negativeRate,
    alertRate,
    riskScore,
  };
}

const toneClasses = {
  emerald: {
    card: 'border-emerald-500/30 bg-emerald-500/10 shadow-emerald-950/20',
    icon: 'bg-emerald-500/15 text-emerald-300',
    title: 'text-emerald-200',
    badge: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
    bar: 'from-emerald-400 to-teal-400',
    soft: 'border-emerald-500/20 bg-emerald-500/10',
  },
  amber: {
    card: 'border-amber-500/30 bg-amber-500/10 shadow-amber-950/20',
    icon: 'bg-amber-500/15 text-amber-300',
    title: 'text-amber-200',
    badge: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
    bar: 'from-amber-400 to-orange-400',
    soft: 'border-amber-500/20 bg-amber-500/10',
  },
  rose: {
    card: 'border-rose-500/30 bg-rose-500/10 shadow-rose-950/20',
    icon: 'bg-rose-500/15 text-rose-300',
    title: 'text-rose-200',
    badge: 'border-rose-400/30 bg-rose-400/10 text-rose-200',
    bar: 'from-rose-400 to-red-400',
    soft: 'border-rose-500/20 bg-rose-500/10',
  },
};

export default function QuickConclusionCard({
  positiveCount = 0,
  negativeCount = 0,
  alertCount = 0,
  totalFeedback = 0,
}) {
  const conclusion = useMemo(
    () =>
      buildQuickConclusion({
        positiveCount,
        negativeCount,
        alertCount,
        totalFeedback,
      }),
    [positiveCount, negativeCount, alertCount, totalFeedback]
  );

  const tone = toneClasses[conclusion.tone];
  const Icon = conclusion.icon;

  return (
    <section className={`flex h-full min-h-[420px] flex-col rounded-2xl border p-5 shadow-xl ${tone.card}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone.icon}`}>
            <Icon className="h-5 w-5" />
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Kết luận nhanh</p>
            <h2 className={`mt-1 text-xl font-extrabold leading-tight ${tone.title}`}>{conclusion.title}</h2>
          </div>
        </div>

        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold ${tone.badge}`}>{conclusion.badge}</span>
      </div>

      <p className="text-sm font-semibold text-slate-100">{conclusion.description}</p>
      <p className="mt-1.5 text-sm leading-5 text-slate-400">{conclusion.suggestion}</p>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
          <span>Chỉ số hài lòng</span>
          <span>{conclusion.positiveRate}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-950/70">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${tone.bar}`}
            style={{ width: `${Math.min(100, Math.max(0, conclusion.positiveRate))}%` }}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-2.5">
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-slate-950/30 px-4 py-2.5">
          <div className="flex items-center gap-3 text-sm font-semibold text-slate-100">
            <TrendingUp className="h-4 w-4 text-emerald-300" />
            Khách hài lòng
          </div>
          <div className="text-right">
            <p className="font-bold text-emerald-300">{numberFormat.format(conclusion.positive)}</p>
            <p className="text-xs text-slate-500">{conclusion.positiveRate}%</p>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-rose-500/20 bg-slate-950/30 px-4 py-2.5">
          <div className="flex items-center gap-3 text-sm font-semibold text-slate-100">
            <TrendingDown className="h-4 w-4 text-rose-300" />
            Khách chưa hài lòng
          </div>
          <div className="text-right">
            <p className="font-bold text-rose-300">{numberFormat.format(conclusion.negative)}</p>
            <p className="text-xs text-slate-500">{conclusion.negativeRate}%</p>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-slate-950/30 px-4 py-2.5">
          <div className="flex items-center gap-3 text-sm font-semibold text-slate-100">
            <AlertTriangle className="h-4 w-4 text-amber-300" />
            Cảnh báo cần xem
          </div>
          <div className="text-right">
            <p className="font-bold text-amber-300">{numberFormat.format(conclusion.alerts)}</p>
            <p className="text-xs text-slate-500">{conclusion.alertRate}% tổng phản hồi</p>
          </div>
        </div>
      </div>

      {!['good', 'insufficient'].includes(conclusion.level) && (
        <div className={`mt-4 flex items-start gap-3 rounded-xl border p-3 ${tone.soft}`}>
          <SmilePlus className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
          <p className="text-xs leading-5 text-slate-300">
            Gợi ý tối ưu: ưu tiên kiểm tra các cụm phàn nàn xuất hiện nhiều lần, sau đó mới kết luận chất lượng tổng thể.
          </p>
        </div>
      )}
    </section>
  );
}
