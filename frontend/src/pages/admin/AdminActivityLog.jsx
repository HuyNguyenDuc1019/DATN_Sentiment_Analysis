import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock3,
  Crown,
  Download,
  LogIn,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import Pagination from '../../components/ui/Pagination';

const FETCH_LIMIT = 200; // lấy đủ nhiều để gộp + phân trang phía client
const PAGE_SIZE = 10;
// Chỉ gộp các hành động của CÙNG 1 admin, CÙNG loại, cách nhau không quá
// khoảng thời gian này -> tránh gộp nhầm 2 đợt duyệt cách xa nhau thành 1.
const GROUP_WINDOW_MINUTES = 10;

// Mô tả hiển thị cho từng loại hành động: icon, tông màu, và cách diễn đạt
// khi có NHIỀU hành động cùng loại liên tiếp (số nhiều).
const ACTION_META = {
  feedback_approved: {
    icon: CheckCircle2,
    tone: 'text-emerald-300 bg-emerald-500/10',
    title: 'Phản hồi được duyệt',
    pluralText: (count) => `duyệt ${count} phản hồi liên tiếp`,
  },
  feedback_rejected: {
    icon: XCircle,
    tone: 'text-rose-300 bg-rose-500/10',
    title: 'Phản hồi bị từ chối',
    pluralText: (count) => `từ chối ${count} phản hồi liên tiếp`,
  },
  user_banned: {
    icon: ShieldAlert,
    tone: 'text-rose-300 bg-rose-500/10',
    title: 'Tài khoản bị khóa',
    pluralText: (count) => `khóa ${count} tài khoản liên tiếp`,
  },
  user_unbanned: {
    icon: ShieldCheck,
    tone: 'text-emerald-300 bg-emerald-500/10',
    title: 'Tài khoản được mở khóa',
    pluralText: (count) => `mở khóa ${count} tài khoản liên tiếp`,
  },
  user_upgraded_vip: {
    icon: Crown,
    tone: 'text-indigo-300 bg-indigo-500/10',
    title: 'Nâng cấp VIP',
    pluralText: (count) => `nâng cấp ${count} tài khoản lên VIP liên tiếp`,
  },
  user_downgraded_vip: {
    icon: Crown,
    tone: 'text-slate-300 bg-slate-500/10',
    title: 'Hạ gói dịch vụ',
    pluralText: (count) => `hạ ${count} tài khoản xuống Free liên tiếp`,
  },
  dataset_exported: {
    icon: Download,
    tone: 'text-indigo-300 bg-indigo-500/10',
    title: 'Xuất Dataset',
    pluralText: (count) => `xuất ${count} bản dataset CSV liên tiếp`,
  },
  admin_login: {
    icon: LogIn,
    tone: 'text-sky-300 bg-sky-500/10',
    title: 'Admin đăng nhập',
    pluralText: (count) => `đăng nhập ${count} lần liên tiếp`,
  },
};

const DEFAULT_META = {
  icon: Clock3,
  tone: 'text-indigo-300 bg-indigo-500/10',
  title: 'Hoạt động quản trị',
  pluralText: (count) => `thực hiện ${count} thao tác liên tiếp`,
};

function formatTime(value) {
  if (!value) return 'Vừa xong';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Vừa xong';

  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });
}

/**
 * Gộp các dòng log LIÊN TIẾP có cùng admin + cùng action_type + cách nhau
 * không quá GROUP_WINDOW_MINUTES thành 1 dòng hiển thị kèm số lượng.
 * Ví dụ: admin Huy duyệt liền 5 phản hồi trong vài phút
 *   -> hiển thị "Nguyễn Đức Huy vừa duyệt 5 phản hồi liên tiếp"
 * thay vì lặp lại 5 dòng riêng biệt.
 */
function groupConsecutiveLogs(logs) {
  const grouped = [];

  for (const log of logs) {
    const last = grouped[grouped.length - 1];
    const sameActor = last && last.admin_id === log.admin_id && last.action_type === log.action_type;

    const withinWindow =
      sameActor &&
      Math.abs(new Date(last.created_at) - new Date(log.created_at)) <= GROUP_WINDOW_MINUTES * 60 * 1000;

    if (sameActor && withinWindow) {
      last.count += 1;
      if (new Date(log.created_at) > new Date(last.created_at)) {
        last.created_at = log.created_at;
      }
    } else {
      grouped.push({ ...log, count: 1 });
    }
  }

  return grouped;
}

const AdminActivityLog = () => {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasNewActivity, setHasNewActivity] = useState(false);

  const loadLogs = async () => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('admin_activity_logs')
        .select('id, admin_id, admin_name, action_type, target_type, description, created_at')
        .order('created_at', { ascending: false })
        .limit(FETCH_LIMIT);

      if (error) throw error;

      setLogs(data || []);
      setHasNewActivity(false);
    } catch (error) {
      console.error('Không thể tải nhật ký hoạt động:', error);
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  // ====== Real-time: tự động nhận log mới ngay khi có admin khác (hoặc
  // chính mình ở tab khác) vừa thực hiện thao tác, không cần bấm refresh. ======
  useEffect(() => {
    const channel = supabase
      .channel('admin_activity_logs_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'admin_activity_logs' },
        (payload) => {
          setLogs((current) => {
            if (current.some((log) => log.id === payload.new.id)) return current;
            return [payload.new, ...current].slice(0, FETCH_LIMIT);
          });

          // Nếu người dùng đang xem trang sau (không phải trang 1), chỉ báo
          // hiệu có hoạt động mới thay vì tự đảo trang, tránh giật giao diện.
          setPage((currentPage) => {
            if (currentPage !== 1) setHasNewActivity(true);
            return currentPage;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [logs.length]);

  const groupedLogs = useMemo(() => groupConsecutiveLogs(logs), [logs]);

  const totalPages = Math.max(1, Math.ceil(groupedLogs.length / PAGE_SIZE));

  const pageLogs = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return groupedLogs.slice(start, start + PAGE_SIZE);
  }, [groupedLogs, page]);

  return (
    <section className="rounded-2xl border border-slate-700/80 bg-slate-900/70 p-6 shadow-xl shadow-black/10">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-white">
            Hoạt động gần đây
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              Trực tiếp
            </span>
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Nhật ký các thao tác quản trị, cập nhật theo thời gian thực.
          </p>
        </div>

        <button
          type="button"
          onClick={loadLogs}
          disabled={isLoading}
          title="Làm mới"
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300 transition-colors hover:bg-indigo-500/20"
        >
          <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {hasNewActivity && (
        <button
          type="button"
          onClick={() => {
            setPage(1);
            setHasNewActivity(false);
          }}
          className="mb-3 w-full rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-4 py-2 text-xs font-bold text-indigo-300 transition-colors hover:bg-indigo-500/20"
        >
          Có hoạt động mới · Bấm để xem
        </button>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-20 animate-pulse rounded-xl border border-slate-800 bg-slate-800/60"
            />
          ))}
        </div>
      ) : groupedLogs.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-8 text-center">
          <p className="font-semibold text-slate-200">Chưa có hoạt động nào</p>
          <p className="mt-2 text-sm text-slate-500">
            Các thao tác duyệt phản hồi, khóa tài khoản, nâng cấp VIP... sẽ hiển thị tại đây.
          </p>
        </div>
      ) : (
        <>
          <div
            className="activity-log-scroll space-y-3 overflow-y-auto pr-2"
            style={{ maxHeight: '420px' }}
          >
            {pageLogs.map((log) => {
              const meta = ACTION_META[log.action_type] || DEFAULT_META;
              const Icon = meta.icon;
              const adminName = log.admin_name || 'Quản trị viên';
              const actionText = log.count > 1 ? meta.pluralText(log.count) : log.description;

              return (
                <div
                  key={log.id}
                  className="flex gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4"
                >
                  <div className={`mt-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${meta.tone}`}>
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-white">
                        {meta.title}
                        {log.count > 1 && (
                          <span
                            className="ml-2 inline-flex items-center rounded-full bg-indigo-500/15 px-2 py-0.5 text-xs font-bold text-indigo-300"
                            title={`Gộp ${log.count} hành động liên tiếp`}
                          >
                            ×{log.count}
                          </span>
                        )}
                      </h3>
                      <span className="text-xs text-slate-500">
                        {formatTime(log.created_at)}
                      </span>
                    </div>

                    <p className="mt-1 text-sm leading-6 text-slate-400">
                      <span className="font-medium text-slate-300">{adminName}</span> vừa {actionText}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              className="mt-4 border-t border-slate-800 pt-4"
            />
          )}
        </>
      )}

      <style>{`
        .activity-log-scroll {
          scrollbar-width: thin;
          scrollbar-color: #475569 transparent;
        }
        .activity-log-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .activity-log-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .activity-log-scroll::-webkit-scrollbar-thumb {
          background-color: #475569;
          border-radius: 9999px;
        }
        .activity-log-scroll::-webkit-scrollbar-thumb:hover {
          background-color: #64748b;
        }
      `}</style>
    </section>
  );
};

export default AdminActivityLog;