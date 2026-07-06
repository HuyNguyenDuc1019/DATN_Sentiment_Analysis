import { HardDrive } from 'lucide-react';

export default function DataLimitCard({ settings, onChange }) {
  return (
    <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl overflow-hidden flex flex-col">
      <div className="px-6 py-4 border-b border-slate-700/50 bg-slate-800/50 flex items-center gap-3">
        <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
          <HardDrive size={20} />
        </div>
        <h2 className="text-base font-semibold text-slate-200">Quản lý Tài nguyên (Data Limit)</h2>
      </div>

      <div className="p-6 flex-1 space-y-6">
        <NumberSettingField
          id="max_upload_size_free"
          name="max_upload_size_free"
          label="Dung lượng file tối đa (MB)"
          description="Giới hạn dung lượng upload cho tài khoản gói Free để bảo vệ máy chủ."
          value={settings.max_upload_size_free}
          onChange={onChange}
          suffix="MB"
        />

        <div className="pt-6 border-t border-slate-700/50">
          <NumberSettingField
            id="data_retention_days"
            name="data_retention_days"
            label="Thời gian lưu trữ dữ liệu (Data Retention)"
            description="Tự động xóa các phân tích cũ hơn số ngày này để tối ưu Database."
            value={settings.data_retention_days}
            onChange={onChange}
            suffix="NGÀY"
          />
        </div>
      </div>
    </div>
  );
}

function NumberSettingField({ id, name, label, description, value, onChange, suffix }) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-slate-300 block mb-2">
        {label}
      </label>
      <p className="text-xs text-slate-500 mb-4">{description}</p>
      <div className="relative">
        <input
          id={id}
          name={name}
          type="number"
          step="1"
          min="1"
          required
          value={value}
          onChange={onChange}
          className="w-full bg-slate-900 border border-slate-700 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-mono font-bold">
          {suffix}
        </div>
      </div>
    </div>
  );
}
