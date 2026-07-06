import { Save } from 'lucide-react';

export default function SaveSettingsBar({ isSaving, disabled, onSave }) {
  return (
    <div className="mt-8 pt-6 border-t border-slate-700/50 flex justify-end">
      <button
        type="button"
        onClick={onSave}
        disabled={isSaving || disabled}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium py-2.5 px-6 rounded-xl transition-colors shadow-lg"
      >
        <Save className="w-4 h-4" />
        {isSaving ? 'Đang lưu...' : 'Lưu cấu hình'}
      </button>
    </div>
  );
}
