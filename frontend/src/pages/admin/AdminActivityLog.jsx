import { useEffect, useState } from 'react';
import { Clock3, MessageSquare, RefreshCcw, UserPlus } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';

const API_BASE = 'http://localhost:8000';
const LIST_MAX_HEIGHT = 'max-h-[420px]'; // chiều cao tối đa vùng danh sách trước khi hiện thanh cuộn

const activityIconMap = {
  feedback: MessageSquare,
  user: UserPlus,
  review: RefreshCcw,
};

const formatTime = (value) => {
  if (!value) return 'Vừa xong';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Vừa xong';
  }

  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });
};

const AdminActivityLog = () => {
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadActivities = async () => {
      try {
        setIsLoading(true);

        const { data } = await supabase.auth.getUser();
        const adminId = data?.user?.id;

        if (!adminId) {
          if (isMounted) setActivities([]);
          return;
        }

        const response = await fetch(
          `${API_BASE}/api/admin/activity-logs?admin_id=${adminId}&limit=8`
        );

        if (!response.ok) {
          throw new Error('Không thể tải nhật ký hoạt động.');
        }

        const result = await response.json();

        if (isMounted) {
          setActivities(Array.isArray(result.activities) ? result.activities : []);
        }
      } catch {
        if (isMounted) {
          setActivities([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadActivities();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="rounded-2xl border border-slate-700/80 bg-slate-900/70 p-6 shadow-xl shadow-black/10">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">Hoạt động gần đây</h2>
          <p className="mt-1 text-sm text-slate-400">
            Theo dõi các thay đổi mới nhất trong hệ thống.
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300">
          <Clock3 className="h-5 w-5" />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-20 animate-pulse rounded-xl border border-slate-800 bg-slate-800/60"
            />
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-8 text-center">
          <p className="font-semibold text-slate-200">Chưa có hoạt động mới</p>
          <p className="mt-2 text-sm text-slate-500">
            Các thao tác quản trị và kết quả xử lý sẽ hiển thị tại đây.
          </p>
        </div>
      ) : (
        <div
          className={`${LIST_MAX_HEIGHT} space-y-3 overflow-y-auto pr-2
            [scrollbar-width:thin] [scrollbar-color:theme(colors.slate.600)_transparent]
            [&::-webkit-scrollbar]:w-1.5
            [&::-webkit-scrollbar-track]:bg-transparent
            [&::-webkit-scrollbar-thumb]:rounded-full
            [&::-webkit-scrollbar-thumb]:bg-slate-600
            hover:[&::-webkit-scrollbar-thumb]:bg-slate-500`}
        >
          {activities.map((item) => {
            const Icon = activityIconMap[item.type] || Clock3;

            return (
              <div
                key={item.id}
                className="flex gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4"
              >
                <div className="mt-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-300">
                  <Icon className="h-4 w-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-white">
                      {item.title}
                    </h3>
                    <span className="text-xs text-slate-500">
                      {formatTime(item.created_at)}
                    </span>
                  </div>

                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default AdminActivityLog;