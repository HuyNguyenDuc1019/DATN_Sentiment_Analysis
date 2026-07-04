import React, { useMemo, useState, useEffect } from 'react';
import {
  CreditCard,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCcw,
  Download,
  Eye,
  X,
  Copy,
  ArrowUpDown,
  ReceiptText,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../services/supabaseClient';
import Pagination from '../../components/ui/Pagination';

const PAGE_SIZE = 5;

const AdminTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [quickFilter, setQuickFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

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

  useEffect(() => {
    fetchTransactions();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, startDateFilter, endDateFilter, quickFilter, sortConfig]);

  const handleRefresh = async () => {
    await fetchTransactions();
    toast.success('Đã làm mới dữ liệu giao dịch.');
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'paid':
        return 'Thành công';
      case 'cancelled':
        return 'Đã hủy';
      default:
        return 'Đang xử lý';
    }
  };

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

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(amount || 0));

  const formatDate = (value) => {
    if (!value) return 'N/A';
    return new Date(value).toLocaleString('vi-VN');
  };

  const toDateInputValue = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  };

  const applyQuickFilter = (type) => {
    setQuickFilter(type);

    const now = new Date();

    if (type === 'today') {
      const today = toDateInputValue(now);
      setStartDateFilter(today);
      setEndDateFilter(today);
      return;
    }

    if (type === '7days') {
      const start = new Date(now);
      start.setDate(now.getDate() - 6);
      setStartDateFilter(toDateInputValue(start));
      setEndDateFilter(toDateInputValue(now));
      return;
    }

    if (type === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDateFilter(toDateInputValue(start));
      setEndDateFilter(toDateInputValue(now));
      return;
    }

    setStartDateFilter('');
    setEndDateFilter('');
  };

  const isInDateRange = (value) => {
    if (!startDateFilter && !endDateFilter) return true;
    if (!value) return false;

    const createdAt = new Date(value);
    if (Number.isNaN(createdAt.getTime())) return false;

    if (startDateFilter) {
      const start = new Date(`${startDateFilter}T00:00:00`);
      if (createdAt < start) return false;
    }

    if (endDateFilter) {
      const end = new Date(`${endDateFilter}T23:59:59`);
      if (createdAt > end) return false;
    }

    return true;
  };

  const filteredData = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    const result = transactions.filter((t) => {
      const matchKeyword =
        t.id.toLowerCase().includes(keyword) ||
        t.email.toLowerCase().includes(keyword) ||
        t.fullName.toLowerCase().includes(keyword);

      const matchStatus = statusFilter === 'all' || t.status === statusFilter;
      const matchDate = isInDateRange(t.created_at);

      return matchKeyword && matchStatus && matchDate;
    });

    return [...result].sort((a, b) => {
      const direction = sortConfig.direction === 'asc' ? 1 : -1;

      if (sortConfig.key === 'amount') {
        return (Number(a.amount || 0) - Number(b.amount || 0)) * direction;
      }

      const aTime = new Date(a.created_at || 0).getTime();
      const bTime = new Date(b.created_at || 0).getTime();
      return (aTime - bTime) * direction;
    });
  }, [transactions, searchTerm, statusFilter, startDateFilter, endDateFilter, sortConfig]);

  const summary = useMemo(() => {
    const paidItems = filteredData.filter((item) => item.status === 'paid');

    return {
      total: filteredData.length,
      paid: paidItems.length,
      pending: filteredData.filter((item) => item.status !== 'paid' && item.status !== 'cancelled').length,
      cancelled: filteredData.filter((item) => item.status === 'cancelled').length,
      revenue: paidItems.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    };
  }, [filteredData]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));
  const paginatedData = filteredData.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const hasActiveFilter =
    searchTerm.trim() ||
    statusFilter !== 'all' ||
    startDateFilter ||
    endDateFilter;

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setStartDateFilter('');
    setEndDateFilter('');
    setQuickFilter('all');
    setSortConfig({ key: 'created_at', direction: 'desc' });
  };

  const handleSort = (key) => {
    setSortConfig((current) => {
      if (current.key === key) {
        return {
          key,
          direction: current.direction === 'asc' ? 'desc' : 'asc',
        };
      }

      return {
        key,
        direction: key === 'created_at' ? 'desc' : 'asc',
      };
    });
  };

  const getSortLabel = (key) => {
    if (sortConfig.key !== key) return '';

    return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
  };

  const copyTransactionId = async (transactionId) => {
    try {
      await navigator.clipboard.writeText(transactionId);
      toast.success('Đã copy mã giao dịch.');
    } catch {
      toast.error('Không thể copy mã giao dịch.');
    }
  };


  const exportCsv = () => {
    if (!filteredData.length) {
      toast.error('Không có dữ liệu để xuất CSV.');
      return;
    }

    const headers = ['Mã giao dịch', 'Người dùng', 'Email', 'Số tiền', 'Trạng thái', 'Ngày tạo'];
    const rows = filteredData.map((txn) => [
      txn.id,
      txn.fullName,
      txn.email,
      Number(txn.amount || 0),
      getStatusLabel(txn.status),
      formatDate(txn.created_at),
    ]);

    const escapeCsv = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const csvContent = [headers, ...rows]
      .map((row) => row.map(escapeCsv).join(','))
      .join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const date = new Date().toISOString().slice(0, 10);

    const link = document.createElement('a');
    link.href = url;
    link.download = `giao-dich-vip-${date}.csv`;
    link.click();

    URL.revokeObjectURL(url);
    toast.success('Đã xuất file CSV giao dịch.');
  };

  return (
    <div className="admin-transactions-page w-full p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <CreditCard className="text-indigo-400" />
          Quản lý Giao dịch
        </h1>
        <p className="text-slate-400 mt-2">Theo dõi lịch sử thanh toán nâng cấp VIP của hệ thống.</p>
      </div>

      <div className="admin-transactions-summary mb-4 grid grid-cols-1 gap-3 md:grid-cols-5">
        <MiniSummaryCard label="Tổng giao dịch" value={summary.total} />
        <MiniSummaryCard label="Giao dịch thành công" value={summary.paid} tone="success" />
        <MiniSummaryCard label="Đang xử lý" value={summary.pending} tone="warning" />
        <MiniSummaryCard label="Đã hủy" value={summary.cancelled} tone="danger" />
        <MiniSummaryCard label="Doanh thu lọc" value={formatCurrency(summary.revenue)} tone="money" />
      </div>

      <div className="admin-transactions-table-card bg-slate-800 border border-slate-700 rounded-2xl shadow-xl overflow-hidden">
        <div className="admin-transactions-toolbar p-4 border-b border-slate-700 bg-slate-800/50 flex flex-col gap-3 2xl:flex-row 2xl:justify-between 2xl:items-center">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative w-full lg:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Tìm mã giao dịch, email..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full lg:w-44 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="paid">Thành công</option>
              <option value="cancelled">Đã hủy</option>
              <option value="pending">Đang xử lý</option>
            </select>


            <input
              type="date"
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
              className="w-full lg:w-40 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none [color-scheme:dark]"
              title="Từ ngày"
            />

            <input
              type="date"
              value={endDateFilter}
              onChange={(e) => setEndDateFilter(e.target.value)}
              className="w-full lg:w-40 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none [color-scheme:dark]"
              title="Đến ngày"
            />

            <div className="flex flex-wrap items-center gap-2">
              {[
                { key: 'today', label: 'Hôm nay' },
                { key: '7days', label: '7 ngày' },
                { key: 'month', label: 'Tháng này' },
                { key: 'all', label: 'Tất cả' },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => applyQuickFilter(item.key)}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                    quickFilter === item.key
                      ? 'border-indigo-500 bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                      : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {hasActiveFilter && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-700 bg-slate-900 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
              >
                <X size={15} />
                Xóa lọc
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportCsv}
              disabled={isLoading || filteredData.length === 0}
              className="admin-transactions-export-btn inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed border border-slate-700"
            >
              <Download size={16} />
              Xuất CSV
            </button>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={isLoading}
              className="admin-transactions-refresh-btn inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/20"
            >
              <RefreshCcw size={16} className={isLoading ? 'animate-spin' : ''} />
              {isLoading ? 'Đang tải...' : 'Làm mới'}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="admin-transactions-thead text-xs uppercase bg-slate-900/50 text-slate-400">
              <tr>
                <th className="px-6 py-4 font-semibold">Mã giao dịch</th>
                <th className="px-6 py-4 font-semibold">Người dùng</th>
                <th className="px-6 py-4 font-semibold">
                  <button
                    type="button"
                    onClick={() => handleSort('amount')}
                    className="inline-flex items-center gap-1 hover:text-white transition-colors"
                  >
                    Số tiền{getSortLabel('amount')}
                    <ArrowUpDown size={13} />
                  </button>
                </th>
                <th className="px-6 py-4 font-semibold">Trạng thái</th>
                <th className="px-6 py-4 font-semibold">
                  <button
                    type="button"
                    onClick={() => handleSort('created_at')}
                    className="inline-flex items-center gap-1 hover:text-white transition-colors"
                  >
                    Ngày tạo{getSortLabel('created_at')}
                    <ArrowUpDown size={13} />
                  </button>
                </th>
                <th className="px-6 py-4 font-semibold text-right">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="admin-transactions-tbody divide-y divide-slate-700/50">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-400">Đang tải dữ liệu...</td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-400">Không tìm thấy giao dịch nào.</td>
                </tr>
              ) : (
                paginatedData.map((txn) => (
                  <tr key={txn.id} className="hover:bg-slate-700/20 transition-colors">
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => copyTransactionId(txn.id)}
                        className="inline-flex items-center gap-2 rounded-lg px-2 py-1 font-mono text-xs text-slate-400 transition-colors hover:bg-indigo-500/10 hover:text-indigo-300"
                        title="Bấm để copy mã giao dịch đầy đủ"
                      >
                        {txn.id.split('-')[0].toUpperCase()}...
                        <Copy size={12} />
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{txn.fullName}</div>
                      <div className="text-xs text-slate-400">{txn.email}</div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-emerald-400">
                      {formatCurrency(txn.amount)}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(txn.status)}</td>
                    <td className="px-6 py-4 text-slate-400">
                      {formatDate(txn.created_at)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedTransaction(txn)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-700 bg-slate-900 text-slate-400 hover:text-white hover:border-indigo-500 hover:bg-indigo-500/10 transition-colors"
                        title="Xem chi tiết"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && filteredData.length > 0 && (
          <div className="admin-transactions-pagination px-4 py-3 border-t border-slate-700 bg-slate-800/50 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-400">
              Hiển thị {(currentPage - 1) * PAGE_SIZE + 1} - {Math.min(currentPage * PAGE_SIZE, filteredData.length)} trong {filteredData.length} giao dịch
            </p>

            <Pagination
              page={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {selectedTransaction && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-800 shadow-2xl shadow-black/40">
            <div className="relative border-b border-slate-700 bg-gradient-to-br from-indigo-600/25 via-slate-900 to-emerald-500/15 p-6">
              <button
                type="button"
                onClick={() => setSelectedTransaction(null)}
                className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>

              <div className="flex items-start gap-4 pr-10">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30">
                  <ReceiptText size={24} />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-emerald-300">Hóa đơn VIP</p>
                  <h2 className="mt-1 text-2xl font-bold text-white">Thanh toán thành công</h2>
                  <p className="mt-2 text-4xl font-extrabold text-emerald-300">
                    {formatCurrency(selectedTransaction.amount)}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">Gói Pro VIP · Almotion</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-300">Trạng thái giao dịch</span>
                  {getStatusBadge(selectedTransaction.status)}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3">
                  <span className="text-sm text-slate-400">Mã giao dịch</span>
                  <button
                    type="button"
                    onClick={() => copyTransactionId(selectedTransaction.id)}
                    className="inline-flex max-w-[280px] items-center gap-2 rounded-lg border border-slate-700 px-2.5 py-1.5 text-right font-mono text-xs text-slate-200 transition-colors hover:border-indigo-500 hover:bg-indigo-500/10 hover:text-white"
                    title="Copy mã giao dịch"
                  >
                    <span className="truncate">{selectedTransaction.id}</span>
                    <Copy size={14} className="shrink-0" />
                  </button>
                </div>

                <DetailRow label="Người dùng" value={selectedTransaction.fullName} />
                <DetailRow label="Email" value={selectedTransaction.email} />
                <DetailRow label="Ngày thanh toán" value={formatDate(selectedTransaction.created_at)} />
                <DetailRow label="User ID" value={selectedTransaction.user_id || 'N/A'} mono />
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedTransaction(null)}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
                >
                  Đóng hóa đơn
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function MiniSummaryCard({ label, value, tone = 'default' }) {
  const toneClass = {
    default: 'border-slate-700 bg-slate-800/50 text-white',
    success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
    warning: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
    danger: 'border-rose-500/20 bg-rose-500/10 text-rose-300',
    money: 'border-indigo-500/20 bg-indigo-500/10 text-indigo-200',
  }[tone];

  return (
    <div className={`admin-transactions-mini-card rounded-2xl border p-4 ${toneClass}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-2 truncate text-xl font-bold">{value}</p>
    </div>
  );
}

function DetailRow({ label, value, mono, highlight }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3">
      <span className="text-sm text-slate-400">{label}</span>
      <span className={`text-right text-sm ${mono ? 'font-mono text-xs' : 'font-medium'} ${highlight ? 'text-emerald-400' : 'text-white'}`}>
        {value}
      </span>
    </div>
  );
}

export default AdminTransactions;
