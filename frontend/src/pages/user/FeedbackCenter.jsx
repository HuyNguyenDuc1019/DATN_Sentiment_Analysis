import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { useAuth } from '../../contexts/AuthContext';

import FeedbackHeader from '../../components/user/feedback/FeedbackHeader';
import FeedbackToolbar from '../../components/user/feedback/FeedbackToolbar';
import BulkActions from '../../components/user/feedback/BulkActions';
import ReviewTaskPanel from '../../components/user/feedback/ReviewTaskPanel';
import QueuePanel from '../../components/user/feedback/QueuePanel';

import {
  PAGE_SIZE,
  createFeedbackPayload,
  getSavedConfidenceThreshold,
  normalizeLabelToNumber,
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
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(0);
  const [cursor, setCursor] = useState(null);
  const [cursorHistory, setCursorHistory] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [labelFilter, setLabelFilter] = useState('all');
  const [confidenceThreshold, setConfidenceThreshold] = useState(
    () => getSavedConfidenceThreshold(user?.id),
  );

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
      const result = mode === 'priority'
        ? await fetchPriorityFeedbackQueue({
          userId: user.id,
          thresholdRatio: confidenceThresholdRatio,
          pageSize: PAGE_SIZE,
        })
        : await fetchAllFeedbackQueue({
          userId: user.id,
          cursor,
          pageSize: PAGE_SIZE,
        });

      setQueue(result.queue);
      setHasMore(result.hasMore);
      setNextCursor(result.nextCursor);
      setSelected(0);
      setSelectedIds(new Set());
      setLabelFilter('all');
    } catch (error) {
      toast.error(error.message || 'Không tải được danh sách phản hồi.');
    } finally {
      setLoading(false);
    }
  }, [user?.id, mode, cursor, confidenceThresholdRatio]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const item = queue[selected];
  const selectedId = item?.id || null;

  const removeProcessedReviews = (ids) => {
    const idSet = new Set(ids);
    const remaining = queue.filter((review) => !idSet.has(review.id));

    setQueue(remaining);
    setSelectedIds((current) => {
      const next = new Set(current);
      ids.forEach((id) => next.delete(id));
      return next;
    });
    setSelected((current) => Math.max(0, Math.min(current, remaining.length - 1)));
    setReviewedCount((current) => current + ids.length);

    if (remaining.length === 0) {
      window.setTimeout(loadQueue, 0);
    }
  };

  const saveCurrent = async (payload, successMessage) => {
    if (!item) return;

    setSaving(true);

    try {
      await submitReviewFeedback(payload);
      toast.success(successMessage);
      removeProcessedReviews([item.id]);
    } catch (error) {
      toast.error(error.message || 'Không lưu được phản hồi.');
    } finally {
      setSaving(false);
    }
  };

  const acceptCurrentLabel = async () => {
    if (!item || !user?.id) return;

    const currentLabel = normalizeLabelToNumber(item.ai_label);
    await saveCurrent(
      createFeedbackPayload(item, user.id, currentLabel, 'confirmed'),
      'Đã xác nhận kết quả AI.',
    );
  };

  const correctCurrentLabel = async () => {
    if (!item || !user?.id) return;

    const currentLabel = normalizeLabelToNumber(item.ai_label);
    const correctedLabel = currentLabel === 1 ? 0 : 1;

    await saveCurrent(
      createFeedbackPayload(item, user.id, correctedLabel, 'corrected'),
      `Đã sửa thành ${correctedLabel === 1 ? 'Hài lòng' : 'Chưa hài lòng'}.`,
    );
  };

  const skipFeedback = async () => {
    if (!item || !user?.id) return;

    const currentLabel = normalizeLabelToNumber(item.ai_label);
    await saveCurrent(
      createFeedbackPayload(item, user.id, currentLabel, 'skipped'),
      'Đã bỏ qua bình luận.',
    );
  };

  const toggleSelected = (reviewId) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      next.has(reviewId) ? next.delete(reviewId) : next.add(reviewId);
      return next;
    });
  };

  const toggleSelectAllPage = () => {
    setSelectedIds((current) => {
      const allSelected = visibleQueue.length > 0
        && visibleQueue.every((review) => current.has(review.id));
      const next = new Set(current);

      visibleQueue.forEach((review) => {
        if (allSelected) next.delete(review.id);
        else next.add(review.id);
      });

      return next;
    });
  };

  const submitFeedbacksAsBatch = async (reviews, getPayload, successMessage) => {
    if (!user?.id || !reviews.length) return;

    setSaving(true);

    try {
      const payloads = reviews.map(getPayload);
      await submitReviewFeedbackBatch(payloads);
      toast.success(successMessage);
      removeProcessedReviews(reviews.map((review) => review.id));
    } catch (error) {
      toast.error(error.message || 'Không xử lý được lô phản hồi.');
    } finally {
      setSaving(false);
    }
  };

  const acceptSelectedAsCorrect = async () => {
    await submitFeedbacksAsBatch(
      selectedReviews,
      (review) => createFeedbackPayload(
        review,
        user.id,
        normalizeLabelToNumber(review.ai_label),
        'confirmed',
      ),
      `Đã xác nhận ${selectedReviews.length} phản hồi.`,
    );
  };

  const acceptWholePageAsCorrect = async () => {
    await submitFeedbacksAsBatch(
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
    await submitFeedbacksAsBatch(
      selectedReviews,
      (review) => createFeedbackPayload(review, user.id, label, 'corrected'),
      `Đã sửa ${selectedReviews.length} phản hồi đã chọn.`,
    );
  };

  const skipSelected = async () => {
    await submitFeedbacksAsBatch(
      selectedReviews,
      (review) => createFeedbackPayload(
        review,
        user.id,
        normalizeLabelToNumber(review.ai_label),
        'skipped',
      ),
      `Đã bỏ qua ${selectedReviews.length} phản hồi.`,
    );
  };

  const resetPagination = () => {
    setPage(0);
    setCursor(null);
    setCursorHistory([]);
    setNextCursor(null);
    setHasMore(false);
  };

  const changeMode = (nextMode) => {
    setMode(nextMode);
    resetPagination();
    setSelected(0);
    setSelectedIds(new Set());
    setLabelFilter('all');
  };

  const goToNextPage = () => {
    if (!hasMore || !nextCursor) return;

    setCursorHistory((current) => [...current, cursor]);
    setCursor(nextCursor);
    setPage((current) => current + 1);
  };

  const goToPreviousPage = () => {
    if (!cursorHistory.length) return;

    const previousCursor = cursorHistory[cursorHistory.length - 1];
    setCursorHistory((current) => current.slice(0, -1));
    setCursor(previousCursor);
    setPage((current) => Math.max(0, current - 1));
  };

  const selectReviewById = (reviewId) => {
    const realIndex = queue.findIndex((review) => review.id === reviewId);
    if (realIndex >= 0) setSelected(realIndex);
  };

  const changeLabelFilter = (nextFilter) => {
    setLabelFilter(nextFilter);

    const nextVisibleQueue = nextFilter === 'positive'
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
    resetPagination();
    setSelected(0);
    setSelectedIds(new Set());
    setLabelFilter('all');
  };

  const canGoPrevious = mode === 'all' && cursorHistory.length > 0;
  const canGoNext = mode === 'all' && hasMore && Boolean(nextCursor);

  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col overflow-visible p-4 font-sans animate-in fade-in duration-500 lg:p-6">
      <FeedbackHeader />

      <FeedbackToolbar
        mode={mode}
        page={page}
        pageRows={queue.length}
        hasMore={hasMore}
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
          onPreviousPage={goToPreviousPage}
          onNextPage={goToNextPage}
        />
      )}

      <div className="grid flex-1 grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col lg:col-span-2">
          <ReviewTaskPanel
            item={item}
            onAcceptAI={acceptCurrentLabel}
            onCorrectAI={correctCurrentLabel}
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
            setSelectedById={selectReviewById}
            toggleSelected={toggleSelected}
          />
        </div>
      </div>
    </div>
  );
}
