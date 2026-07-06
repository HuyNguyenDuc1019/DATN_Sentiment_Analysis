import { Ban, Crown, FileText, Loader2, MessageSquare, Unlock } from 'lucide-react';

import StatusBadge from './StatusBadge';
import TierBadge from './TierBadge';
import { formatDate } from '../../../utils/admin/usersUtils';

export default function AdminUserRow({
  user,
  activity,
  processingId,
  onSelectUser,
  onOpenBanConfirm,
  onUserAction,
}) {
  return (
    <tr
      key={user.id}
      onClick={() => onSelectUser(user)}
      className="hover:bg-slate-800/30 transition-colors group cursor-pointer"
    >
      <td className="px-5 py-4">
        <div className="flex flex-col">
          <span className="text-sm text-slate-300 font-medium">
            {user.email || user.full_name || 'Chưa có email'}
          </span>
          <span className="text-xs text-slate-500 mt-0.5 font-mono" title={user.id}>
            ID: {String(user.id || '').substring(0, 8)}...
          </span>
        </div>
      </td>

      <td className="px-5 py-4">
        <span className="text-sm text-slate-400 capitalize">{user.role || 'user'}</span>
      </td>

      <td className="px-5 py-4">
        <StatusBadge status={user.status} />
      </td>

      <td className="px-5 py-4">
        <TierBadge tier={user.tier} />
      </td>

      <td className="px-5 py-4">
        <div className="flex flex-col gap-1 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1">
            <FileText className="h-3.5 w-3.5 text-indigo-400" />
            Review: <span className="font-semibold text-slate-200">{activity.review_count || 0}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="h-3.5 w-3.5 text-emerald-400" />
            Feedback: <span className="font-semibold text-slate-200">{activity.feedback_count || 0}</span>
          </span>
          <span className="text-[11px] text-slate-500">
            Lần cuối: {formatDate(activity.last_activity_at)}
          </span>
        </div>
      </td>

      <td className="px-5 py-4 text-sm text-slate-400">
        {formatDate(user.created_at)}
      </td>

      <td className="px-5 py-4 text-right">
        <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
          {user.status !== 'blocked' ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onOpenBanConfirm(user);
              }}
              disabled={processingId === user.id || user.role === 'admin'}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={user.role === 'admin' ? 'Không thể khóa Admin' : 'Khóa tài khoản'}
            >
              {processingId === user.id ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Ban size={18} />
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onUserAction(user, 'unban');
              }}
              disabled={processingId === user.id}
              className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Mở khóa tài khoản"
            >
              {processingId === user.id ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Unlock size={18} />
              )}
            </button>
          )}

          {String(user.tier || '').toLowerCase() !== 'vip' ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onUserAction(user, 'upgrade_vip');
              }}
              disabled={processingId === user.id || user.status === 'blocked'}
              className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Nâng cấp lên VIP"
            >
              {processingId === user.id ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Crown size={18} />
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onUserAction(user, 'downgrade_vip');
              }}
              disabled={processingId === user.id}
              className="p-1.5 text-indigo-400 hover:text-slate-400 hover:bg-slate-500/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Hạ xuống gói Free"
            >
              {processingId === user.id ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Crown size={18} fill="currentColor" />
              )}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
