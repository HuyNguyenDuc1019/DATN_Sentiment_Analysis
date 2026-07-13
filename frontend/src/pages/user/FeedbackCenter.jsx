import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { useAuth } from '../../contexts/AuthContext';

import FeedbackHeader from '../../components/user/feedback/FeedbackHeader';
import FeedbackToolbar from '../../components/user/feedback/FeedbackToolbar';
import BulkActions from '../../components/user/feedback/BulkActions';
import ReviewTaskPanel from '../../components/user/feedback/ReviewTaskPanel';
import QueuePanel from '../../components/user/feedback/QueuePanel';

import {
  PAGE_SIZE,
  PRIORITY_LIMIT,
  PRIORITY_SCAN_LIMIT,
  createFeedbackPayload,
  getIgnoredReviewIds,
  getSavedConfidenceThreshold,
  isLowConfidence,
  normalizeLabelToNumber,
  rememberIgnoredReview,
  saveConfidenceThreshold,
} from '../../utils/user/feedbackUtils';

import {
  fetchAllFeedbackQueue,
  fetchPriorityFeedbackQueue,
  submitReviewFeedback,
  submitReviewFeedbackBatch,
} from '../../services/user/feedbackService';

export default function FeedbackCenter() {
  const { user } = useAuth();

  const [mode, setMode] = useState('priority');
  const [queue, setQueue] = useState([]);
  const [selected, setSelected] = useState(0);
  const [corrected, setCorrected] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(0);
  const [totalRows, setTotalRows] = useState(0);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [labelFilter, setLabelFilter] = useState('all');
  const [confidenceThreshold, setConfidenceThreshold] = useState(() => getSavedConfidenceThreshold(user?.id));

  const pagePositiveCount = useMemo(
    () => queue.filter((review) => normalizeLabelToNumber(review.ai_label) === 1).length,
    [queue],
  );

  const pageNegativeCount = useMemo(
    () => queue.filter((review) => normalizeLabelToNumber(review.ai_label) === 0).length,
    [queue],
  );

  const visibleQueue = useMemo(() => {
    if (labelFilter === 'positive') {
      return queue.filter((review) => normalizeLabelToNumber(review.ai_label) === 1);
    }

    if (labelFilter === 'negative') {
      return queue.filter((review) => normalizeLabelToNumber(review.ai_label) === 0);
    }

    return queue;
  }, [queue, labelFilter]);

  const selectedReviews = useMemo(
    () => queue.filter((review) => selectedIds.has(review.id)),
    [queue, selectedIds],
  );

  const pageCount = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  const confidenceThresholdRatio = confidenceThreshold / 100;

  useEffect(() => {
    setConfidenceThreshold(getSavedConfidenceThreshold(user?.id));
  }, [user?.id]);

  useEffect(() => {
    saveConfidenceThreshold(user?.id, confidenceThreshold);
  }, [user?.id, confidenceThreshold]);

  const loadQueue = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);

    try {
      const ignoredIds = getIgnoredReviewIds(user.id);

      if (mode === 'priority') {
        const filteredQueue = await fetchPriorityFeedbackQueue({
          userId: user.id,
          ignoredIds,
          thresholdRatio: confidenceThresholdRatio,
          scanLimit: PRIORITY_SCAN_LIMIT,
          priorityLimit: PRIORITY_LIMIT,
        });

        setQueue(filteredQueue);
        setTotalRows(filteredQueue.length);
      } else {
        const { queue: nextQueue, count } = await fetchAllFeedbackQueue({
          userId: user.id,
          ignoredIds,
          page,
          pageSize: PAGE_SIZE,
        });

        setQueue(nextQueue);
        setTotalRows(count);
      }

      setSelected(0);
      setCorrected(null);
      setSelectedIds(new Set());
      setLabelFilter('all');
    } catch (error) {
      toast.error(error.message || 'Không tải được danh sách phản hồi.');
    } finally {
      setLoading(false);
    }
  }, [user?.id, mode, page, confidenceThresholdRatio]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const item = queue[selected];
  const selectedId = item?.id || null;

  const removeProcessedReviews = (ids) => {
    const idSet = new Set(ids);

    setQueue((current) => current.filter((review) => !idSet.has(review.id)));
    setSelectedIds((current) => {
      const next = new Set(current);
      ids.forEach((id) => next.delete(id));
      return next;
    });
    setSelected((current) => Math.max(0, Math.min(current, queue.length - ids.length - 1)));
    setCorrected(null);
    setReviewedCount((current) => current + ids.length);
  };

  const skipFeedback = () => {
    if (!item || !user?.id) return;

    rememberIgnoredReview(user.id, item.id);
    removeProcessedReviews([item.id]);
  };

  const acceptCurrentLabel = async () => {
    if (!item || !user?.id) return;

    const currentLabel = normalizeLabelToNumber(item.ai_label);

    setSaving(true);

    try {
      await submitReviewFeedback(createFeedbackPayload(item, user.id, currentLabel, 'confirmed'));

      toast.success('Đã xác nhận kết quả AI.');
      removeProcessedReviews([item.id]);
    } catch (error) {
      toast.error(error.message || 'Không lưu được xác nhận.');
    } finally {
      setSaving(false);
    }
  };

  const saveFeedback = async () => {
    if (!item || !user?.id) return;

    if (corrected === null) {
      toast.error('Vui lòng chọn đánh giá đúng trước khi gửi.');
      return;
    }

    setSaving(true);

    try {
      await submitReviewFeedback(createFeedbackPayload(item, user.id, corrected, 'corrected'));

      toast.success('Đã lưu đính chính thành công!');
      removeProcessedReviews([item.id]);
    } catch (error) {
      toast.error(error.message || 'Không lưu được đính chính.');
    } finally {
      setSaving(false);
    }
  };

  const toggleSelected = (reviewId) => {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (next.has(reviewId)) {
        next.delete(reviewId);
      } else {
        next.add(reviewId);
      }

      return next;
    });
  };

  const toggleSelectAllPage = () => {
    setSelectedIds((current) => {
      const allSelected = visibleQueue.length > 0 && visibleQueue.every((review) => current.has(review.id));

      if (allSelected) {
        const next = new Set(current);
        visibleQueue.forEach((review) => next.delete(review.id));
        return next;
      }

      const next = new Set(current);
      visibleQueue.forEach((review) => next.add(review.id));
      return next;
    });
  };

  const submitFeedbacksBatch = async (reviews, getPayload, successMessage) => {
    if (!user?.id || !reviews.length) return;

    setSaving(true);

    try {
      await submitReviewFeedbackBatch(reviews.map(getPayload));

      toast.success(successMessage);
      removeProcessedReviews(reviews.map((review) => review.id));
    } catch (error) {
      toast.error(error.message || 'Không xử lý được các phản hồi đã chọn.');
    } finally {
      setSaving(false);
    }
  };

  const acceptSelectedAsCorrect = async () => {
    await submitFeedbacksBatch(
      selectedReviews,
      (review) => createFeedbackPayload(
        review,
        user.id,
        normalizeLabelToNumber(review.ai_label),
        'confirmed',
      ),
      `Đã xác nhận ${selectedReviews.length} phản hồi AI đúng.`,
    );
  };

  const acceptWholePageAsCorrect = async () => {
    await submitFeedbacksBatch(
      visibleQueue,
      (review) => createFeedbackPayload(
        review,
        user.id,
        normalizeLabelToNumber(review.ai_label),
        'confirmed',
      ),
      `Đã xác nhận ${visibleQueue.length} phản hồi đang hiển thị.`,
    );
  };

  const correctSelectedAs = async (label) => {
    await submitFeedbacksBatch(
      selectedReviews,
      (review) => createFeedbackPayload(review, user.id, label, 'corrected'),
      `Đã sửa ${selectedReviews.length} phản hồi đã chọn.`,
    );
  };

  const skipSelected = () => {
    if (!user?.id || !selectedReviews.length) return;

    selectedReviews.forEach((review) => rememberIgnoredReview(user.id, review.id));
    removeProcessedReviews(selectedReviews.map((review) => review.id));
    toast.success(`Đã bỏ qua ${selectedReviews.length} phản hồi.`);
  };

  const changeMode = (nextMode) => {
    setMode(nextMode);
    setPage(0);
    setSelected(0);
    setCorrected(null);
    setSelectedIds(new Set());
    setLabelFilter('all');
  };

  const canGoPrevious = mode === 'all' && page > 0;
  const canGoNext = mode === 'all' && page + 1 < pageCount;

  const selectReviewById = (reviewId) => {
    const realIndex = queue.findIndex((review) => review.id === reviewId);

    if (realIndex >= 0) {
      setSelected(realIndex);
      setCorrected(null);
    }
  };

  const changeLabelFilter = (nextFilter) => {
    setLabelFilter(nextFilter);
    setCorrected(null);

    const nextVisibleQueue =
      nextFilter === 'positive'
        ? queue.filter((review) => normalizeLabelToNumber(review.ai_label) === 1)
        : nextFilter === 'negative'
          ? queue.filter((review) => normalizeLabelToNumber(review.ai_label) === 0)
          : queue;

    if (nextVisibleQueue.length) {
      const realIndex = queue.findIndex((review) => review.id === nextVisibleQueue[0].id);
      setSelected(realIndex >= 0 ? realIndex : 0);
    } else {
      setSelected(0);
    }
  };

  const updateConfidenceThreshold = (nextValue) => {
    setConfidenceThreshold(nextValue);
    setPage(0);
    setSelected(0);
    setCorrected(null);
    setSelectedIds(new Set());
    setLabelFilter('all');
  };

  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col overflow-visible p-4 font-sans animate-in fade-in duration-500 lg:p-6">
      <FeedbackHeader />

      <FeedbackToolbar
        mode={mode}
        page={page}
        pageCount={pageCount}
        totalRows={totalRows}
        confidenceThreshold={confidenceThreshold}
        onModeChange={changeMode}
        onConfidenceThresholdChange={updateConfidenceThreshold}
      />

      {mode === 'all' && (
        <BulkActions
          queue={queue}
          visibleQueue={visibleQueue}
          selectedIds={selectedIds}
          selectedReviews={selectedReviews}
          labelFilter={labelFilter}
          pagePositiveCount={pagePositiveCount}
          pageNegativeCount={pageNegativeCount}
          saving={saving}
          canGoPrevious={canGoPrevious}
          canGoNext={canGoNext}
          onLabelFilterChange={changeLabelFilter}
          onToggleSelectAllPage={toggleSelectAllPage}
          onAcceptWholePageAsCorrect={acceptWholePageAsCorrect}
          onAcceptSelectedAsCorrect={acceptSelectedAsCorrect}
          onCorrectSelectedAs={correctSelectedAs}
          onSkipSelected={skipSelected}
          onPreviousPage={() => setPage((current) => Math.max(0, current - 1))}
          onNextPage={() => setPage((current) => current + 1)}
        />
      )}

      <div className="grid flex-1 grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col lg:col-span-2">
          <ReviewTaskPanel
            item={item}
            corrected={corrected}
            setCorrected={setCorrected}
            onSave={saveFeedback}
            onAcceptAI={acceptCurrentLabel}
            onSkip={skipFeedback}
            loading={loading}
            saving={saving}
            confidenceThresholdRatio={confidenceThresholdRatio}
          />
        </div>

        <div className="flex min-w-0 flex-col lg:col-span-1">
          <QueuePanel
            queue={visibleQueue}
            selectedIds={selectedIds}
            selectedId={selectedId}
            loading={loading}
            reviewedCount={reviewedCount}
            mode={mode}
            confidenceThreshold={confidenceThreshold}
            setSelectedById={selectReviewById}
            toggleSelected={toggleSelected}
          />
        </div>
      </div>
    </div>
  );
}
