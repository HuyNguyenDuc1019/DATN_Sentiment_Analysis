import { Sliders } from 'lucide-react';

import PreferenceToggle from './PreferenceToggle';

export default function PreferencesCard({ preferences, onToggle }) {
  return (
    <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl p-6 flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <Sliders className="w-5 h-5 text-slate-300" />
        <h2 className="text-lg font-medium text-white">Tùy chọn hiển thị</h2>
      </div>

      <div className="space-y-4">
        <PreferenceToggle
          title="Chế độ giao diện"
          description={preferences.darkMode ? 'Đang dùng chế độ tối' : 'Đang dùng chế độ sáng'}
          active={preferences.darkMode}
          onClick={() => onToggle('darkMode')}
        />

        <PreferenceToggle
          title="Email tóm tắt"
          description="Nhận báo cáo hàng tuần"
          active={preferences.weeklyEmail}
          onClick={() => onToggle('weeklyEmail')}
        />
      </div>
    </div>
  );
}
