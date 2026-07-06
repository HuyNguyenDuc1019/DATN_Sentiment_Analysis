import { Download, RefreshCw, RotateCcw, Save, Upload } from 'lucide-react';

export default function AdminSettingsHeader({
  isDirty,
  isSaving,
  onImportClick,
  onExportConfig,
  onResetDefaults,
  onSubmit,
}) {
  return (
    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-wide text-white flex items-center gap-3">
          Cài đặt Hệ thống
          <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 text-xs border border-indigo-500/30">
            MLOps
          </span>
        </h1>
        <p className="text-sm text-slate-400">Quản lý cấu hình AI, bảo mật dữ liệu và từ điển phân tích đa ngành.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full xl:w-auto">
        <div className="flex items-center gap-2 mr-0 sm:mr-2 border-r border-slate-700/50 pr-0 sm:pr-4">
          <button
            onClick={onImportClick}
            type="button"
            className="flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-medium rounded-lg text-sm transition-all border border-slate-700"
            title="Nhập cấu hình từ file JSON"
          >
            <Upload size={16} />
            <span className="hidden sm:inline">Nhập file</span>
          </button>

          <button
            onClick={onExportConfig}
            type="button"
            className="flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-medium rounded-lg text-sm transition-all border border-slate-700"
            title="Xuất cấu hình hiện tại ra file JSON"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Xuất file</span>
          </button>
        </div>

        <button
          onClick={onResetDefaults}
          type="button"
          className="flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg text-sm transition-all border border-slate-700"
          title="Khôi phục mặc định gốc"
        >
          <RotateCcw size={16} />
        </button>

        <button
          onClick={onSubmit}
          disabled={!isDirty || isSaving}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 font-medium rounded-lg text-sm transition-all duration-300 ${
            isDirty
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 ring-2 ring-indigo-500/50 ring-offset-2 ring-offset-slate-950'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
          }`}
        >
          {isSaving ? (
            <>
              <RefreshCw size={16} className="animate-spin" /> Đang lưu...
            </>
          ) : (
            <>
              <Save size={16} />
              {isDirty ? 'Lưu thay đổi' : 'Đã đồng bộ'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
