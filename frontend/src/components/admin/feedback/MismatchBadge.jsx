import { AlertTriangle } from 'lucide-react';

import { isFeedbackMismatch } from '../../../utils/admin/feedbackUtils';

export default function MismatchBadge({ item }) {
  if (isFeedbackMismatch(item)) {
    return (
      <span title="Nhãn hệ thống khác nhãn đã sửa" className="inline-flex items-center gap-1 text-amber-400 text-xs">
        <AlertTriangle size={14} />
        <span>Khác</span>
      </span>
    );
  }

  return <span className="text-xs text-slate-600">Trùng</span>;
}
