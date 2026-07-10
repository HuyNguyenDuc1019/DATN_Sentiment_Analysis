import { CalendarClock, CheckCircle2, Crown, Sparkles } from 'lucide-react';

function formatDate(value) {
  if (!value) return 'Chưa có';

  try {
    return new Date(value).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return 'Không xác định';
  }
}

function getVipRemainingDays(vipExpiresAt) {
  if (!vipExpiresAt) return 0;

  const expires = new Date(vipExpiresAt).getTime();
  const now = Date.now();

  if (!Number.isFinite(expires)) return 0;

  const diff = expires - now;

  if (diff <= 0) return 0;

  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function BillingTab({
  isVip,
  vipStartedAt,
  vipExpiresAt,
  onUpgrade,
}) {
  const remainingDays = getVipRemainingDays(vipExpiresAt);
  const isExpired = isVip && remainingDays <= 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Gói tài khoản</h2>
        <p className="mt-2 text-sm text-slate-400">
          Quản lý trạng thái VIP và thời hạn sử dụng tài khoản.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-700 bg-slate-900/50 p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${
                isVip
                  ? 'border-amber-400/30 bg-amber-400/10 text-amber-300'
                  : 'border-slate-600 bg-slate-800 text-slate-400'
              }`}
            >
              <Crown className="h-6 w-6" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-bold text-white">
                  {isVip ? 'Gói Pro VIP' : 'Gói Free'}
                </h3>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    isVip
                      ? 'bg-amber-400/10 text-amber-300'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {isVip ? 'Đang kích hoạt' : 'Miễn phí'}
                </span>
              </div>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                {isVip
                  ? 'Bạn đang sử dụng tài khoản VIP với đầy đủ tính năng nâng cao.'
                  : 'Bạn đang dùng gói Free, một số tính năng nâng cao sẽ bị giới hạn.'}
              </p>
            </div>
          </div>

          {!isVip && (
            <button
              type="button"
              onClick={onUpgrade}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-500"
            >
              <Sparkles className="h-4 w-4" />
              Nâng cấp VIP
            </button>
          )}
        </div>
      </div>

      {isVip && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-5">
            <div className="mb-3 flex items-center gap-2 text-slate-400">
              <CalendarClock className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                Ngày kích hoạt
              </span>
            </div>

            <p className="text-lg font-bold text-white">
              {formatDate(vipStartedAt)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-5">
            <div className="mb-3 flex items-center gap-2 text-slate-400">
              <CalendarClock className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                Ngày hết hạn
              </span>
            </div>

            <p className="text-lg font-bold text-white">
              {formatDate(vipExpiresAt)}
            </p>
          </div>

          <div
            className={`rounded-2xl border p-5 ${
              isExpired
                ? 'border-rose-500/30 bg-rose-500/10'
                : 'border-emerald-500/30 bg-emerald-500/10'
            }`}
          >
            <div
              className={`mb-3 flex items-center gap-2 ${
                isExpired ? 'text-rose-300' : 'text-emerald-300'
              }`}
            >
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                Thời hạn còn lại
              </span>
            </div>

            <p
              className={`text-lg font-bold ${
                isExpired ? 'text-rose-200' : 'text-emerald-200'
              }`}
            >
              {isExpired ? 'Đã hết hạn' : `Còn ${remainingDays} ngày`}
            </p>
          </div>
        </div>
      )}

      {isVip && isExpired && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5">
          <p className="text-sm leading-6 text-rose-100">
            Gói VIP của bạn đã hết hạn. Hãy gia hạn để tiếp tục sử dụng các tính năng nâng cao.
          </p>

          <button
            type="button"
            onClick={onUpgrade}
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-rose-600/25 transition hover:bg-rose-500"
          >
            <Crown className="h-4 w-4" />
            Gia hạn VIP 30 ngày
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5">
        <h3 className="text-sm font-bold text-indigo-200">
          Quyền lợi VIP 30 ngày
        </h3>

        <ul className="mt-4 space-y-3 text-sm text-slate-300">
          <li>• Phân tích dữ liệu không giới hạn.</li>
          <li>• Xử lý file CSV lớn hơn.</li>
          <li>• Mở khóa phân tích Google Maps.</li>
          <li>• Mở khóa so sánh quán ăn.</li>
          <li>• Sử dụng cảnh báo và cấu hình nâng cao.</li>
        </ul>
      </div>
    </div>
  );
}