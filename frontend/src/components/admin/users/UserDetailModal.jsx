import { BadgeCheck, CalendarDays, History, Mail, Shield, Users, X } from 'lucide-react';

import StatusBadge from './StatusBadge';

export default function UserDetailModal({
  selectedUser,
  userHistory,
  isHistoryLoading,
  onClose,
  formatDate,
  getHistoryTitle,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-700 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-white">Chi tiết người dùng</h2>
            <p className="mt-1 text-sm text-slate-400">
              {selectedUser.email || 'Không có email'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
            <UserInfoBox
              icon={<Mail className="h-4 w-4" />}
              label="Email"
            >
              <p className="break-all text-sm font-medium text-slate-200">
                {selectedUser.email || '—'}
              </p>
            </UserInfoBox>

            <UserInfoBox
              icon={<Users className="h-4 w-4" />}
              label="ID tài khoản"
            >
              <p className="break-all font-mono text-xs text-slate-300">
                {selectedUser.id || '—'}
              </p>
            </UserInfoBox>

            <UserInfoBox
              icon={<Shield className="h-4 w-4" />}
              label="Vai trò"
            >
              <span className="inline-flex rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-bold text-indigo-300">
                {selectedUser.role === 'admin' ? 'Admin' : 'User'}
              </span>
            </UserInfoBox>

            <UserInfoBox
              icon={<BadgeCheck className="h-4 w-4" />}
              label="Trạng thái"
            >
              <StatusBadge status={selectedUser.status} />
            </UserInfoBox>

            <UserInfoBox
              icon={<CalendarDays className="h-4 w-4" />}
              label="Ngày tạo"
            >
              <p className="text-sm text-slate-300">
                {formatDate(selectedUser.created_at)}
              </p>
            </UserInfoBox>
          </div>

          <div className="border-t border-slate-700 px-6 py-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-300">
              <History className="h-4 w-4 text-indigo-400" />
              Lịch sử thao tác user
            </h3>

            {isHistoryLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-16 animate-pulse rounded-xl border border-slate-800 bg-slate-950/50" />
                ))}
              </div>
            ) : userHistory.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-5 text-center text-sm text-slate-500">
                Chưa có lịch sử thao tác quản trị cho tài khoản này.
              </div>
            ) : (
              <div className="space-y-3">
                {userHistory.map((log) => (
                  <div key={log.id} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-200">
                        {getHistoryTitle(log.action_type)}
                      </p>
                      <span className="text-xs text-slate-500">
                        {formatDate(log.created_at)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-slate-400">
                      <span className="font-medium text-slate-300">{log.admin_name || 'Admin'}</span> vừa {log.description || 'thực hiện thao tác'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-700 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-700"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

function UserInfoBox({ icon, label, children }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
        {icon}
        {label}
      </div>
      {children}
    </div>
  );
}
