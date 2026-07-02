import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Download, Filter, RefreshCw, Search, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../services/supabaseClient';
import { logAdminActivity } from '../../services/adminActivityLogger';

// ====== Chức năng dữ liệu giữ nguyên từ file Feedback (Supabase) ======

const STATUS_LABEL = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Đã từ chối',
};

const normalizeStatus = (status) => status || 'pending';

const AdminFeedback = () => {
  const [items, setItems] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [updatingId, setUpdatingId] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');

// ====== 1. HÀM LOAD DỮ LIỆU ĐÃ CHUYỂN QUA GỌI API BACKEND ======
  const loadFeedback = useCallback(async () => {
    setIsLoading(true);
    try {
      // Lấy ID người dùng trực tiếp từ hệ thống bảo mật của Supabase (Thay vì localStorage)
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError || !authData?.user) {
        throw new Error("Không tìm thấy thông tin đăng nhập (Phiên hết hạn)!");
      }

      const adminId = authData.user.id;

      const res = await fetch(`http://localhost:8000/api/admin/feedback?admin_id=${adminId}`);
      if (!res.ok) throw new Error('Lỗi server');
      
      const data = await res.json();
      
      // Xử lý dữ liệu trả về từ API (đã được Backend join sẵn bảng profiles)
      const formattedItems = [];
      const mappedProfiles = {};

      data.forEach(item => {
        // Tách phần profiles ra để lưu riêng vào state cho code bên dưới chạy khớp
        if (item.profiles) {
           mappedProfiles[item.user_id] = item.profiles;
        }
        // Xóa thuộc tính profiles để item trở về chuẩn cũ
        const { profiles, ...cleanItem } = item;
        formattedItems.push(cleanItem);
      });

      setItems(formattedItems);
      setProfiles(mappedProfiles);
    } catch (error) {
      console.error('Lỗi tải phản hồi admin:', error);
      toast.error('Không thể tải danh sách phản hồi từ máy chủ.', {
        id: 'admin-feedback-load-error',
      });
      setItems([]);
      setProfiles({});
    } finally {
      setIsLoading(false);
    }
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

// ====== 2. HÀM THAO TÁC DUYỆT ĐÃ CHUYỂN QUA GỌI API BACKEND ======
  const handleReview = async (item, action) => {
    const status = action === 'approve' ? 'approved' : 'rejected';
    const actionText = action === 'approve' ? 'duyệt' : 'từ chối';

    setUpdatingId(item.id);
    try {
// Lấy ID người dùng trực tiếp từ hệ thống bảo mật của Supabase
const { data: authData, error: authError } = await supabase.auth.getUser();

if (authError || !authData?.user) {
  // Nếu chưa đăng nhập, đá văng ra trang login (tuỳ chọn) hoặc báo lỗi
  throw new Error("Không tìm thấy thông tin đăng nhập (Supabase Session rỗng)!");
}

const adminId = authData.user.id;

      const res = await fetch(`http://localhost:8000/api/admin/feedback/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_id: adminId,
          feedback_id: item.id,
          action: action // "approve" hoặc "reject"
        })
      });

      if (!res.ok) {
         const err = await res.json();
         throw new Error(err.detail || 'Lỗi server');
      }

      // Cập nhật giao diện ngay lập tức
      setItems((current) =>
        current.map((feedback) => (feedback.id === item.id ? { ...feedback, status } : feedback)),
      );
      toast.success(`Đã ${actionText} phản hồi thành công!`, {
        id: `admin-feedback-${action}-${item.id}`,
      });

      // ====== Ghi nhật ký hoạt động: admin nào vừa duyệt/từ chối phản hồi nào ======
      logAdminActivity({
        actionType: action === 'approve' ? 'feedback_approved' : 'feedback_rejected',
        targetType: 'feedback',
        targetId: item.id,
        description: `${actionText} phản hồi: "${(item.original_content || '').slice(0, 60)}${
          (item.original_content || '').length > 60 ? '...' : ''
        }"`,
      });
    } catch (error) {
      console.error('Lỗi duyệt phản hồi:', error);
      toast.error(`Không thể ${actionText} phản hồi: ${error.message}`, {
        id: `admin-feedback-${action}-error`,
      });
    } finally {
      setUpdatingId('');
    }
  };
  
// ====== HÀM XUẤT DATASET ĐÃ ĐƯỢC CHUYỂN QUA GỌI API BACKEND ======
  const handleExport = async () => {
    try {
      setIsExporting(true);
      
      const adminId = localStorage.getItem('userId');
      if (!adminId) throw new Error("Không tìm thấy thông tin đăng nhập!");

      // 1. Gọi API tải file từ Backend
      const response = await fetch(`http://localhost:8000/api/admin/dataset/export?admin_id=${adminId}`, {
        method: 'GET',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Lỗi khi tải file từ Server');
      }

      // 2. Ép trình duyệt tự động tải file CSV vừa nhận được về máy
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `phobert_retrain_dataset_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      
      // Dọn dẹp bộ nhớ
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Xuất Dataset AI thành công!', {
        id: 'admin-feedback-export-success',
      });

      // ====== Ghi nhật ký hoạt động: admin nào vừa xuất dataset CSV ======
      logAdminActivity({
        actionType: 'dataset_exported',
        targetType: 'dataset',
        targetId: null,
        description: 'xuất dataset CSV để retrain mô hình AI',
      });
    } catch (error) {
      console.error('Lỗi xuất Dataset CSV:', error);
      toast.error(`Thất bại: ${error.message}`, {
        id: 'admin-feedback-export-error',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // ====== Giao diện badge nhãn - giữ nguyên 100% từ file 1 ======
  const getLabelBadge = (labelValue) => {
    if (labelValue === null || labelValue === undefined) {
      return <span className="px-2.5 py-1 text-xs rounded-full font-medium border bg-slate-500/10 text-slate-400 border-slate-500/20">Chưa có nhãn</span>;
    }

    if (Number(labelValue) === 1) {
      return (
        <span className="px-2.5 py-1 text-xs rounded-full font-medium border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
          Tích cực (1)
        </span>
      );
    }

    if (Number(labelValue) === 0) {
      return (
        <span className="px-2.5 py-1 text-xs rounded-full font-medium border bg-rose-500/10 text-rose-400 border-rose-500/20">
          Tiêu cực (0)
        </span>
      );
    }

    return (
      <span className="px-2.5 py-1 text-xs rounded-full font-medium border bg-orange-500/10 text-orange-400 border-orange-500/20">
        Khác ({labelValue})
      </span>
    );
  };

  // Badge trạng thái - style đồng bộ với getLabelBadge của file 1
  const getStatusBadge = (status) => {
    const normalized = normalizeStatus(status);
    const classMap = {
      pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      rejected: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    };

    return (
      <span className={`px-2.5 py-1 text-xs rounded-full font-medium border ${classMap[normalized]}`}>
        {STATUS_LABEL[normalized]}
      </span>
    );
  };

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500 font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-wide text-white">Quản lý Phản hồi</h1>
          <p className="text-sm text-slate-400">Duyệt các nhãn người dùng chỉnh sửa để cải thiện bộ dữ liệu.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadFeedback}
            disabled={isLoading}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-700"
            title="Làm mới"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isExporting ? <RefreshCw size={18} className="animate-spin" /> : <Download size={18} />}
            <span>Xuất Dataset CSV</span>
          </button>
        </div>
      </div>

      {/* ====== Thẻ thống kê - chức năng từ file Feedback (Supabase), style đồng bộ giao diện file 1 ====== */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-md">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tổng phản hồi</h3>
          <p className="mt-4 text-4xl font-bold text-white">{isLoading ? '...' : stats.total}</p>
        </div>
        <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-md">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Chờ xử lý</h3>
          <p className="mt-4 text-4xl font-bold text-amber-400">{isLoading ? '...' : stats.pending}</p>
        </div>
        <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-md">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Đã duyệt</h3>
          <p className="mt-4 text-4xl font-bold text-emerald-400">{isLoading ? '...' : stats.approved}</p>
        </div>
        <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-md">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Đã từ chối</h3>
          <p className="mt-4 text-4xl font-bold text-rose-400">{isLoading ? '...' : stats.rejected}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-700 bg-slate-800/50 backdrop-blur-md overflow-hidden">
        {/* ====== Thanh lọc - giữ icon Filter từ file 1, mở rộng thêm search + select để giữ chức năng lọc/tìm kiếm ====== */}
        <div className="flex flex-col gap-3 px-5 py-3 border-b border-slate-700/50 bg-slate-900/30 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Filter size={16} />
            <span>{isLoading ? 'Đang tải...' : `${filteredItems.length} phản hồi`}</span>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm theo nội dung, email, tên..."
                className="w-full sm:w-64 rounded-lg border border-slate-700 bg-slate-900 py-1.5 pl-8 pr-3 text-xs text-white placeholder:text-slate-500 outline-none focus:border-indigo-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 outline-none focus:border-indigo-500"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="pending">Chờ duyệt</option>
              <option value="approved">Đã duyệt</option>
              <option value="rejected">Đã từ chối</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-700/50 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-5 py-4 w-[35%]">Nội dung gốc</th>
                <th className="px-5 py-4">Nhãn hệ thống</th>
                <th className="px-5 py-4">Nhãn người dùng sửa</th>
                <th className="px-5 py-4">Người gửi</th>
                <th className="px-5 py-4">Trạng thái</th>
                <th className="px-5 py-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {isLoading ? (
                Array(5).fill(0).map((_, index) => (
                  <tr key={index}>
                    <td className="px-5 py-4">
                      <div className="w-3/4 h-4 bg-slate-700/50 rounded animate-pulse mb-2" />
                      <div className="w-1/2 h-4 bg-slate-700/50 rounded animate-pulse" />
                    </td>
                    <td className="px-5 py-4"><div className="w-20 h-6 bg-slate-700/50 rounded-full animate-pulse" /></td>
                    <td className="px-5 py-4"><div className="w-20 h-6 bg-slate-700/50 rounded-full animate-pulse" /></td>
                    <td className="px-5 py-4"><div className="w-24 h-4 bg-slate-700/50 rounded animate-pulse" /></td>
                    <td className="px-5 py-4"><div className="w-16 h-6 bg-slate-700/50 rounded-full animate-pulse" /></td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <div className="w-8 h-8 bg-slate-700/50 rounded animate-pulse" />
                        <div className="w-8 h-8 bg-slate-700/50 rounded animate-pulse" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-5 py-12 text-center text-slate-500 text-sm">
                    Không có phản hồi nào phù hợp.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const profile = profiles[item.user_id] || {};
                  const disabled = updatingId === item.id;

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/30 transition-colors group">
                      <td className="px-5 py-4 text-sm text-slate-300">
                        <p className="line-clamp-2" title={item.original_content}>
                          {item.original_content}
                        </p>
                      </td>
                      <td className="px-5 py-4">{getLabelBadge(item.old_ai_label)}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {item.old_ai_label !== item.corrected_label && (
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" title="Người dùng đã sửa nhãn" />
                          )}
                          {getLabelBadge(item.corrected_label)}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm">
                        <p className="text-slate-200 font-medium truncate max-w-[160px]">{profile.full_name || 'Người dùng'}</p>
                        <p className="text-xs text-slate-500 truncate max-w-[160px]">{profile.email || item.user_id || 'Không rõ'}</p>
                      </td>
                      <td className="px-5 py-4">{getStatusBadge(item.status)}</td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex justify-end items-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleReview(item, 'approve')}
                            disabled={disabled}
                            className="flex items-center justify-center w-8 h-8 rounded text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Duyệt"
                          >
                            <CheckCircle2 size={20} />
                          </button>
                          <button
                            onClick={() => handleReview(item, 'reject')}
                            disabled={disabled}
                            className="flex items-center justify-center w-8 h-8 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Từ chối"
                          >
                            <XCircle size={20} />
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
    </div>
  );
};

export default AdminFeedback;