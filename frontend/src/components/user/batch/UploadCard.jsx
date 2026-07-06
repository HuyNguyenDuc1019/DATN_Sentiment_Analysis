import { CloudUpload, FileText, ShieldCheck } from 'lucide-react';

export default function UploadCard({ file, count, inputRef, onFile, isVip }) {
  return (
    <div
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        onFile(event.dataTransfer.files?.[0]);
      }}
      className="group relative overflow-hidden rounded-3xl border border-dashed border-slate-600 bg-slate-800/40 p-6 text-center shadow-2xl shadow-slate-950/20 backdrop-blur-md transition-all hover:border-indigo-400/80 hover:bg-slate-800/55"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.18),transparent_38%)] opacity-70" />

      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        hidden
        onChange={(event) => onFile(event.target.files?.[0])}
      />

      <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-indigo-500/25 bg-indigo-500/10 shadow-lg shadow-indigo-950/30">
        {file ? <FileText className="h-8 w-8 text-indigo-300" /> : <CloudUpload className="h-8 w-8 text-indigo-300" />}
      </div>

      <h3 className="relative mx-auto max-w-[280px] truncate text-lg font-bold text-white" title={file?.name || ''}>
        {file ? file.name : 'Kéo thả hoặc chọn file CSV'}
      </h3>

      <p className="relative mt-2 text-sm leading-6 text-slate-400">
        {file
          ? `${count.toLocaleString('vi-VN')} phản hồi đã đọc từ file.`
          : 'Hệ thống sẽ đọc file và cho bạn chọn cột chứa bình luận.'}
      </p>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-950/25 transition hover:bg-indigo-500"
      >
        <CloudUpload className="h-4 w-4" />
        {file ? 'Đổi file khác' : 'Chọn tệp'}
      </button>

      <div className="relative mt-5 rounded-2xl border border-slate-700/70 bg-slate-950/25 px-4 py-3 text-left">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <p className="text-xs leading-5 text-slate-400">
            {isVip
              ? 'Tài khoản VIP có thể xử lý nhiều dữ liệu hơn và lưu lịch sử phân tích.'
              : 'Gói Free hỗ trợ tối đa 5MB và 50 bình luận/lần. Nâng cấp VIP để mở giới hạn cao hơn.'}
          </p>
        </div>
      </div>
    </div>
  );
}
