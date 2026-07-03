import React, { useState, useEffect } from 'react';
import { CreditCard, Search, CheckCircle2, XCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../services/supabaseClient';

const AdminTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setIsLoading(true);
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError || !authData?.user) throw new Error("Chưa đăng nhập!");

        const adminId = authData.user.id;
        const res = await fetch(`http://localhost:8000/api/admin/transactions?admin_id=${adminId}`);
        
        if (!res.ok) throw new Error("Lỗi tải dữ liệu từ máy chủ");
        const data = await res.json();
        
        // Format dữ liệu do Supabase trả về object lồng nhau (profiles)
        const formattedData = data.map(item => ({
          ...item,
          email: item.profiles?.email || 'N/A',
          fullName: item.profiles?.full_name || 'N/A'
        }));
        
        setTransactions(formattedData);
      } catch (error) {
        console.error(error);
        toast.error("Không thể tải danh sách giao dịch.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 size={12} /> Thành công
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle size={12} /> Đã hủy
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock size={12} /> Đang xử lý
          </span>
        );
    }
  };

  const filteredData = transactions.filter(t => 
    t.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <CreditCard className="text-indigo-400" />
          Quản lý Giao dịch
        </h1>
        <p className="text-slate-400 mt-2">Theo dõi lịch sử thanh toán nâng cấp VIP của hệ thống.</p>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Tìm mã giao dịch, email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="text-xs uppercase bg-slate-900/50 text-slate-400">
              <tr>
                <th className="px-6 py-4 font-semibold">Mã giao dịch</th>
                <th className="px-6 py-4 font-semibold">Người dùng</th>
                <th className="px-6 py-4 font-semibold">Số tiền</th>
                <th className="px-6 py-4 font-semibold">Trạng thái</th>
                <th className="px-6 py-4 font-semibold">Ngày tạo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-400">Đang tải dữ liệu...</td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-400">Không tìm thấy giao dịch nào.</td>
                </tr>
              ) : (
                filteredData.map((txn) => (
                  <tr key={txn.id} className="hover:bg-slate-700/20 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">{txn.id.split('-')[0].toUpperCase()}...</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{txn.fullName}</div>
                      <div className="text-xs text-slate-400">{txn.email}</div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-emerald-400">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(txn.amount)}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(txn.status)}</td>
                    <td className="px-6 py-4 text-slate-400">
                      {new Date(txn.created_at).toLocaleString('vi-VN')}
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

export default AdminTransactions;