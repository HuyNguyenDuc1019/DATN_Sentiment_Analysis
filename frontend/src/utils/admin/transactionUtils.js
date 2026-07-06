export const PAGE_SIZE = 5;

export function getStatusLabel(status) {
  switch (status) {
    case 'paid':
      return 'Thành công';
    case 'cancelled':
      return 'Đã hủy';
    default:
      return 'Đang xử lý';
  }
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(Number(amount || 0));
}

export function formatDate(value) {
  if (!value) return 'N/A';
  return new Date(value).toLocaleString('vi-VN');
}

export function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function applyTransactionQuickFilter(type) {
  const now = new Date();

  if (type === 'today') {
    const today = toDateInputValue(now);

    return {
      startDate: today,
      endDate: today,
    };
  }

  if (type === '7days') {
    const start = new Date(now);
    start.setDate(now.getDate() - 6);

    return {
      startDate: toDateInputValue(start),
      endDate: toDateInputValue(now),
    };
  }

  if (type === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);

    return {
      startDate: toDateInputValue(start),
      endDate: toDateInputValue(now),
    };
  }

  return {
    startDate: '',
    endDate: '',
  };
}

export function isInDateRange(value, startDateFilter, endDateFilter) {
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
}

export function filterTransactions({
  transactions,
  searchTerm,
  statusFilter,
  startDateFilter,
  endDateFilter,
}) {
  const keyword = searchTerm.trim().toLowerCase();

  return transactions.filter((transaction) => {
    const matchKeyword =
      transaction.id.toLowerCase().includes(keyword) ||
      transaction.email.toLowerCase().includes(keyword) ||
      transaction.fullName.toLowerCase().includes(keyword);

    const matchStatus = statusFilter === 'all' || transaction.status === statusFilter;
    const matchDate = isInDateRange(transaction.created_at, startDateFilter, endDateFilter);

    return matchKeyword && matchStatus && matchDate;
  });
}

export function sortTransactions(transactions, sortConfig) {
  return [...transactions].sort((a, b) => {
    const direction = sortConfig.direction === 'asc' ? 1 : -1;

    if (sortConfig.key === 'amount') {
      return (Number(a.amount || 0) - Number(b.amount || 0)) * direction;
    }

    const aTime = new Date(a.created_at || 0).getTime();
    const bTime = new Date(b.created_at || 0).getTime();

    return (aTime - bTime) * direction;
  });
}

export function buildTransactionSummary(filteredData) {
  const paidItems = filteredData.filter((item) => item.status === 'paid');

  return {
    total: filteredData.length,
    paid: paidItems.length,
    pending: filteredData.filter((item) => item.status !== 'paid' && item.status !== 'cancelled').length,
    cancelled: filteredData.filter((item) => item.status === 'cancelled').length,
    revenue: paidItems.reduce((sum, item) => sum + Number(item.amount || 0), 0),
  };
}

export function getSortLabel(sortConfig, key) {
  if (sortConfig.key !== key) return '';

  return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
}

export function exportTransactionsCsv(filteredData) {
  if (!filteredData.length) {
    throw new Error('Không có dữ liệu để xuất CSV.');
  }

  const headers = ['Mã giao dịch', 'Người dùng', 'Email', 'Số tiền', 'Trạng thái', 'Ngày tạo'];
  const rows = filteredData.map((transaction) => [
    transaction.id,
    transaction.fullName,
    transaction.email,
    Number(transaction.amount || 0),
    getStatusLabel(transaction.status),
    formatDate(transaction.created_at),
  ]);

  const escapeCsv = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const csvContent = [headers, ...rows]
    .map((row) => row.map(escapeCsv).join(','))
    .join('\n');

  const blob = new Blob(['\ufeff' + csvContent], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().slice(0, 10);
  const link = document.createElement('a');

  link.href = url;
  link.download = `giao-dich-vip-${date}.csv`;
  link.click();

  URL.revokeObjectURL(url);
}
