import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { RefreshCcw, Search, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../services/supabaseClient';

const roleOptions = ['user', 'admin'];
const statusOptions = ['active', 'blocked'];
const tierOptions = ['free', 'vip'];

const fallbackTheme = {
  card: 'border-slate-700 bg-slate-900/80 shadow-slate-950/30',
  text: 'text-white',
  muted: 'text-slate-400',
  input: 'border-slate-700 bg-slate-950 text-white placeholder:text-slate-500 focus:border-indigo-500',
  tableHead: 'border-slate-800 bg-slate-950/70 text-slate-400',
  tableDivide: 'divide-slate-800',
  rowHover: 'hover:bg-slate-800/60',
  buttonGhost: 'border-slate-700 bg-slate-900 text-slate-200 hover:border-indigo-400 hover:text-white',
};

export default function AdminUsers() {
  const { theme = fallbackTheme } = useOutletContext() || {};
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id,email,full_name,avatar_url,role,status,tier,created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Load admin users failed:', error);
      toast.error('Không thể tải danh sách người dùng từ máy chủ.', {
        id: 'admin-users-load-error',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return users;

    return users.filter((item) =>
      [item.email, item.full_name, item.role, item.status, item.tier]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword)),
    );
  }, [search, users]);

  const updateLocalUser = (id, field, value) => {
    setUsers((current) => current.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const saveUser = async (item) => {
    setSavingId(item.id);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: item.full_name || null,
          role: item.role || 'user',
          status: item.status || 'active',
          tier: item.tier || 'free',
        })
        .eq('id', item.id);

      if (error) throw error;
      toast.success('Đã cập nhật tài khoản.', {
        id: `admin-users-save-${item.id}`,
      });
    } catch (error) {
      console.error('Save user failed:', error);
      toast.error('Không thể lưu thay đổi tài khoản.', {
        id: `admin-users-save-error-${item.id}`,
      });
    } finally {
      setSavingId('');
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className={`text-3xl font-black ${theme.text}`}>Quản lý người dùng</h1>
          <p className={`mt-2 text-sm ${theme.muted}`}>Quản trị tài khoản, phân quyền và gói dịch vụ.</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm email, tên, vai trò..."
              className={`h-11 w-full rounded-xl border pl-10 pr-4 text-sm font-semibold outline-none transition sm:w-80 ${theme.input}`}
            />
          </label>
          <button
            type="button"
            onClick={loadUsers}
            disabled={loading}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-black transition disabled:opacity-60 ${theme.buttonGhost}`}
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>
      </div>

      <div className={`overflow-hidden rounded-2xl border shadow-xl ${theme.card}`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className={`border-b text-xs uppercase tracking-wide ${theme.tableHead}`}>
              <tr>
                <th className="px-5 py-4">Tài khoản</th>
                <th className="px-5 py-4">Họ tên</th>
                <th className="px-5 py-4">Vai trò</th>
                <th className="px-5 py-4">Trạng thái</th>
                <th className="px-5 py-4">Gói dịch vụ</th>
                <th className="px-5 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${theme.tableDivide}`}>
              {filteredUsers.length ? (
                filteredUsers.map((item) => (
                  <tr key={item.id} className={`align-middle transition ${theme.rowHover}`}>
                    <td className="px-5 py-4">
                      <p className={`font-bold ${theme.text}`}>{item.email || '-'}</p>
                      <p className={`mt-1 max-w-[260px] truncate text-xs ${theme.muted}`}>{item.id}</p>
                    </td>
                    <td className="px-5 py-4">
                      <input
                        value={item.full_name || ''}
                        onChange={(event) => updateLocalUser(item.id, 'full_name', event.target.value)}
                        className={`h-10 w-full rounded-lg border px-3 text-sm font-semibold outline-none ${theme.input}`}
                        placeholder="Chưa có tên"
                      />
                    </td>
                    <td className="px-5 py-4">
                      <Select
                        theme={theme}
                        value={item.role || 'user'}
                        options={roleOptions}
                        onChange={(value) => updateLocalUser(item.id, 'role', value)}
                      />
                    </td>
                    <td className="px-5 py-4">
                      <Select
                        theme={theme}
                        value={item.status || 'active'}
                        options={statusOptions}
                        onChange={(value) => updateLocalUser(item.id, 'status', value)}
                      />
                    </td>
                    <td className="px-5 py-4">
                      <Select
                        theme={theme}
                        value={item.tier || 'free'}
                        options={tierOptions}
                        onChange={(value) => updateLocalUser(item.id, 'tier', value)}
                      />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => saveUser(item)}
                        disabled={savingId === item.id}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-indigo-500 disabled:opacity-60"
                      >
                        <Save className="h-4 w-4" />
                        {savingId === item.id ? 'Đang lưu...' : 'Lưu'}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className={`px-5 py-16 text-center ${theme.muted}`}>
                    {loading ? 'Đang tải danh sách người dùng...' : 'Không có người dùng phù hợp.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Select({ theme, value, options, onChange }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={`h-10 w-full rounded-lg border px-3 text-sm font-bold outline-none ${theme.input}`}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}
