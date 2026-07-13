import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

import {
  ITEMS_PER_PAGE,
  getConfidenceBucket,
  getErrorMessage,
  getPriorityStats,
  isFeedbackMismatch,
  normalizeStatus,
} from '../../utils/admin/feedbackUtils';

import {
  autoReviewSafeFeedback,
  bulkReviewFeedback,
  exportRetrainDataset,
  exportSelectedFeedback,
  fetchAdminFeedback,
  fetchFeedbackConfidenceMap,
  fetchFeedbackDetail,
  getAdminId,
  reviewFeedback,
  reviewFeedbackDetailed,
} from '../../services/admin/feedbackService';

export default function AdminFeedback() {
  const [items, setItems] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isAutoReviewing, setIsAutoReviewing] = useState(false);
  const [updatingId, setUpdatingId] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [page, setPage] = useState(1);

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [confidenceFilter, setConfidenceFilter] = useState('all');
  const [mismatchFilter, setMismatchFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');

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

  const confidenceMergedRef = useRef(false);

  const loadFeedback = useCallback(async () => {
    setIsLoading(true);

    try {
      const adminId = await getAdminId();
      const data = await fetchAdminFeedback(adminId);

      const formattedItems = [];
      const mappedProfiles = {};

      data.forEach((item) => {
        if (item.profiles) {
          mappedProfiles[item.user_id] = item.profiles;
        }

        const { profiles: _profiles, ...cleanItem } = item;
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

  useEffect(() => {
    if (isLoading) {
      confidenceMergedRef.current = false;
      return;
    }

    if (confidenceMergedRef.current || items.length === 0) return;

    const mergeConfidence = async () => {
      try {
        const adminId = await getAdminId();
        const map = await fetchFeedbackConfidenceMap(adminId);

        setItems((current) =>
          current.map((item) => (map[item.id] !== undefined ? { ...item, ai_confidence: map[item.id] } : item)),
        );
      } catch (error) {
        console.error('Lỗi tải confidence map:', error);
      } finally {
        confidenceMergedRef.current = true;
      }
    };

    mergeConfidence();
  }, [isLoading, items.length]);

  const stats = useMemo(() => {
    const pending = items.filter((item) => normalizeStatus(item.status) === 'pending').length;
    const approved = items.filter((item) => normalizeStatus(item.status) === 'approved').length;
    const rejected = items.filter((item) => normalizeStatus(item.status) === 'rejected').length;

    return {
      total: items.length,
      pending,
      approved,
      rejected,
    };
  }, [items]);

  const priorityStats = useMemo(() => getPriorityStats(items), [items]);

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const searchTokens = normalizedSearch
      ? normalizedSearch.split(',').map((token) => token.trim()).filter(Boolean)
      : [];

    return items.filter((item) => {
      const profile = profiles[item.user_id] || {};
      const haystack = [item.original_content, profile.full_name, profile.email]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchSearch = searchTokens.length
        ? searchTokens.some((token) => haystack.includes(token))
        : true;

      const matchStatus = statusFilter === 'all' ? true : normalizeStatus(item.status) === statusFilter;
      const matchConfidence = confidenceFilter === 'all' ? true : getConfidenceBucket(item) === confidenceFilter;

      const matchMismatch =
        mismatchFilter === 'all'
          ? true
          : mismatchFilter === 'mismatch'
            ? isFeedbackMismatch(item)
            : !isFeedbackMismatch(item);

      let matchDate = true;

      if ((dateFrom || dateTo) && item.created_at) {
        const itemDate = new Date(item.created_at);
        if (dateFrom) matchDate = matchDate && itemDate >= new Date(dateFrom);
        if (dateTo) matchDate = matchDate && itemDate <= new Date(`${dateTo}T23:59:59`);
      }

      let matchPriority = true;

      if (priorityFilter === 'confident_wrong') {
        const value = item.ai_confidence;
        const confidence = value === null || value === undefined ? 0 : value <= 1 ? value * 100 : value;
        matchPriority = isFeedbackMismatch(item) && confidence >= 80;
      }

      if (priorityFilter === 'long_content') {
        matchPriority = (item.original_content || '').trim().length >= 80;
      }

      if (priorityFilter === 'duplicate') {
        matchPriority = priorityStats.duplicateIds.has(item.id);
      }

      return matchSearch && matchStatus && matchConfidence && matchMismatch && matchDate && matchPriority;
    });
  }, [items, profiles, search, statusFilter, confidenceFilter, mismatchFilter, dateFrom, dateTo, priorityFilter, priorityStats]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));

  const paginatedItems = useMemo(() => {
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredItems, page]);

  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
  }, [search, statusFilter, confidenceFilter, mismatchFilter, dateFrom, dateTo, priorityFilter]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('pending');
    setConfidenceFilter('all');
    setMismatchFilter('all');
    setDateFrom('');
    setDateTo('');
    setPriorityFilter('all');
  };

  const applyPriorityFilter = (type) => {
    setPriorityFilter(type);
    setSearch('');
    setStatusFilter('all');
    setConfidenceFilter('all');
    setMismatchFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  const handleAutoReview = async () => {
    if (isAutoReviewing) return;

    setIsAutoReviewing(true);

    try {
      const adminId = await getAdminId();
      const result = await autoReviewSafeFeedback({ adminId, limit: 1000 });

      toast.success(
        result.auto_approved > 0
          ? `Đã tự động duyệt ${result.auto_approved} phản hồi an toàn. Còn ${result.requires_audit} phản hồi cần kiểm tra.`
          : `Không có phản hồi an toàn để tự duyệt. Còn ${result.requires_audit || 0} phản hồi cần kiểm tra.`,
        { id: 'admin-feedback-auto-review' },
      );

      logAdminActivity({
        actionType: 'feedback_auto_review',
        targetType: 'feedback',
        description: `Tự động duyệt ${result.auto_approved || 0}/${result.scanned || 0} phản hồi an toàn`,
      });

      await loadFeedback();
    } catch (error) {
      console.error('Lỗi tự động xử lý phản hồi:', error);
      toast.error(error.message || 'Không thể tự động xử lý phản hồi.', {
        id: 'admin-feedback-auto-review-error',
      });
    } finally {
      setIsAutoReviewing(false);
    }
  };

  const handleReview = async (item, action) => {
  const currentStatus = normalizeStatus(item.status);

  if (currentStatus === 'approved') {
    toast.error('Phản hồi này đã được duyệt trước đó.', {
      id: `admin-feedback-already-approved-${item.id}`,
    });
    return;
  }

  if (currentStatus === 'rejected') {
    toast.error('Phản hồi này đã bị từ chối trước đó.', {
      id: `admin-feedback-already-rejected-${item.id}`,
    });
    return;
  }

  const status = action === 'approve' ? 'approved' : 'rejected';
  const actionText = action === 'approve' ? 'duyệt' : 'từ chối';

  setUpdatingId(item.id);

  try {
    const adminId = await getAdminId();

    const response = await reviewFeedback({
      adminId,
      feedbackId: item.id,
      action,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => null);
      throw new Error(getErrorMessage(err, 'Không thể duyệt phản hồi.'));
    }

    setItems((current) =>
      current.map((feedback) =>
        feedback.id === item.id
          ? {
              ...feedback,
              status,
            }
          : feedback,
      ),
    );

    toast.success(`Đã ${actionText} phản hồi thành công!`, {
      id: `admin-feedback-${action}-${item.id}`,
    });

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

  const handleExport = async () => {
    try {
      setIsExporting(true);

      const adminId = await getAdminId();
      const response = await exportRetrainDataset(adminId);

      if (!response.ok) {
        let message = 'Lỗi khi tải file từ Server';

        try {
          const errorData = await response.json();
          message = errorData.detail || message;
        } catch {
          message = response.statusText || message;
        }

        throw new Error(message);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = `phobert_retrain_dataset_${new Date().toISOString().slice(0, 10)}.csv`;

      document.body.appendChild(link);
      link.click();

      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Xuất Dataset AI thành công!', {
        id: 'admin-feedback-export-success',
      });

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

  const toggleSelectOne = (id) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isAllFilteredSelected = paginatedItems.length > 0 && paginatedItems.every((item) => selectedIds.has(item.id));

  const toggleSelectAll = () => {
    setSelectedIds((current) => {
      if (isAllFilteredSelected) {
        const next = new Set(current);
        paginatedItems.forEach((item) => next.delete(item.id));
        return next;
      }

      const next = new Set(current);
      paginatedItems.forEach((item) => next.add(item.id));
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const submitBulkAction = async (action) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    if ((action === 'reject' || action === 'edit_label') && !bulkReason.trim()) {
      toast.error('Vui lòng nhập lý do trước khi thực hiện.', {
        id: 'bulk-reason-required',
      });
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
        const err = await response.json().catch(() => null);
        throw new Error(getErrorMessage(err, 'Lỗi server'));
      }

      if (action === 'delete') {
        setItems((current) => current.filter((item) => !ids.includes(item.id)));
      } else if (action === 'edit_label') {
        setItems((current) =>
          current.map((item) => (ids.includes(item.id) ? { ...item, corrected_label: Number(bulkNewLabel) } : item)),
        );
      } else {
        const status = action === 'approve' ? 'approved' : 'rejected';
        setItems((current) => current.map((item) => (ids.includes(item.id) ? { ...item, status } : item)));
      }

      toast.success(`Đã xử lý ${ids.length} phản hồi thành công!`, {
        id: 'bulk-action-success',
      });

      logAdminActivity({
        actionType: `feedback_bulk_${action}`,
        targetType: 'feedback',
        targetId: null,
        description: `thực hiện "${action}" hàng loạt trên ${ids.length} phản hồi`,
      });

      clearSelection();
      setBulkAction('');
      setBulkReason('');
    } catch (error) {
      console.error('Lỗi bulk action:', error);
      toast.error(`Thất bại: ${error.message}`, {
        id: 'bulk-action-error',
      });
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  const handleExportSelected = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setIsExportingSelected(true);

    try {
      const adminId = await getAdminId();
      const response = await exportSelectedFeedback({
        adminId,
        feedbackIds: ids,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(getErrorMessage(err, 'Lỗi khi tải file'));
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = `feedback_selected_${new Date().toISOString().slice(0, 10)}.csv`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);

      toast.success('Xuất CSV các mục đã chọn thành công!', {
        id: 'export-selected-success',
      });
    } catch (error) {
      console.error('Lỗi xuất CSV đã chọn:', error);
      toast.error(`Thất bại: ${error.message}`, {
        id: 'export-selected-error',
      });
    } finally {
      setIsExportingSelected(false);
    }
  };

  const openDetailModal = async (item) => {
    setModalItem({ ...item, review_history: [] });
    setModalReason('');
    setModalNewLabel(String(item.corrected_label ?? ''));
    setModalLoading(true);

    try {
      const adminId = await getAdminId();
      const detail = await fetchFeedbackDetail({
        adminId,
        feedbackId: item.id,
      });

      setModalItem({
        ...item,
        ...detail,
        ai_confidence: detail.ai_confidence ?? item.ai_confidence,
      });

      setModalNewLabel(String(detail.corrected_label ?? ''));
    } catch (error) {
      console.error('Lỗi tải chi tiết:', error);
      toast.error('Không thể tải chi tiết phản hồi này.', {
        id: 'modal-detail-load-error',
      });
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
      toast.error('Vui lòng nhập lý do trước khi thực hiện.', {
        id: 'modal-reason-required',
      });
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
        const err = await response.json().catch(() => null);
        throw new Error(getErrorMessage(err, 'Lỗi server'));
      }

      const actionText = action === 'approve' ? 'duyệt' : action === 'reject' ? 'từ chối' : 'sửa nhãn';

      setItems((current) =>
        current.map((feedback) => {
          if (feedback.id !== modalItem.id) return feedback;
          if (action === 'edit_label') return { ...feedback, corrected_label: Number(modalNewLabel) };
          return { ...feedback, status: action === 'approve' ? 'approved' : 'rejected' };
        }),
      );

      setModalItem((current) => ({
        ...current,
        status: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : current.status,
        corrected_label: action === 'edit_label' ? Number(modalNewLabel) : current.corrected_label,
        review_history: [
          ...(current.review_history || []),
          {
            admin_id: adminId,
            action,
            reason: modalReason || null,
            new_label: action === 'edit_label' ? Number(modalNewLabel) : null,
            timestamp: new Date().toISOString(),
          },
        ],
      }));

      toast.success(`Đã ${actionText} phản hồi thành công!`, {
        id: `modal-${action}-success`,
      });

      logAdminActivity({
        actionType: `feedback_${action}`,
        targetType: 'feedback',
        targetId: modalItem.id,
        description: `${actionText} phản hồi qua modal chi tiết (lý do: ${modalReason || 'không có'})`,
      });

      setModalReason('');
    } catch (error) {
      console.error('Lỗi xử lý trong modal:', error);
      toast.error(`Thất bại: ${error.message}`, {
        id: 'modal-action-error',
      });
    } finally {
      setModalSubmittingAction('');
    }
  };

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500 font-sans">
      <AdminFeedbackHeader
        isLoading={isLoading}
        isExporting={isExporting}
        isAutoReviewing={isAutoReviewing}
        onRefresh={loadFeedback}
        onExport={handleExport}
        onAutoReview={handleAutoReview}
      />

      <FeedbackStatsCards
        stats={stats}
        isLoading={isLoading}
      />

      <div className="rounded-2xl border border-slate-700 bg-slate-800/50 backdrop-blur-md overflow-hidden">
        <PrioritySuggestions
          priorityStats={priorityStats}
          priorityFilter={priorityFilter}
          onApplyPriorityFilter={applyPriorityFilter}
          onClearPriorityFilter={() => setPriorityFilter('all')}
        />

        <FeedbackToolbar
          isLoading={isLoading}
          count={filteredItems.length}
          search={search}
          statusFilter={statusFilter}
          showAdvancedFilters={showAdvancedFilters}
          onSearchChange={setSearch}
          onStatusFilterChange={setStatusFilter}
          onToggleAdvancedFilters={() => setShowAdvancedFilters((current) => !current)}
        />

        {showAdvancedFilters && (
          <AdvancedFilters
            confidenceFilter={confidenceFilter}
            mismatchFilter={mismatchFilter}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onConfidenceFilterChange={setConfidenceFilter}
            onMismatchFilterChange={setMismatchFilter}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
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
          filteredItems={filteredItems}
          paginatedItems={paginatedItems}
          profiles={profiles}
          updatingId={updatingId}
          selectedIds={selectedIds}
          isAllFilteredSelected={isAllFilteredSelected}
          onToggleSelectAll={toggleSelectAll}
          onToggleSelectOne={toggleSelectOne}
          onOpenDetailModal={openDetailModal}
          onReview={handleReview}
        />

        {!isLoading && filteredItems.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-slate-700/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-400">
              Hiển thị <span className="font-semibold text-slate-200">{(page - 1) * ITEMS_PER_PAGE + 1}</span> -{' '}
              <span className="font-semibold text-slate-200">{Math.min(page * ITEMS_PER_PAGE, filteredItems.length)}</span> /{' '}
              <span className="font-semibold text-slate-200">{filteredItems.length}</span> phản hồi
            </p>

            <PaginationControls
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
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
