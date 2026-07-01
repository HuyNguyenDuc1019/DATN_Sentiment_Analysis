import { useEffect, useMemo, useState } from 'react';
import { Ban, Crown, RefreshCw, Search, ShieldAlert, ShieldCheck, Unlock } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../services/supabaseClient';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

// ====== Chức năng dữ liệu ĐÃ ĐƯỢC BỌC ÁO GIÁP ======
  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      console.log("1. Bắt đầu gọi API lấy danh sách...");

      const adminId = localStorage.getItem('userId');
      console.log("2. Admin ID đang dùng:", adminId);

      if (!adminId) {
         toast.error("Không tìm thấy thông tin đăng nhập!");
         setIsLoading(false); // Đảm bảo tắt loading nếu thiếu ID
         return;
      }

      const res = await fetch(`http://localhost:8000/api/admin/users?admin_id=${adminId}`);
      console.log("3. Trạng thái Backend trả về:", res.status);

      if (!res.ok) {
         const errorText = await res.text();
         console.error("Lỗi chi tiết từ Server:", errorText);
         throw new Error(`Lỗi Server: ${res.status}`);
      }

      const data = await res.json();
      console.log("4. Dữ liệu thô từ Server:", data);

      // BẢO VỆ CHỐNG CRASH: Kiểm tra ép kiểu dữ liệu
      if (Array.isArray(data)) {
         setUsers(data);
      } else if (data && Array.isArray(data.data)) {
         // Đề phòng Backend trả về dạng { data: [...] }
         setUsers(data.data);
      } else {
         console.error("⚠️ Dữ liệu trả về không phải là một Mảng (Array):", data);
         setUsers([]); // Reset về mảng rỗng để không bị crash giao diện
      }

    } catch (error) {
      console.error('5. Lỗi quá trình tải:', error);
      toast.error('Không thể tải danh sách người dùng từ máy chủ.');
      setUsers([]);
    } finally {
      setIsLoading(false);
      console.log("6. Đã tắt trạng thái Loading.");
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // ====== Tìm kiếm - giữ nguyên 100% từ file 1 ======
  const filteredUsers = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return users;

    return users.filter((user) =>
      [user.email, user.full_name, user.role, user.status, user.tier]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [searchTerm, users]);

// Thao tác ĐÃ ĐƯỢC SỬA: Gọi API Backend để bảo mật dữ liệu
  const handleAction = async (targetUser, action) => {
    setProcessingId(targetUser.id);
    try {
      const adminId = localStorage.getItem('userId');
      if (!adminId) throw new Error("Không tìm thấy thông tin đăng nhập!");

      // 1. Gọi API Backend thay vì chọc thẳng DB
      const res = await fetch(`http://localhost:8000/api/admin/users/action`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_id: adminId,
          target_user_id: targetUser.id, // Truyền ID người bị thao tác vào đây
          action: action
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Lỗi server');
      }

      // 2. Tính toán lại UI để cập nhật ngay lập tức (Optimistic UI)
      const updatePayload =
        action === 'ban' ? { status: 'blocked' }
        : action === 'unban' ? { status: 'active' }
        : action === 'upgrade_vip' ? { tier: 'vip' }
        : { tier: 'free' };

      // Cập nhật lại danh sách trên màn hình mà không cần load lại trang
      setUsers((current) =>
        current.map((user) => (user.id === targetUser.id ? { ...user, ...updatePayload } : user))
      );
      
      toast.success('Thao tác thành công!', {
        id: `admin-user-action-${targetUser.id}-${action}`,
      });
      
    } catch (error) {
      console.error('Lỗi thao tác user:', error);
      toast.error(`Thất bại: ${error.message}`, {
        id: `admin-user-action-error-${action}`,
      });
    } finally {
      setProcessingId(null);
    }
  };

  // ====== Badge - giữ nguyên 100% từ file 1 ======
  const getStatusBadge = (status) => {
    const isActive = status === 'active';
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full font-medium border ${
        isActive
          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
      }`}>
        {isActive ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
        {isActive ? 'Hoạt động' : 'Bị khóa'}
      </span>
    );
  };

  const getTierBadge = (tier) => {
    const safeTier = tier?.toLowerCase() || 'free';
    const isVIP = safeTier === 'vip';
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full font-medium border ${
        isVIP
          ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
          : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
      }`}>
        {isVIP && <Crown size={12} />}
        {isVIP ? 'VIP' : 'Free'}
      </span>
    );
  };

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500 font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-wide text-white">Quản lý Người dùng</h1>
          <p className="text-sm text-slate-400">Quản trị tài khoản, phân quyền và nâng cấp dịch vụ.</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Tìm email..."
              className="w-full bg-slate-950/50 border border-slate-700 text-white text-sm rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder-slate-500"
            />
          </div>
          <button
            onClick={fetchUsers}
            disabled={isLoading}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-700 shrink-0"
            title="Làm mới"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-700 bg-slate-800/50 backdrop-blur-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-700/50 text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-900/30">
                <th className="px-5 py-4">Tài khoản (Email)</th>
                <th className="px-5 py-4">Vai trò</th>
                <th className="px-5 py-4">Trạng thái</th>
                <th className="px-5 py-4">Gói dịch vụ</th>
                <th className="px-5 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {isLoading ? (
                Array(4).fill(0).map((_, index) => (
                  <tr key={index}>
                    <td className="px-5 py-4"><div className="w-40 h-4 bg-slate-700/50 rounded animate-pulse" /></td>
                    <td className="px-5 py-4"><div className="w-16 h-4 bg-slate-700/50 rounded animate-pulse" /></td>
                    <td className="px-5 py-4"><div className="w-24 h-6 bg-slate-700/50 rounded-full animate-pulse" /></td>
                    <td className="px-5 py-4"><div className="w-16 h-6 bg-slate-700/50 rounded-full animate-pulse" /></td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <div className="w-8 h-8 bg-slate-700/50 rounded animate-pulse" />
                        <div className="w-8 h-8 bg-slate-700/50 rounded animate-pulse" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-5 py-12 text-center text-slate-500 text-sm">
                    Không có người dùng phù hợp.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-300 font-medium">{user.email || user.full_name || 'Chưa có email'}</span>
                        <span className="text-xs text-slate-500 mt-0.5 font-mono" title={user.id}>
                          ID: {String(user.id || '').substring(0, 8)}...
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-slate-400 capitalize">{user.role || 'user'}</span>
                    </td>
                    <td className="px-5 py-4">{getStatusBadge(user.status)}</td>
                    <td className="px-5 py-4">{getTierBadge(user.tier)}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                        {user.status === 'active' ? (
                          <button
                            onClick={() => handleAction(user, 'ban')}
                            disabled={processingId === user.id || user.role === 'admin'}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed tooltip-trigger"
                            title={user.role === 'admin' ? 'Không thể khóa Admin' : 'Khóa tài khoản'}
                          >
                            <Ban size={18} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAction(user, 'unban')}
                            disabled={processingId === user.id}
                            className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed tooltip-trigger"
                            title="Mở khóa tài khoản"
                          >
                            <Unlock size={18} />
                          </button>
                        )}

                        {(!user.tier || user.tier.toLowerCase() !== 'vip') ? (
                          <button
                            onClick={() => handleAction(user, 'upgrade_vip')}
                            disabled={processingId === user.id || user.status !== 'active'}
                            className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed tooltip-trigger"
                            title="Nâng cấp lên VIP"
                          >
                            <Crown size={18} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAction(user, 'downgrade_vip')}
                            disabled={processingId === user.id}
                            className="p-1.5 text-indigo-400 hover:text-slate-400 hover:bg-slate-500/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed tooltip-trigger"
                            title="Hạ xuống gói Free"
                          >
                            <Crown size={18} fill="currentColor" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;