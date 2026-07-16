import React from 'react';
import { AlertTriangle, ThumbsUp, AlertOctagon, MessageCircle } from 'lucide-react';

export default function SentimentDictionaryCard({ settings, onChange }) {
  // Lấy dữ liệu mảng, nếu chưa có thì gán mảng rỗng
  const dangerKws = Array.isArray(settings.danger_keywords) ? settings.danger_keywords : [];
  const positiveKws = Array.isArray(settings.positive_keywords) ? settings.positive_keywords : [];
  const negativeSignalKws = Array.isArray(settings.negative_signal_keywords) ? settings.negative_signal_keywords : [];

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-6 shadow-xl lg:col-span-2">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
          <MessageCircle className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Từ Điển Cảm Xúc & Cảnh Báo</h2>
          <p className="text-sm text-slate-400">Thiết lập các từ khóa kích hoạt cảnh báo nguy hiểm hoặc đánh giá tốt/xấu.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Cột 1: Cảnh báo nguy hiểm */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-rose-400">
            <AlertOctagon className="h-4 w-4" />
            <label className="text-sm font-semibold">Cảnh Báo Khẩn (Danger)</label>
          </div>
          <p className="text-xs text-slate-500">Các từ liên quan đến ngộ độc, vệ sinh, thái độ. Mỗi từ 1 dòng.</p>
          <textarea
            className="w-full h-64 rounded-xl border border-slate-700 bg-slate-800/50 p-4 text-sm text-slate-200 placeholder-slate-600 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
            placeholder="tệ&#10;dở&#10;bẩn&#10;ngộ độc"
            value={dangerKws.join('\n')}
            onChange={(e) => onChange('danger_keywords', e.target.value)}
          />
        </div>

        {/* Cột 2: Tín hiệu tiêu cực */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            <label className="text-sm font-semibold">Tiêu Cực (Negative Signal)</label>
          </div>
          <p className="text-xs text-slate-500">Bao gồm Cảnh Báo Khẩn + các từ chê bai thông thường. Mỗi từ 1 dòng.</p>
          <textarea
            className="w-full h-64 rounded-xl border border-slate-700 bg-slate-800/50 p-4 text-sm text-slate-200 placeholder-slate-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            placeholder="không ngon&#10;chưa tốt&#10;hơi mắc"
            value={negativeSignalKws.join('\n')}
            onChange={(e) => onChange('negative_signal_keywords', e.target.value)}
          />
        </div>

        {/* Cột 3: Tín hiệu tích cực */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-emerald-400">
            <ThumbsUp className="h-4 w-4" />
            <label className="text-sm font-semibold">Tích Cực (Positive)</label>
          </div>
          <p className="text-xs text-slate-500">Các từ khóa khen ngợi dịch vụ, đồ ăn, không gian. Mỗi từ 1 dòng.</p>
          <textarea
            className="w-full h-64 rounded-xl border border-slate-700 bg-slate-800/50 p-4 text-sm text-slate-200 placeholder-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            placeholder="ngon&#10;tuyệt vời&#10;sạch sẽ&#10;đáng tiền"
            value={positiveKws.join('\n')}
            onChange={(e) => onChange('positive_keywords', e.target.value)}
          />
        </div>

      </div>
    </div>
  );
}