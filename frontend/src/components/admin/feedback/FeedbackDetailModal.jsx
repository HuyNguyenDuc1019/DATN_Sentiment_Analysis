import { CheckCircle2, Edit3, History, RefreshCw, X, XCircle } from 'lucide-react';

import ConfidenceDisplay from './ConfidenceDisplay';
import FeedbackLabelBadge from './FeedbackLabelBadge';
import FeedbackStatusBadge from './FeedbackStatusBadge';
import { formatDate } from '../../../utils/admin/feedbackUtils';

export default function FeedbackDetailModal({
  modalItem,
  modalLoading,
  modalReason,
  modalNewLabel,
  modalSubmittingAction,
  onClose,
  onReasonChange,
  onNewLabelChange,
  onSubmitAction,
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-800 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div>
            <h2 className="text-lg font-semibold text-white">Chi tiết phản hồi</h2>
            <p className="text-xs text-slate-500">Mã: {modalItem.id}</p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Nội dung gốc</h3>
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4 text-sm text-slate-200 whitespace-pre-wrap">
              {modalItem.original_content}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Nhãn hệ thống + Độ tin cậy</h3>
              <div className="flex items-center gap-3">
                <FeedbackLabelBadge value={modalItem.old_ai_label} />
                <ConfidenceDisplay item={modalItem} />
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Trạng thái hiện tại</h3>
              <FeedbackStatusBadge status={modalItem.status} />
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Nhãn hiện tại của Admin</h3>
            <div className="flex items-center gap-3">
              <select
                value={modalNewLabel}
                onChange={(event) => onNewLabelChange(event.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500"
              >
                <option value="1">Tích cực (1)</option>
                <option value="0">Tiêu cực (0)</option>
              </select>

              {Number(modalNewLabel) !== modalItem.corrected_label && (
                <span className="text-xs text-amber-400">
                  Nhãn sẽ thay đổi so với hiện tại: <FeedbackLabelBadge value={modalItem.corrected_label} />
                </span>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Lý do chỉnh sửa / từ chối <span className="text-rose-400">(bắt buộc khi Từ chối hoặc Sửa nhãn)</span>
            </h3>
            <textarea
              value={modalReason}
              onChange={(event) => onReasonChange(event.target.value)}
              rows={3}
              placeholder="Ví dụ: Câu mơ hồ, cần xem thêm ngữ cảnh..."
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <ModalActionButton
              action="approve"
              currentAction={modalSubmittingAction}
              onClick={() => onSubmitAction('approve')}
              className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
              icon={<CheckCircle2 size={16} />}
              loadingIcon={<RefreshCw size={16} className="animate-spin" />}
            >
              Duyệt
            </ModalActionButton>

            <ModalActionButton
              action="reject"
              currentAction={modalSubmittingAction}
              onClick={() => onSubmitAction('reject')}
              className="bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20"
              icon={<XCircle size={16} />}
              loadingIcon={<RefreshCw size={16} className="animate-spin" />}
            >
              Từ chối
            </ModalActionButton>

            <ModalActionButton
              action="edit_label"
              currentAction={modalSubmittingAction}
              disabled={Number(modalNewLabel) === modalItem.corrected_label}
              onClick={() => onSubmitAction('edit_label')}
              className="bg-indigo-500/10 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20"
              icon={<Edit3 size={16} />}
              loadingIcon={<RefreshCw size={16} className="animate-spin" />}
            >
              Lưu nhãn mới
            </ModalActionButton>
          </div>

          <div>
            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              <History size={14} /> Lịch sử chỉnh sửa
            </h3>

            {modalLoading ? (
              <p className="text-xs text-slate-500">Đang tải lịch sử...</p>
            ) : (modalItem.review_history || []).length === 0 ? (
              <p className="text-xs text-slate-500">Chưa có lịch sử xử lý nào cho phản hồi này.</p>
            ) : (
              <div className="space-y-2">
                {modalItem.review_history.slice().reverse().map((entry, index) => (
                  <div key={index} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-400">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-300">{entry.action}</span>
                      <span>{formatDate(entry.timestamp)}</span>
                    </div>
                    {entry.reason && <p className="mt-1 text-slate-500">Lý do: {entry.reason}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ModalActionButton({
  action,
  currentAction,
  disabled = false,
  onClick,
  className,
  icon,
  loadingIcon,
  children,
}) {
  return (
    <button
      onClick={onClick}
      disabled={!!currentAction || disabled}
      className={`flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${className}`}
    >
      {currentAction === action ? loadingIcon : icon}
      {children}
    </button>
  );
}
