import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Crown, Loader2, RefreshCw, Save } from 'lucide-react';
import toast from 'react-hot-toast';

import UpgradeModal from '../../components/common/UpgradeModal';
import { useAuth } from '../../contexts/AuthContext';

import CompareHeader from '../../components/user/compare/CompareHeader';
import RestaurantFormPanel from '../../components/user/compare/RestaurantFormPanel';
import ConclusionPanel from '../../components/user/compare/ConclusionPanel';
import RestaurantScoreCard from '../../components/user/compare/RestaurantScoreCard';
import ComparisonTable from '../../components/user/compare/ComparisonTable';
import CompareHistoryPanel from '../../components/user/compare/CompareHistoryPanel';

import {
  DEMO_RESULT,
  EMPTY_RESTAURANT,
  buildRecommendationSummary,
  getComparableUrl,
  inferRestaurantNameFromUrl,
  normalizeUrl,
} from '../../utils/user/compareUtils';

import {
  compareRestaurants,
  deleteComparisonHistory,
  fetchComparisonHistory,
  saveComparison,
} from '../../services/user/compareService';

export default function RestaurantCompare() {
  const { user, userProfile, refreshUserProfile } = useAuth();
  const isVip = userProfile?.tier === 'vip';

  const [restaurants, setRestaurants] = useState([
    { ...EMPTY_RESTAURANT },
    { ...EMPTY_RESTAURANT },
  ]);
  const [results, setResults] = useState([]);
  const [isComparing, setIsComparing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [comparisonHistory, setComparisonHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);
  const [deletingHistoryId, setDeletingHistoryId] = useState(null);

  const compareAbortRef = useRef(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;

      if (compareAbortRef.current) {
        compareAbortRef.current.abort();
        compareAbortRef.current = null;
      }
    };
  }, []);

  const summary = useMemo(() => buildRecommendationSummary(results), [results]);
  const canCompare = restaurants.filter((item) => normalizeUrl(item.url)).length >= 2;

  const updateRestaurant = (index, field, value) => {
    setRestaurants((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  };

  const addRestaurant = () => {
    if (restaurants.length >= 3) {
      toast('Chỉ so sánh tối đa 3 quán/lần để kết quả dễ đọc.');
      return;
    }

    if (!isVip) {
      toast.error('Gói Free chỉ so sánh tối đa 2 quán. Nâng cấp VIP để so sánh 3 quán.');
      setIsUpgradeModalOpen(true);
      return;
    }

    setRestaurants((current) => [...current, { ...EMPTY_RESTAURANT }]);
  };

  const removeRestaurant = (index) => {
    if (restaurants.length <= 2) {
      toast('Cần ít nhất 2 quán để so sánh.');
      return;
    }

    setRestaurants((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const loadComparisonHistory = async () => {
    if (!user?.id) return;

    try {
      setIsLoadingHistory(true);

      const data = await fetchComparisonHistory(user.id);
      setComparisonHistory(data);
    } catch (error) {
      console.warn(error);
    } finally {
      if (isMountedRef.current) {
        setIsLoadingHistory(false);
      }
    }
  };

  useEffect(() => {
    loadComparisonHistory();
  }, [user?.id]);

  const stopCompare = () => {
    if (compareAbortRef.current) {
      compareAbortRef.current.abort();
      compareAbortRef.current = null;
    }

    setIsComparing(false);
    toast('Đã dừng so sánh ở giao diện.');
  };

  const deleteHistoryItem = async (comparisonId) => {
    if (!user?.id || !comparisonId) return;

    try {
      setDeletingHistoryId(comparisonId);

      await deleteComparisonHistory({
        userId: user.id,
        comparisonId,
      });

      setComparisonHistory((current) => current.filter((item) => item.id !== comparisonId));

      if (expandedHistoryId === comparisonId) {
        setExpandedHistoryId(null);
      }

      toast.success('Đã xóa lịch sử so sánh.');
    } catch (error) {
      toast.error(error.message || 'Không thể xóa lịch sử so sánh.');
    } finally {
      setDeletingHistoryId(null);
    }
  };

  const loadHistoryResult = (session) => {
    const items = Array.isArray(session?.items) ? session.items : [];

    if (!items.length) {
      toast.error('Lịch sử này chưa có dữ liệu chi tiết.');
      return;
    }

    setResults(items);
    toast.success('Đã mở lại kết quả so sánh đã lưu.');
  };

  const handleCompare = async () => {
    if (!user?.id) {
      toast.error('Vui lòng đăng nhập trước khi so sánh quán.');
      return;
    }

    const payloadItems = restaurants
      .map((item, index) => {
        const url = normalizeUrl(item.url);
        const name = item.name.trim() || inferRestaurantNameFromUrl(url, `Quán ${String.fromCharCode(65 + index)}`);

        return { name, url };
      })
      .filter((item) => item.url);

    const comparableUrls = payloadItems.map((item) => getComparableUrl(item.url));
    const hasDuplicateUrl = comparableUrls.some((url, index) => comparableUrls.indexOf(url) !== index);

    if (hasDuplicateUrl) {
      toast.error('Hai quán không được dùng cùng một đường dẫn.');
      return;
    }

    if (payloadItems.length < 2) {
      toast.error('Vui lòng nhập ít nhất 2 link quán.');
      return;
    }

    if (!isVip && payloadItems.length > 2) {
      toast.error('Gói Free chỉ so sánh tối đa 2 quán.');
      setIsUpgradeModalOpen(true);
      return;
    }

    let controller = null;

    try {
      if (compareAbortRef.current) {
        compareAbortRef.current.abort();
      }

      controller = new AbortController();
      compareAbortRef.current = controller;

      setIsComparing(true);

      const nextResults = await compareRestaurants({
        userId: user.id,
        restaurants: payloadItems,
        signal: controller.signal,
      });

      if (!isMountedRef.current || controller.signal.aborted) return;

      setResults(nextResults);
      toast.success('Đã so sánh xong các quán.');
    } catch (error) {
      if (error.name === 'AbortError') return;
      if (!isMountedRef.current) return;

      console.warn(error);
      setResults(DEMO_RESULT);
      toast.error(error.message || 'Backend so sánh chưa sẵn sàng. Đang hiển thị dữ liệu mẫu.');
    } finally {
      if (isMountedRef.current && compareAbortRef.current === controller) {
        setIsComparing(false);
        compareAbortRef.current = null;
      }
    }
  };

  const handleSaveComparison = async () => {
    if (!user?.id) {
      toast.error('Vui lòng đăng nhập trước khi lưu so sánh.');
      return;
    }

    if (!results.length) {
      toast.error('Chưa có kết quả so sánh để lưu.');
      return;
    }

    if (!isVip) {
      toast.error('Lưu lịch sử so sánh là tính năng VIP.');
      setIsUpgradeModalOpen(true);
      return;
    }

    try {
      setIsSaving(true);

      await saveComparison({
        userId: user.id,
        title: `So sánh ${results.length} quán - ${new Date().toLocaleDateString('vi-VN')}`,
        items: results,
      });

      toast.success('Đã lưu kết quả so sánh.');
      loadComparisonHistory();
    } catch (error) {
      toast.error(error.message || 'Không thể lưu kết quả so sánh.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (compareAbortRef.current) {
      compareAbortRef.current.abort();
      compareAbortRef.current = null;
    }

    setIsComparing(false);
    setExpandedHistoryId(null);
    setRestaurants([{ ...EMPTY_RESTAURANT }, { ...EMPTY_RESTAURANT }]);
    setResults([]);
  };

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500 font-sans">
      <CompareHeader
        results={results}
        isVip={isVip}
        isSaving={isSaving}
        onReset={handleReset}
        onSaveComparison={handleSaveComparison}
      />

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
        <RestaurantFormPanel
          restaurants={restaurants}
          canCompare={canCompare}
          isComparing={isComparing}
          onAddRestaurant={addRestaurant}
          onRemoveRestaurant={removeRestaurant}
          onUpdateRestaurant={updateRestaurant}
          onCompare={handleCompare}
          onStopCompare={stopCompare}
        />

        <ConclusionPanel summary={summary} />
      </section>

      {results.length > 0 && (
        <section className="space-y-6">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            {results.map((item, index) => (
              <RestaurantScoreCard
                key={`${item.source_url || 'restaurant'}-${index}`}
                item={item}
                index={index}
              />
            ))}
          </div>

          <ComparisonTable items={results} />
        </section>
      )}

      <CompareHistoryPanel
        comparisonHistory={comparisonHistory}
        isLoadingHistory={isLoadingHistory}
        expandedHistoryId={expandedHistoryId}
        deletingHistoryId={deletingHistoryId}
        onRefresh={loadComparisonHistory}
        onLoadHistoryResult={loadHistoryResult}
        onToggleExpanded={setExpandedHistoryId}
        onDeleteHistoryItem={deleteHistoryItem}
      />

      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        onUpgraded={refreshUserProfile}
      />
    </div>
  );
}
