import React, { useState, useEffect } from 'react';
import { Search, Ban, Unlock, Crown, ShieldAlert, ShieldCheck, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const adminId = localStorage.getItem('userId');
      
      const res = await fetch(`http://localhost:8000/api/admin/users?admin_id=${adminId}`);

      if (!res.ok) throw new Error('Lỗi kết nối Backend');
      
      const data = await res.json();
      setUsers(data || []);
      
    } catch (error) {
      console.error("Lỗi fetch users:", error);
      toast.error('Không thể tải danh sách người dùng từ máy chủ.');
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []); // Cố định mảng rỗng để không bị loop render

  const handleAction = async (targetUserId, action) => {
    setProcessingId(targetUserId);
    try {
      const adminId = localStorage.getItem('userId');
      const res = await fetch('http://localhost:8000/api/admin/users/action', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_id: adminId, target_user_id: targetUserId, action })
      });

      if (!res.ok) throw new Error('Lỗi API thao tác User');

      toast.success('Thao tác thành công!');
      fetchUsers(); // Tải lại bảng ngay lập tức để cập nhật UI
      
    } catch (error) {
      console.error("Lỗi thao tác user:", error);
      toast.error('Có lỗi xảy ra khi thực hiện thao tác.');
    } finally {
      setProcessingId(null);
    }
  };

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

  // Đổi từ plan -> tier cho khớp với Backend và Database
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
            <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
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
                Array(4).fill(0).map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-4"><div className="w-40 h-4 bg-slate-700/50 rounded animate-pulse"></div></td>
                    <td className="px-5 py-4"><div className="w-16 h-4 bg-slate-700/50 rounded animate-pulse"></div></td>
                    <td className="px-5 py-4"><div className="w-24 h-6 bg-slate-700/50 rounded-full animate-pulse"></div></td>
                    <td className="px-5 py-4"><div className="w-16 h-6 bg-slate-700/50 rounded-full animate-pulse"></div></td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <div className="w-8 h-8 bg-slate-700/50 rounded animate-pulse"></div>
                        <div className="w-8 h-8 bg-slate-700/50 rounded animate-pulse"></div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-5 py-12 text-center text-slate-500 text-sm">
                    Không có người dùng nào trong hệ thống.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-300 font-medium">{user.email}</span>
                        <span className="text-xs text-slate-500 mt-0.5 font-mono" title={user.id}>
                          ID: {user.id.substring(0, 8)}...
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-slate-400 capitalize">{user.role}</span>
                    </td>
                    <td className="px-5 py-4">{getStatusBadge(user.status)}</td>
                    <td className="px-5 py-4">{getTierBadge(user.tier)}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                        {user.status === 'active' ? (
                          <button
                            onClick={() => handleAction(user.id, 'ban')}
                            disabled={processingId === user.id || user.role === 'admin'}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed tooltip-trigger"
                            title={user.role === 'admin' ? "Không thể khóa Admin" : "Khóa tài khoản"}
                          >
                            <Ban size={18} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAction(user.id, 'unban')}
                            disabled={processingId === user.id}
                            className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed tooltip-trigger"
                            title="Mở khóa tài khoản"
                          >
                            <Unlock size={18} />
                          </button>
                        )}
                        
                        {/* Ẩn nút Nâng cấp VIP nếu user đã là VIP */}
                        {(!user.tier || user.tier.toLowerCase() !== 'vip') && (
                          <button
                            onClick={() => handleAction(user.id, 'upgrade_vip')}
                            disabled={processingId === user.id || user.status === 'banned'}
                            className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed tooltip-trigger"
                            title="Nâng cấp lên VIP"
                          >
                            <Crown size={18} />
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