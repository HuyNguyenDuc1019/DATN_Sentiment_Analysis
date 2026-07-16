export default function NotificationsTab({
  alertEmail,
  setAlertEmail,
  weeklyReport,
  setWeeklyReport,
}) {
  return (
    <div className="flex-1 flex flex-col">
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-white">Cấu hình Thông báo</h2>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <div>
            <div className="text-sm font-medium text-white mb-1 flex items-center gap-2">
              Cảnh báo khủng hoảng tức thời
            </div>
          </div>
          <ToggleButton
            checked={alertEmail}
            onClick={() => setAlertEmail((prev) => !prev)}
          />
        </div>

        <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <div>
            <div className="text-sm font-medium text-white mb-1">Báo cáo tóm tắt hàng tuần</div>
          </div>
          <ToggleButton checked={weeklyReport} onClick={() => setWeeklyReport((prev) => !prev)} />
        </div>
      </div>
    </div>
  );
}

function ToggleButton({ checked, disabled = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-11 h-6 rounded-full flex items-center px-1 transition-colors relative focus:outline-none ${
        disabled
          ? 'bg-slate-700 opacity-50 cursor-not-allowed'
          : checked
            ? 'bg-indigo-500'
            : 'bg-slate-600'
      }`}
    >
      <div
        className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${
          checked && !disabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}
