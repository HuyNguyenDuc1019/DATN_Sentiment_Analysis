import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Radar as RadarIcon, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend as RechartsLegend,
  Tooltip as RechartsTooltip,
} from 'recharts';

import { useAuth } from '../../contexts/AuthContext';

import CompareHeader from '../../components/user/compare/CompareHeader';
import RestaurantFormPanel from '../../components/user/compare/RestaurantFormPanel';
import ConclusionPanel from '../../components/user/compare/ConclusionPanel';
import RestaurantScoreCard from '../../components/user/compare/RestaurantScoreCard';
import ComparisonTable from '../../components/user/compare/ComparisonTable';
import CompareHistoryPanel from '../../components/user/compare/CompareHistoryPanel';

import {
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

// Bảng màu cho tối đa 3 quán trên biểu đồ
const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b'];
const COMPARE_DRAFT_VERSION = 1;

function getCompareDraftKey(userId) {
  return `almotion:compare:draft:v${COMPARE_DRAFT_VERSION}:${userId}`;
}

function getEmptyRestaurants() {
  return [{ ...EMPTY_RESTAURANT }, { ...EMPTY_RESTAURANT }];
}

export default function RestaurantCompare() {
  const { user } = useAuth();

  const [restaurants, setRestaurants] = useState(getEmptyRestaurants);
  const [results, setResults] = useState([]);
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [comparisonHistory, setComparisonHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);
  const [deletingHistoryId, setDeletingHistoryId] = useState(null);

  const compareAbortRef = useRef(null);
  const isMountedRef = useRef(true);

  // Restore the latest comparison for each signed-in account.
  useEffect(() => {
    if (!user?.id) {
      setHasRestoredDraft(false);
      return;
    }

    setHasRestoredDraft(false);

    try {
      const rawDraft = localStorage.getItem(getCompareDraftKey(user.id));
      const draft = rawDraft ? JSON.parse(rawDraft) : null;
      const savedRestaurants = Array.isArray(draft?.restaurants)
        ? draft.restaurants.slice(0, 3)
        : [];

      if (savedRestaurants.length >= 2) {
        setRestaurants(savedRestaurants.map((item) => ({
          name: String(item?.name || ''),
          url: String(item?.url || ''),
        })));
      } else {
        setRestaurants(getEmptyRestaurants());
      }

      setResults(Array.isArray(draft?.results) ? draft.results.slice(0, 3) : []);
      setExpandedHistoryId(draft?.expandedHistoryId || null);
    } catch (error) {
      console.warn('Could not restore the latest comparison:', error);
      localStorage.removeItem(getCompareDraftKey(user.id));
      setRestaurants(getEmptyRestaurants());
      setResults([]);
      setExpandedHistoryId(null);
    } finally {
      setHasRestoredDraft(true);
    }
  }, [user?.id]);

  // Persist form inputs and the latest real comparison while navigating.
  useEffect(() => {
    if (!user?.id || !hasRestoredDraft) return;

    try {
      localStorage.setItem(getCompareDraftKey(user.id), JSON.stringify({
        restaurants,
        results,
        expandedHistoryId,
        updatedAt: new Date().toISOString(),
      }));
    } catch (error) {
      console.warn('Could not save the current comparison:', error);
    }
  }, [user?.id, hasRestoredDraft, restaurants, results, expandedHistoryId]);

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

  // --- Logic chuyển đổi dữ liệu cho Biểu đồ Radar ---
  const radarChartData = useMemo(() => {
    if (!results || results.length === 0) return [];
    
    // Lấy danh sách khía cạnh từ quán đầu tiên (vì các quán sẽ trả về key giống nhau)
    const firstAspects = results[0].aspects || {};
    const aspectKeys = Object.keys(firstAspects);
    
    // Format dữ liệu: [{ aspect: 'Món ăn', QuanA: 85, QuanB: 70 }, ...]
    return aspectKeys.map((key) => {
      const row = { aspect: key };
      results.forEach((res, index) => {
        // Lấy điểm positive của từng quán theo khía cạnh
        row[`restaurant${index}`] = res.aspects?.[key]?.positive || 0;
      });
      return row;
    });
  }, [results]);
  // ------------------------------------------------

  const updateRestaurant = (index, field, value) => {
    setRestaurants((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item;

        const nextItem = {
          ...item,
          [field]: value,
        };

        if (field === 'url' && !item.name.trim() && value.trim()) {
          const fallbackName = `Quán ${String.fromCharCode(65 + index)}`;
          const inferredName = inferRestaurantNameFromUrl(value, fallbackName);

          if (inferredName && inferredName !== fallbackName) {
            nextItem.name = inferredName;
          }
        }

        return nextItem;
      }),
    );
  };

  const addRestaurant = () => {
    if (restaurants.length >= 3) {
      toast('Chỉ so sánh tối đa 3 quán/lần để kết quả dễ đọc.');
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

  const loadComparisonHistory = useCallback(async () => {
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
  }, [user?.id]);

  useEffect(() => {
    loadComparisonHistory();
  }, [loadComparisonHistory]);

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

    const restoredRestaurants = items
      .slice(0, 3)
      .map((item, index) => ({
        name: String(item?.restaurant_name || `Quán ${String.fromCharCode(65 + index)}`),
        url: String(item?.source_url || ''),
      }));

    if (restoredRestaurants.length >= 2) {
      setRestaurants(restoredRestaurants);
    }
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

      toast.error(error.message || 'Không thể lấy dữ liệu thật để so sánh.');
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
    setRestaurants(getEmptyRestaurants());
    setResults([]);
  };

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500 font-sans">
      <CompareHeader
        results={results}
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
          {/* --- BẮT ĐẦU BLOCK MỚI: PHÂN TÍCH KHÍA CẠNH & KẾT LUẬN THÔNG MINH --- */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            
            {/* Cột 1: Biểu đồ Radar */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 shadow-xl">
              <div className="mb-4 flex items-center gap-2">
                <RadarIcon className="h-5 w-5 text-indigo-400" />
                <h3 className="font-bold text-white">So sánh Khía Cạnh (Tỉ lệ khen)</h3>
              </div>
              <div className="h-[350px] w-full">
                {radarChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarChartData}>
                      <PolarGrid stroke="#334155" />
                      <PolarAngleAxis dataKey="aspect" tick={{ fill: '#94a3b8', fontSize: 13 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#64748b' }} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '8px' }}
                        itemStyle={{ color: '#e2e8f0' }}
                        formatter={(value, name) => [`${value}% Tích cực`, results[name.replace('restaurant', '')]?.restaurant_name || name]}
                      />
                      <RechartsLegend wrapperStyle={{ paddingTop: '20px' }} />
                      
                      {results.map((res, index) => (
                        <Radar
                          key={`radar-${index}`}
                          name={res.restaurant_name || `Quán ${index + 1}`}
                          dataKey={`restaurant${index}`}
                          stroke={CHART_COLORS[index % CHART_COLORS.length]}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                          fillOpacity={0.4}
                        />
                      ))}
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-500">
                    Chưa có dữ liệu khía cạnh
                  </div>
                )}
              </div>
            </div>

            {/* Cột 2: Lời khuyên thông minh */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 shadow-xl">
              <div className="mb-6 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-400" />
                <h3 className="font-bold text-white">Kết luận Trí tuệ Nhân tạo</h3>
              </div>
              
              <div className="space-y-4">
                {results.map((item, index) => (
                  <div 
                    key={`rec-${index}`} 
                    className="relative overflow-hidden rounded-xl border border-slate-700/50 bg-slate-800/30 p-5 transition-all hover:bg-slate-800/50"
                  >
                    <div 
                      className="absolute left-0 top-0 h-full w-1"
                      style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                    />
                    <h4 className="mb-2 font-semibold text-white" style={{ color: CHART_COLORS[index % CHART_COLORS.length] }}>
                      {item.restaurant_name}
                    </h4>
                    <p className="text-sm leading-relaxed text-slate-300">
                      {item.recommendation || "Chưa có đủ dữ liệu để đưa ra nhận xét chi tiết cho quán này."}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            
          </div>
          {/* --- KẾT THÚC BLOCK MỚI --- */}

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

    </div>
     );
}
