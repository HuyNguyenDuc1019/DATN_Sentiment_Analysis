import { MessageSquareCheck } from 'lucide-react';

export default function FeedbackHeader() {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400">
        <MessageSquareCheck className="h-5 w-5" />
      </div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Duyệt phản hồi</h1>
        <p className="mt-1 text-sm text-slate-400">Mỗi bình luận chỉ cần một lựa chọn: xác nhận AI đúng hoặc đổi sang nhãn còn lại.</p>
      </div>
    </div>
  );
}
