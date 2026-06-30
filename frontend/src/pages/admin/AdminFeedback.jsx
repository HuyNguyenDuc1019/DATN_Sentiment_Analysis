import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { CheckCircle2, Download, RefreshCcw, Search, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../services/supabaseClient';

const STATUS_LABEL = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Đã từ chối',
};

const STATUS_CLASS = {
  pending: 'border-amber-400/30 bg-amber-500/10 text-amber-300',
  approved: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300',
  rejected: 'border-rose-400/30 bg-rose-500/10 text-rose-300',
};

const fallbackTheme = {
  card: 'border-slate-700 bg-slate-900/80 shadow-slate-950/30',
  text: 'text-white',
  muted: 'text-slate-400',
  faint: 'text-slate-500',
  input: 'border-slate-700 bg-slate-950 text-white placeholder:text-slate-500 focus:border-indigo-500',
  tableHead: 'border-slate-800 bg-slate-950/70 text-slate-400',
  tableDivide: 'divide-slate-800',
  rowHover: 'hover:bg-slate-800/60',
  buttonGhost: 'border-slate-700 bg-slate-900 text-slate-200 hover:border-indigo-400 hover:text-white',
};

const normalizeStatus = (status) => status || 'pending';
const labelText = (value) => (Number(value) === 1 ? 'Hài lòng' : 'Chưa hài lòng');

function StatCard({ theme, label, value, tone = 'indigo' }) {
  const toneClass =
    tone === 'green'
      ? 'text-emerald-400'
      : tone === 'rose'
        ? 'text-rose-400'
        : 'text-indigo-400';

  return (
    <div className={`rounded-2xl border p-5 shadow-xl ${theme.card}`}>
      <p className={`text-xs font-black uppercase tracking-wider ${theme.muted}`}>{label}</p>
      <p className={`mt-3 text-4xl font-black ${toneClass}`}>{value}</p>
    </div>
  );
}

function Th({ theme, children, align = 'left' }) {
  const alignClass = align === 'right' ? 'text-right' : 'text-left';

  return (
    <th className={`px-5 py-4 ${alignClass} text-xs font-black uppercase tracking-wider ${theme.muted}`}>
      {children}
    </th>
  );
}

export default function AdminFeedback() {
  const { theme = fallbackTheme } = useOutletContext() || {};
  const [items, setItems] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadFeedback = useCallback(async () => {
    setLoading(true);

    const [feedbackResult, profileResult] = await Promise.all([
      supabase
        .from('feedback_data')
        .select('id, original_content, old_ai_label, corrected_label, created_at, user_id, status')
        .order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, email, full_name'),
    ]);

    if (feedbackResult.error) {
      toast.error('Không thể tải danh sách phản hồi từ máy chủ.', { id: 'admin-feedback-load-error' });
      setItems([]);
    } else {
      setItems(feedbackResult.data || []);
    }

    if (profileResult.error) {
      toast.error('Không thể tải danh sách người dùng từ máy chủ.', { id: 'admin-feedback-profile-error' });
      setProfiles({});
    } else {
      const mappedProfiles = {};
      (profileResult.data || []).forEach((profile) => {
        mappedProfiles[profile.id] = profile;
      });
      setProfiles(mappedProfiles);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadFeedback();
  }, [loadFeedback]);

  const stats = useMemo(() => {
    const pending = items.filter((item) => normalizeStatus(item.status) === 'pending').length;
    const approved = items.filter((item) => normalizeStatus(item.status) === 'approved').length;
    const rejected = items.filter((item) => normalizeStatus(item.status) === 'rejected').length;

    return { total: items.length, pending, approved, rejected };
  }, [items]);

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return items.filter((item) => {
      const profile = profiles[item.user_id] || {};
      const haystack = [item.original_content, profile.full_name, profile.email]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const matchSearch = normalizedSearch ? haystack.includes(normalizedSearch) : true;
      const matchStatus = statusFilter === 'all' ? true : normalizeStatus(item.status) === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [items, profiles, search, statusFilter]);

  const updateStatus = async (item, status) => {
    setUpdatingId(item.id);

    const { error } = await supabase.from('feedback_data').update({ status }).eq('id', item.id);

    if (error) {
      toast.error('Không thể cập nhật trạng thái phản hồi.', { id: `admin-feedback-update-${item.id}` });
    } else {
      setItems((current) =>
        current.map((feedback) => (feedback.id === item.id ? { ...feedback, status } : feedback)),
      );
      toast.success(status === 'approved' ? 'Đã duyệt phản hồi.' : 'Đã từ chối phản hồi.', {
        id: `admin-feedback-update-${item.id}`,
      });
    }

    setUpdatingId('');
  };

  const exportCsv = () => {
    const header = ['noi_dung_goc', 'nhan_cu', 'nhan_sua', 'trang_thai', 'nguoi_gui', 'thoi_gian'];
    const rows = filteredItems.map((item) => {
      const profile = profiles[item.user_id] || {};

      return [
        item.original_content || '',
        labelText(item.old_ai_label),
        labelText(item.corrected_label),
        STATUS_LABEL[normalizeStatus(item.status)],
        profile.email || item.user_id || '',
        item.created_at || '',
      ];
    });

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `feedback-data-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className={`text-3xl font-black ${theme.text}`}>Quản lý phản hồi</h1>
          <p className={`mt-2 text-sm ${theme.muted}`}>
            Theo dõi các đính chính của người dùng và quyết định phản hồi nào được ghi nhận.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={loadFeedback}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition ${theme.buttonGhost}`}
          >
            <RefreshCcw className="h-4 w-4" />
            Làm mới dữ liệu
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-indigo-950/40 transition hover:bg-indigo-500"
          >
            <Download className="h-4 w-4" />
            Xuất Dataset CSV
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard theme={theme} label="Tổng phản hồi" value={stats.total} />
        <StatCard theme={theme} label="Chờ xử lý" value={stats.pending} tone="indigo" />
        <StatCard theme={theme} label="Đã duyệt" value={stats.approved} tone="green" />
        <StatCard theme={theme} label="Đã từ chối" value={stats.rejected} tone="rose" />
      </div>

      <div className={`rounded-2xl border shadow-2xl ${theme.card}`}>
        <div className="flex flex-col gap-3 border-b border-slate-700/60 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo nội dung, email hoặc tên người gửi..."
              className={`w-full rounded-xl border py-3 pl-11 pr-4 text-sm outline-none transition ${theme.input}`}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className={`rounded-xl border px-4 py-3 text-sm font-bold outline-none transition ${theme.input}`}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="pending">Chờ duyệt</option>
            <option value="approved">Đã duyệt</option>
            <option value="rejected">Đã từ chối</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] border-collapse">
            <thead className={`border-b ${theme.tableHead}`}>
              <tr>
                <Th theme={theme}>Nội dung gốc</Th>
                <Th theme={theme}>Nhãn cũ</Th>
                <Th theme={theme}>Nhãn người dùng sửa</Th>
                <Th theme={theme}>Người gửi</Th>
                <Th theme={theme}>Trạng thái</Th>
                <Th theme={theme} align="right">Hành động</Th>
              </tr>
            </thead>
            <tbody className={`divide-y ${theme.tableDivide}`}>
              {loading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <tr key={index}>
                    <td className="px-5 py-5" colSpan={6}>
                      <div className="h-16 animate-pulse rounded-xl bg-slate-500/20" />
                    </td>
                  </tr>
                ))
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td className={`px-5 py-14 text-center text-sm ${theme.muted}`} colSpan={6}>
                    Không có phản hồi nào phù hợp.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const profile = profiles[item.user_id] || {};
                  const status = normalizeStatus(item.status);
                  const disabled = updatingId === item.id;

                  return (
                    <tr key={item.id} className={`transition ${theme.rowHover}`}>
                      <td className="max-w-md px-5 py-5">
                        <p className={`line-clamp-3 text-sm font-semibold leading-6 ${theme.text}`}>
                          {item.original_content || 'Không có nội dung'}
                        </p>
                        <p className={`mt-2 text-xs ${theme.faint}`}>
                          {item.created_at ? new Date(item.created_at).toLocaleString('vi-VN') : 'Chưa có thời gian'}
                        </p>
                      </td>
                      <td className="px-5 py-5">
                        <span className={Number(item.old_ai_label) === 1 ? 'text-emerald-400' : 'text-rose-400'}>
                          {labelText(item.old_ai_label)}
                        </span>
                      </td>
                      <td className="px-5 py-5">
                        <span className={Number(item.corrected_label) === 1 ? 'text-emerald-400' : 'text-rose-400'}>
                          {labelText(item.corrected_label)}
                        </span>
                      </td>
                      <td className="px-5 py-5">
                        <p className={`text-sm font-bold ${theme.text}`}>{profile.full_name || 'Người dùng'}</p>
                        <p className={`mt-1 text-xs ${theme.faint}`}>{profile.email || item.user_id || 'Không rõ'}</p>
                      </td>
                      <td className="px-5 py-5">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${
                            STATUS_CLASS[status] || STATUS_CLASS.pending
                          }`}
                        >
                          {STATUS_LABEL[status] || STATUS_LABEL.pending}
                        </span>
                      </td>
                      <td className="px-5 py-5 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => updateStatus(item, 'approved')}
                            className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/30 px-3 py-2 text-xs font-black text-emerald-400 transition hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Duyệt
                          </button>
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => updateStatus(item, 'rejected')}
                            className="inline-flex items-center gap-2 rounded-lg border border-rose-400/30 px-3 py-2 text-xs font-black text-rose-400 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <XCircle className="h-4 w-4" />
                            Từ chối
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
      </div>
    </section>
  );
}
