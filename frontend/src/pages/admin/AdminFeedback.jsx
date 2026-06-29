import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Download, RefreshCw, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminFeedback = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  
  const fetchFeedbacks = async () => {
    try {
      setIsLoading(true);
      const adminId = localStorage.getItem('userId');
      
      const res = await fetch(`http://localhost:8000/api/admin/feedbacks?admin_id=${adminId}`);

      if (!res.ok) throw new Error('Lỗi từ phía máy chủ');
      
      const data = await res.json();
      // Supabase trả về mảng trực tiếp, nên ta set data thẳng luôn
      setFeedbacks(data || []); 
      
    } catch (error) {
      console.error("Lỗi fetch feedbacks:", error);
      toast.error('Không thể tải danh sách phản hồi từ máy chủ.');
      setFeedbacks([]); // Xóa sạch data cũ nếu có lỗi
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []); // Cố định mảng rỗng để load 1 lần duy nhất khi mở trang

  const handleReview = async (id, action) => {
    const actionText = action === 'approve' ? 'Duyệt' : 'Từ chối';
    try {
      const adminId = localStorage.getItem('userId');
      const res = await fetch('http://localhost:8000/api/admin/feedback/review', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_id: adminId, feedback_id: id, action })
      });

      if (!res.ok) throw new Error('Lỗi API');
      
      toast.success(`Đã ${actionText} phản hồi thành công!`);
      // Xóa dòng vừa duyệt khỏi bảng ngay lập tức cho mượt
      setFeedbacks(prev => prev.filter(fb => fb.id !== id));
      
    } catch (error) {
      toast.error(`Lỗi khi ${actionText} phản hồi. Kiểm tra lại Backend.`);
    }
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const adminId = localStorage.getItem('userId');
      const res = await fetch(`http://localhost:8000/api/admin/dataset/export?admin_id=${adminId}`);

      if (!res.ok) throw new Error('Không có dữ liệu hoặc lỗi server');

      // Lấy file CSV từ Backend và ép trình duyệt tải về
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `phobert_retrain_dataset_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Xuất Dataset CSV thành công!');
    } catch (error) {
      toast.error('Lỗi khi xuất Dataset CSV. Có thể chưa có data nào được duyệt.');
    } finally {
      setIsExporting(false);
    }
  };

const getLabelBadge = (labelValue) => {
    // Xử lý null/undefined
    if (labelValue === null || labelValue === undefined) {
      return <span className="px-2.5 py-1 text-xs rounded-full font-medium border bg-slate-500/10 text-slate-400 border-slate-500/20">Chưa có nhãn</span>;
    }

    // Dịch mã số (int4) từ Database ra giao diện
    if (labelValue === 1) {
      return (
        <span className="px-2.5 py-1 text-xs rounded-full font-medium border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
          Tích cực (1)
        </span>
      );
    } else if (labelValue === 0) {
      return (
        <span className="px-2.5 py-1 text-xs rounded-full font-medium border bg-rose-500/10 text-rose-400 border-rose-500/20">
          Tiêu cực (0)
        </span>
      );
    } else {
      // Dành cho các nhãn khác (bug, trung tính...) nếu DB có lưu số 2, 3...
      return (
        <span className="px-2.5 py-1 text-xs rounded-full font-medium border bg-orange-500/10 text-orange-400 border-orange-500/20">
          Khác ({labelValue})
        </span>
      );
    }
  };

return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500 font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-wide text-white">Quản lý Phản hồi (MLOps)</h1>
          <p className="text-sm text-slate-400">Duyệt nhãn người dùng gán lại để làm giàu Dataset huấn luyện.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchFeedbacks}
            disabled={isLoading}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-700"
            title="Làm mới"
          >
            <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
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

      <div className="rounded-2xl border border-slate-700 bg-slate-800/50 backdrop-blur-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700/50 bg-slate-900/30">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Filter size={16} />
            <span>Đang chờ duyệt ({isLoading ? '...' : feedbacks.length})</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-700/50 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-5 py-4 w-[45%]">Nội dung gốc</th>
                <th className="px-5 py-4">Nhãn AI</th>
                <th className="px-5 py-4">Nhãn User sửa</th>
                <th className="px-5 py-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-4">
                      <div className="w-3/4 h-4 bg-slate-700/50 rounded animate-pulse mb-2"></div>
                      <div className="w-1/2 h-4 bg-slate-700/50 rounded animate-pulse"></div>
                    </td>
                    <td className="px-5 py-4"><div className="w-20 h-6 bg-slate-700/50 rounded-full animate-pulse"></div></td>
                    <td className="px-5 py-4"><div className="w-20 h-6 bg-slate-700/50 rounded-full animate-pulse"></div></td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <div className="w-8 h-8 bg-slate-700/50 rounded animate-pulse"></div>
                        <div className="w-8 h-8 bg-slate-700/50 rounded animate-pulse"></div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : feedbacks.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-5 py-12 text-center text-slate-500 text-sm">
                    Không có phản hồi nào đang chờ duyệt.
                  </td>
                </tr>
              ) : (
                feedbacks.map((fb) => (
                  <tr key={fb.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-5 py-4 text-sm text-slate-300">
                      {/* Đã sửa: Khớp 100% với tên cột original_content trong Database */}
                      <p className="line-clamp-2" title={fb.original_content}>
                        {fb.original_content}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      {/* Đã sửa: Gọi đúng cột old_ai_label */}
                      {getLabelBadge(fb.old_ai_label)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {/* Đã sửa: So sánh đúng 2 cột old_ai_label và corrected_label */}
                        {fb.old_ai_label !== fb.corrected_label && (
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500" title="User đã sửa nhãn"></span>
                        )}
                        {/* Đã sửa: Gọi đúng cột corrected_label */}
                        {getLabelBadge(fb.corrected_label)}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end items-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleReview(fb.id, 'approve')}
                          className="flex items-center justify-center w-8 h-8 rounded text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors tooltip-trigger"
                          title="Duyệt (Approve)"
                        >
                          <CheckCircle2 size={20} />
                        </button>
                        <button
                          onClick={() => handleReview(fb.id, 'reject')}
                          className="flex items-center justify-center w-8 h-8 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors tooltip-trigger"
                          title="Từ chối (Reject)"
                        >
                          <XCircle size={20} />
                        </button>
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

export default AdminFeedback;