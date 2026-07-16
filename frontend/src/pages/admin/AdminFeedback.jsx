import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { logAdminActivity } from '../../services/adminActivityLogger';

import AdminFeedbackHeader from '../../components/admin/feedback/AdminFeedbackHeader';
import FeedbackStatsCards from '../../components/admin/feedback/FeedbackStatsCards';
import PrioritySuggestions from '../../components/admin/feedback/PrioritySuggestions';
import FeedbackToolbar from '../../components/admin/feedback/FeedbackToolbar';
import AdvancedFilters from '../../components/admin/feedback/AdvancedFilters';
import BulkActionBar from '../../components/admin/feedback/BulkActionBar';
import FeedbackTable from '../../components/admin/feedback/FeedbackTable';
import FeedbackDetailModal from '../../components/admin/feedback/FeedbackDetailModal';
import PaginationControls from '../../components/admin/feedback/PaginationControls';

import { getErrorMessage, normalizeStatus } from '../../utils/admin/feedbackUtils';

import {
  bulkReviewFeedback,
  exportRetrainDataset,
  exportSelectedFeedback,
  fetchAdminFeedbackPage,
  fetchAdminFeedbackStats,
  fetchFeedbackDetail,
  getAdminId,
  reviewFeedback,
  reviewFeedbackDetailed,
} from '../../services/admin/feedbackService';


const PAGE_SIZE = 50;
const EMPTY_STATS = {
  total: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
  confident_wrong: 0,
  long_content: 0,
  duplicate_groups: 0,
};


export default function AdminFeedback() {
  const [items, setItems] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [stats, setStats] = useState(EMPTY_STATS);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [updatingId, setUpdatingId] = useState('');

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [confidenceFilter, setConfidenceFilter] = useState('all');
  const [mismatchFilter, setMismatchFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const [page, setPage] = useState(1);
  const [cursor, setCursor] = useState(null);
  const [cursorHistory, setCursorHistory] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkAction, setBulkAction] = useState('');
  const [bulkReason, setBulkReason] = useState('');
  const [bulkNewLabel, setBulkNewLabel] = useState('1');
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [isExportingSelected, setIsExportingSelected] = useState(false);

  const [modalItem, setModalItem] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalReason, setModalReason] = useState('');
  const [modalNewLabel, setModalNewLabel] = useState('');
  const [modalSubmittingAction, setModalSubmittingAction] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setCursor(null);
      setCursorHistory([]);
      setNextCursor(null);
      setHasMore(false);
      setSelectedIds(new Set());
      setDebouncedSearch(search.trim());
    }, 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  const filters = useMemo(() => ({
    search: debouncedSearch,
    status: statusFilter,
    confidence: confidenceFilter,
    mismatch: mismatchFilter,
    dateFrom,
    dateTo,
    priority: priorityFilter,
  }), [
    debouncedSearch,
    statusFilter,
    confidenceFilter,
    mismatchFilter,
    dateFrom,
    dateTo,
    priorityFilter,
  ]);

  const resetPagination = useCallback(() => {
    setPage(1);
    setCursor(null);
    setCursorHistory([]);
    setNextCursor(null);
    setHasMore(false);
    setSelectedIds(new Set());
  }, []);

  const loadFeedback = useCallback(async () => {
    setIsLoading(true);

    try {
      const adminId = await getAdminId();
      const result = await fetchAdminFeedbackPage({
        adminId,
        filters,
        cursor,
        limit: PAGE_SIZE,
      });

      const mappedProfiles = {};
      const formattedItems = (result.items || []).map((item) => {
        if (item.profiles) mappedProfiles[item.user_id] = item.profiles;
        const cleanItem = { ...item };
        delete cleanItem.profiles;
        return cleanItem;
      });

      setItems(formattedItems);
      setProfiles(mappedProfiles);
      setHasMore(Boolean(result.has_more));
      setNextCursor(result.next_cursor || null);
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Lỗi tải phản hồi admin:', error);
      toast.error(error.message || 'Không thể tải danh sách phản hồi.');
      setItems([]);
      setProfiles({});
    } finally {
      setIsLoading(false);
    }
  }, [filters, cursor]);

  const loadStats = useCallback(async () => {
    try {
      const adminId = await getAdminId();
      const nextStats = await fetchAdminFeedbackStats(adminId);
      setStats({ ...EMPTY_STATS, ...nextStats });
    } catch (error) {
      console.error('Lỗi tải thống kê feedback:', error);
    }
  }, []);

  useEffect(() => {
    loadFeedback();
  }, [loadFeedback]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const refreshAll = async () => {
    await Promise.all([loadFeedback(), loadStats()]);
  };

  const priorityStats = useMemo(() => ({
    confidentWrongCount: Number(stats.confident_wrong || 0),
    longContentCount: Number(stats.long_content || 0),
    duplicateGroupCount: Number(stats.duplicate_groups || 0),
  }), [stats]);

  const resetFilters = () => {
    resetPagination();
    setSearch('');
    setStatusFilter('pending');
    setConfidenceFilter('all');
    setMismatchFilter('all');
    setDateFrom('');
    setDateTo('');
    setPriorityFilter('all');
  };

  const applyPriorityFilter = (type) => {
    resetPagination();
    setPriorityFilter(type);
    setSearch('');
    setStatusFilter('all');
    setConfidenceFilter('all');
    setMismatchFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  const handleReview = async (item, action) => {
    const currentStatus = normalizeStatus(item.status);
    if (currentStatus !== 'pending') {
      toast.error('Phản hồi này đã được xử lý.');
      return;
    }

    setUpdatingId(item.id);

    try {
      const adminId = await getAdminId();
      const response = await reviewFeedback({ adminId, feedbackId: item.id, action });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(getErrorMessage(error, 'Không thể xử lý phản hồi.'));
      }

      if (statusFilter === 'pending') {
        setItems((current) => current.filter((feedback) => feedback.id !== item.id));
      } else {
        const nextStatus = action === 'approve' ? 'approved' : 'rejected';
        setItems((current) => current.map((feedback) => (
          feedback.id === item.id ? { ...feedback, status: nextStatus } : feedback
        )));
      }

      toast.success(action === 'approve' ? 'Đã duyệt phản hồi.' : 'Đã từ chối phản hồi.');
      loadStats();

      logAdminActivity({
        actionType: action === 'approve' ? 'feedback_approved' : 'feedback_rejected',
        targetType: 'feedback',
        targetId: item.id,
        description: `${action === 'approve' ? 'duyệt' : 'từ chối'} phản hồi`,
      });
    } catch (error) {
      toast.error(error.message || 'Không thể xử lý phản hồi.');
    } finally {
      setUpdatingId('');
    }
  };

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const adminId = await getAdminId();
      const response = await exportRetrainDataset(adminId);
      if (!response.ok) throw new Error('Không thể xuất dataset.');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `phobert_retrain_dataset_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Xuất Dataset AI thành công!');
    } catch (error) {
      toast.error(error.message || 'Không thể xuất dataset.');
    } finally {
      setIsExporting(false);
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const isAllFilteredSelected = items.length > 0 && items.every((item) => selectedIds.has(item.id));

  const toggleSelectAll = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      items.forEach((item) => {
        if (isAllFilteredSelected) next.delete(item.id);
        else next.add(item.id);
      });
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const submitBulkAction = async (action) => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;

    if ((action === 'reject' || action === 'edit_label') && !bulkReason.trim()) {
      toast.error('Vui lòng nhập lý do trước khi thực hiện.');
      return;
    }

    setIsBulkSubmitting(true);

    try {
      const adminId = await getAdminId();
      const response = await bulkReviewFeedback({
        adminId,
        feedbackIds: ids,
        action,
        reason: bulkReason,
        newLabel: bulkNewLabel,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(getErrorMessage(error, 'Không thể xử lý hàng loạt.'));
      }

      toast.success(`Đã xử lý ${ids.length} phản hồi bằng một request.`);
      logAdminActivity({
        actionType: `feedback_bulk_${action}`,
        targetType: 'feedback',
        targetId: null,
        description: `thực hiện ${action} hàng loạt trên ${ids.length} phản hồi`,
      });
      clearSelection();
      setBulkAction('');
      setBulkReason('');
      await refreshAll();
    } catch (error) {
      toast.error(error.message || 'Không thể xử lý hàng loạt.');
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  const handleExportSelected = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;

    setIsExportingSelected(true);

    try {
      const adminId = await getAdminId();
      const response = await exportSelectedFeedback({ adminId, feedbackIds: ids });
      if (!response.ok) throw new Error('Không thể xuất các phản hồi đã chọn.');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `feedback_selected_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Xuất CSV thành công!');
    } catch (error) {
      toast.error(error.message || 'Không thể xuất CSV.');
    } finally {
      setIsExportingSelected(false);
    }
  };

  const goNextPage = () => {
    if (!hasMore || !nextCursor) return;
    setCursorHistory((current) => [...current, cursor]);
    setCursor(nextCursor);
    setPage((current) => current + 1);
  };

  const goPreviousPage = () => {
    if (!cursorHistory.length) return;
    const previousCursor = cursorHistory[cursorHistory.length - 1];
    setCursorHistory((current) => current.slice(0, -1));
    setCursor(previousCursor);
    setPage((current) => Math.max(1, current - 1));
  };

  const openDetailModal = async (item) => {
    setModalItem({ ...item, review_history: [] });
    setModalReason('');
    setModalNewLabel(String(item.corrected_label ?? ''));
    setModalLoading(true);

    try {
      const adminId = await getAdminId();
      const detail = await fetchFeedbackDetail({ adminId, feedbackId: item.id });
      setModalItem({ ...item, ...detail, ai_confidence: detail.ai_confidence ?? item.ai_confidence });
      setModalNewLabel(String(detail.corrected_label ?? ''));
    } catch {
      toast.error('Không thể tải chi tiết phản hồi này.');
    } finally {
      setModalLoading(false);
    }
  };

  const closeModal = () => {
    setModalItem(null);
    setModalReason('');
    setModalNewLabel('');
    setModalSubmittingAction('');
  };

  const submitModalAction = async (action) => {
    if (!modalItem) return;

    if ((action === 'reject' || action === 'edit_label') && !modalReason.trim()) {
      toast.error('Vui lòng nhập lý do trước khi thực hiện.');
      return;
    }

    setModalSubmittingAction(action);

    try {
      const adminId = await getAdminId();
      const response = await reviewFeedbackDetailed({
        adminId,
        feedbackId: modalItem.id,
        action,
        reason: modalReason,
        newLabel: modalNewLabel,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(getErrorMessage(error, 'Không thể xử lý phản hồi.'));
      }

      toast.success('Đã cập nhật phản hồi.');
      closeModal();
      await refreshAll();
    } catch (error) {
      toast.error(error.message || 'Không thể xử lý phản hồi.');
    } finally {
      setModalSubmittingAction('');
    }
  };

  return (
    <div className="space-y-6 p-8 font-sans animate-in fade-in duration-500">
      <AdminFeedbackHeader
        isLoading={isLoading}
        isExporting={isExporting}
        onRefresh={refreshAll}
        onExport={handleExport}
      />

      <FeedbackStatsCards stats={stats} isLoading={isLoading} />

      <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-800/50 backdrop-blur-md">
        <PrioritySuggestions
          priorityStats={priorityStats}
          priorityFilter={priorityFilter}
          onApplyPriorityFilter={applyPriorityFilter}
          onClearPriorityFilter={() => {
            resetPagination();
            setPriorityFilter('all');
          }}
        />

        <FeedbackToolbar
          isLoading={isLoading}
          count={items.length}
          search={search}
          statusFilter={statusFilter}
          showAdvancedFilters={showAdvancedFilters}
          onSearchChange={setSearch}
          onStatusFilterChange={(value) => {
            resetPagination();
            setStatusFilter(value);
          }}
          onToggleAdvancedFilters={() => setShowAdvancedFilters((current) => !current)}
        />

        {showAdvancedFilters && (
          <AdvancedFilters
            confidenceFilter={confidenceFilter}
            mismatchFilter={mismatchFilter}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onConfidenceFilterChange={(value) => {
              resetPagination();
              setConfidenceFilter(value);
            }}
            onMismatchFilterChange={(value) => {
              resetPagination();
              setMismatchFilter(value);
            }}
            onDateFromChange={(value) => {
              resetPagination();
              setDateFrom(value);
            }}
            onDateToChange={(value) => {
              resetPagination();
              setDateTo(value);
            }}
            onResetFilters={resetFilters}
          />
        )}

        {selectedIds.size > 0 && (
          <BulkActionBar
            selectedCount={selectedIds.size}
            bulkAction={bulkAction}
            bulkReason={bulkReason}
            bulkNewLabel={bulkNewLabel}
            isBulkSubmitting={isBulkSubmitting}
            isExportingSelected={isExportingSelected}
            onBulkActionChange={setBulkAction}
            onBulkReasonChange={setBulkReason}
            onBulkNewLabelChange={setBulkNewLabel}
            onSubmitBulkAction={submitBulkAction}
            onExportSelected={handleExportSelected}
            onClearSelection={clearSelection}
          />
        )}

        <FeedbackTable
          isLoading={isLoading}
          filteredItems={items}
          paginatedItems={items}
          profiles={profiles}
          updatingId={updatingId}
          selectedIds={selectedIds}
          isAllFilteredSelected={isAllFilteredSelected}
          onToggleSelectAll={toggleSelectAll}
          onToggleSelectOne={toggleSelectOne}
          onOpenDetailModal={openDetailModal}
          onReview={handleReview}
        />

        {!isLoading && items.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-slate-700/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-400">
              Trang <span className="font-semibold text-slate-200">{page}</span> · đang hiển thị{' '}
              <span className="font-semibold text-slate-200">{items.length}</span> phản hồi
              {hasMore ? ' · còn dữ liệu' : ' · trang cuối'}
            </p>

            <PaginationControls
              page={page}
              canPrevious={cursorHistory.length > 0}
              canNext={hasMore && Boolean(nextCursor)}
              onPrevious={goPreviousPage}
              onNext={goNextPage}
            />
          </div>
        )}
      </div>

      {modalItem && (
        <FeedbackDetailModal
          modalItem={modalItem}
          modalLoading={modalLoading}
          modalReason={modalReason}
          modalNewLabel={modalNewLabel}
          modalSubmittingAction={modalSubmittingAction}
          onClose={closeModal}
          onReasonChange={setModalReason}
          onNewLabelChange={setModalNewLabel}
          onSubmitAction={submitModalAction}
        />
      )}
    </div>
  );
}
