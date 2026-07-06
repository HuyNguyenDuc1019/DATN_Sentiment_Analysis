import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import TransactionHeader from '../../components/admin/transactions/TransactionHeader';
import TransactionSummaryCards from '../../components/admin/transactions/TransactionSummaryCards';
import TransactionToolbar from '../../components/admin/transactions/TransactionToolbar';
import TransactionsTable from '../../components/admin/transactions/TransactionsTable';
import TransactionDetailModal from '../../components/admin/transactions/TransactionDetailModal';
import Pagination from '../../components/ui/Pagination';

import {
  PAGE_SIZE,
  applyTransactionQuickFilter,
  buildTransactionSummary,
  exportTransactionsCsv,
  filterTransactions,
  formatCurrency,
  formatDate,
  getSortLabel,
  sortTransactions,
} from '../../utils/admin/transactionUtils';

import {
  copyTextToClipboard,
  fetchAdminTransactions,
} from '../../services/admin/transactionService';

export default function AdminTransactions() {
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
      const data = await fetchAdminTransactions();

      const formattedData = data.map((item) => ({
        ...item,
        email: item.profiles?.email || 'N/A',
        fullName: item.profiles?.full_name || 'N/A',
      }));

      setTransactions(formattedData);
    } catch (error) {
      console.error(error);
      toast.error('Không thể tải danh sách giao dịch.');
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

  const filteredData = useMemo(() => {
    const filtered = filterTransactions({
      transactions,
      searchTerm,
      statusFilter,
      startDateFilter,
      endDateFilter,
    });

    return sortTransactions(filtered, sortConfig);
  }, [transactions, searchTerm, statusFilter, startDateFilter, endDateFilter, sortConfig]);

  const summary = useMemo(() => buildTransactionSummary(filteredData), [filteredData]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));
  const paginatedData = filteredData.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const hasActiveFilter =
    searchTerm.trim() ||
    statusFilter !== 'all' ||
    startDateFilter ||
    endDateFilter;

  const handleRefresh = async () => {
    await fetchTransactions();
    toast.success('Đã làm mới dữ liệu giao dịch.');
  };

  const handleQuickFilter = (type) => {
    const next = applyTransactionQuickFilter(type);

    setQuickFilter(type);
    setStartDateFilter(next.startDate);
    setEndDateFilter(next.endDate);
  };

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

  const copyTransactionId = async (transactionId) => {
    try {
      await copyTextToClipboard(transactionId);
      toast.success('Đã copy mã giao dịch.');
    } catch {
      toast.error('Không thể copy mã giao dịch.');
    }
  };

  const exportCsv = () => {
    try {
      exportTransactionsCsv(filteredData);
      toast.success('Đã xuất file CSV giao dịch.');
    } catch (error) {
      toast.error(error.message || 'Không thể xuất CSV.');
    }
  };

  return (
    <div className="admin-transactions-page w-full p-6 lg:p-8">
      <TransactionHeader />

      <TransactionSummaryCards
        summary={summary}
        formatCurrency={formatCurrency}
      />

      <div className="admin-transactions-table-card bg-slate-800 border border-slate-700 rounded-2xl shadow-xl overflow-hidden">
        <TransactionToolbar
          searchTerm={searchTerm}
          statusFilter={statusFilter}
          startDateFilter={startDateFilter}
          endDateFilter={endDateFilter}
          quickFilter={quickFilter}
          hasActiveFilter={hasActiveFilter}
          isLoading={isLoading}
          canExport={filteredData.length > 0}
          onSearchChange={setSearchTerm}
          onStatusFilterChange={setStatusFilter}
          onStartDateFilterChange={setStartDateFilter}
          onEndDateFilterChange={setEndDateFilter}
          onQuickFilter={handleQuickFilter}
          onResetFilters={resetFilters}
          onExportCsv={exportCsv}
          onRefresh={handleRefresh}
        />

        <TransactionsTable
          isLoading={isLoading}
          filteredData={filteredData}
          paginatedData={paginatedData}
          sortConfig={sortConfig}
          onSort={handleSort}
          getSortLabel={(key) => getSortLabel(sortConfig, key)}
          onCopyTransactionId={copyTransactionId}
          onSelectTransaction={setSelectedTransaction}
        />

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
        <TransactionDetailModal
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
          onCopyTransactionId={copyTransactionId}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
        />
      )}
    </div>
  );
}
