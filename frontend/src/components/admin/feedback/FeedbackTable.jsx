import { CheckCircle2, Eye, RefreshCw, XCircle } from 'lucide-react';

import ConfidenceDisplay from './ConfidenceDisplay';
import FeedbackLabelBadge from './FeedbackLabelBadge';
import FeedbackStatusBadge from './FeedbackStatusBadge';
import MismatchBadge from './MismatchBadge';
import { formatDate, isFeedbackMismatch } from '../../../utils/admin/feedbackUtils';

export default function FeedbackTable({
  isLoading,
  filteredItems,
  paginatedItems,
  profiles,
  updatingId,
  selectedIds,
  isAllFilteredSelected,
  onToggleSelectAll,
  onToggleSelectOne,
  onOpenDetailModal,
  onReview,
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1280px] text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-700/50 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <th className="px-4 py-4 w-10">
              <input
                type="checkbox"
                checked={isAllFilteredSelected}
                onChange={onToggleSelectAll}
                className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-900 accent-indigo-500 cursor-pointer"
              />
            </th>
            <th className="px-5 py-4 w-[28%]">Nội dung gốc</th>
            <th className="px-5 py-4 min-w-[130px]">Nhãn hệ thống</th>
            <th className="px-5 py-4">Độ tin cậy</th>
            <th className="px-5 py-4 min-w-[150px]">Nhãn người dùng sửa</th>
            <th className="px-5 py-4">Sai khác</th>
            <th className="px-5 py-4">Người gửi</th>
            <th className="px-5 py-4">Ngày gửi</th>
            <th className="px-5 py-4">Trạng thái</th>
            <th className="px-5 py-4 text-right">Hành động</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-700/50">
          {isLoading ? (
            Array(5).fill(0).map((_, index) => <FeedbackTableSkeletonRow key={index} />)
          ) : filteredItems.length === 0 ? (
            <tr>
              <td colSpan="10" className="px-5 py-12 text-center text-slate-500 text-sm">
                Không có phản hồi nào phù hợp.
              </td>
            </tr>
          ) : (
            paginatedItems.map((item) => {
              const profile = profiles[item.user_id] || {};
              const disabled = updatingId === item.id;

              return (
                <tr
                  key={item.id}
                  className="hover:bg-slate-800/30 transition-colors group cursor-pointer"
                  onClick={() => onOpenDetailModal(item)}
                >
                  <td className="px-4 py-4" onClick={(event) => event.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.id)}
                      onChange={() => onToggleSelectOne(item.id)}
                      className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-900 accent-indigo-500 cursor-pointer"
                    />
                  </td>

                  <td className="px-5 py-4 text-sm text-slate-300">
                    <p
                      className="max-w-[520px] overflow-hidden text-ellipsis text-sm leading-6 text-slate-300"
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                      title={item.original_content || ''}
                    >
                      {item.original_content || '—'}
                    </p>
                  </td>

                  <td className="px-5 py-4 min-w-[130px]">
                    <FeedbackLabelBadge value={item.old_ai_label} />
                  </td>

                  <td className="px-5 py-4">
                    <ConfidenceDisplay item={item} />
                  </td>

                  <td className="px-5 py-4 min-w-[150px]">
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      {isFeedbackMismatch(item) && (
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500" title="Người dùng đã sửa nhãn" />
                      )}
                      <FeedbackLabelBadge value={item.corrected_label} />
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <MismatchBadge item={item} />
                  </td>

                  <td className="px-5 py-4 text-sm">
                    <p className="text-slate-200 font-medium truncate max-w-[160px]">{profile.full_name || 'Người dùng'}</p>
                    <p className="text-xs text-slate-500 truncate max-w-[160px]">{profile.email || item.user_id || 'Không rõ'}</p>
                  </td>

                  <td className="px-5 py-4 text-xs text-slate-400 whitespace-nowrap">{formatDate(item.created_at)}</td>

                  <td className="px-5 py-4 min-w-[110px]">
                    <FeedbackStatusBadge status={item.status} />
                  </td>

                  <td className="px-5 py-4 text-right" onClick={(event) => event.stopPropagation()}>
                    <div className="flex justify-end items-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onOpenDetailModal(item)}
                        className="flex items-center justify-center w-8 h-8 rounded text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                        title="Xem chi tiết"
                      >
                        <Eye size={18} />
                      </button>

                      <button
                        onClick={() => onReview(item, 'approve')}
                        disabled={disabled}
                        className="flex items-center justify-center w-8 h-8 rounded text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Duyệt"
                      >
                        {disabled ? <RefreshCw size={18} className="animate-spin" /> : <CheckCircle2 size={20} />}
                      </button>

                      <button
                        onClick={() => onReview(item, 'reject')}
                        disabled={disabled}
                        className="flex items-center justify-center w-8 h-8 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Từ chối"
                      >
                        {disabled ? <RefreshCw size={18} className="animate-spin" /> : <XCircle size={20} />}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function FeedbackTableSkeletonRow() {
  return (
    <tr>
      <td className="px-4 py-4"><div className="w-3.5 h-3.5 bg-slate-700/50 rounded animate-pulse" /></td>
      <td className="px-5 py-4">
        <div className="w-3/4 h-4 bg-slate-700/50 rounded animate-pulse mb-2" />
        <div className="w-1/2 h-4 bg-slate-700/50 rounded animate-pulse" />
      </td>
      <td className="px-5 py-4"><div className="w-20 h-6 bg-slate-700/50 rounded-full animate-pulse" /></td>
      <td className="px-5 py-4"><div className="w-20 h-4 bg-slate-700/50 rounded animate-pulse" /></td>
      <td className="px-5 py-4"><div className="w-20 h-6 bg-slate-700/50 rounded-full animate-pulse" /></td>
      <td className="px-5 py-4"><div className="w-12 h-4 bg-slate-700/50 rounded animate-pulse" /></td>
      <td className="px-5 py-4"><div className="w-24 h-4 bg-slate-700/50 rounded animate-pulse" /></td>
      <td className="px-5 py-4"><div className="w-20 h-4 bg-slate-700/50 rounded animate-pulse" /></td>
      <td className="px-5 py-4"><div className="w-16 h-6 bg-slate-700/50 rounded-full animate-pulse" /></td>
      <td className="px-5 py-4 text-right">
        <div className="flex justify-end gap-2">
          <div className="w-8 h-8 bg-slate-700/50 rounded animate-pulse" />
          <div className="w-8 h-8 bg-slate-700/50 rounded animate-pulse" />
        </div>
      </td>
    </tr>
  );
}
