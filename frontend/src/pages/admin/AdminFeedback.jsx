import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2, ChevronLeft, ChevronRight, Download, Filter, RefreshCw, Search, XCircle,
  // ====== MỚI: icon cho modal chi tiết, bulk actions, filter nâng cao ======
  X, Eye, Trash2, History, SlidersHorizontal, AlertTriangle, Edit3,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../services/supabaseClient';
import { logAdminActivity } from '../../services/adminActivityLogger';

// ====== Chức năng dữ liệu giữ nguyên từ file Feedback (Supabase) ======

const STATUS_LABEL = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Đã từ chối',
};

const normalizeStatus = (status) => status || 'pending';

// ====== MỚI: hằng số cho bộ lọc nâng cao ======
const CONFIDENCE_BUCKETS = {
  all: 'Tất cả độ tin cậy',
  high: '≥ 80%',
  mid: '50% - 79%',
  low: '< 50%',
  unknown: 'Không rõ',
};

const MISMATCH_OPTIONS = {
  all: 'Tất cả',
  mismatch: 'Hệ thống sai (khác nhãn admin)',
  match: 'Hệ thống đúng (trùng nhãn admin)',
};

const ITEMS_PER_PAGE = 10;
const WINDOW_SIZE = 3;

const getPageItems = (currentPage, totalPages) => {
  if (totalPages <= WINDOW_SIZE + 1) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  let start = currentPage;
  let end = Math.min(start + WINDOW_SIZE - 1, totalPages);

  if (end - start + 1 < WINDOW_SIZE) {
    start = Math.max(1, end - WINDOW_SIZE + 1);
  }

  const items = [];
  for (let pageNumber = start; pageNumber <= end; pageNumber += 1) {
    items.push(pageNumber);
  }

  if (end < totalPages - 1) {
    items.push('dots-right');
    items.push(totalPages);
  } else if (end < totalPages) {
    items.push(totalPages);
  }

  return items;
};

const PaginationControls = ({ page, totalPages, onPageChange }) => {
  const safeTotalPages = Math.max(1, totalPages || 1);
  const safePage = Math.min(Math.max(1, page || 1), safeTotalPages);
  const pageItems = getPageItems(safePage, safeTotalPages);

  const goToPage = (nextPage) => {
    const boundedPage = Math.min(Math.max(1, nextPage), safeTotalPages);
    if (boundedPage !== safePage) {
      onPageChange(boundedPage);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <button
        type="button"
        onClick={() => goToPage(safePage - 1)}
        disabled={safePage <= 1}
        className="flex h-9 min-w-9 items-center justify-center rounded-lg border border-slate-700 px-2 text-slate-300 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        title="Trang trước"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {pageItems.map((item) =>
        typeof item === 'string' ? (
          <span key={item} className="flex h-9 min-w-9 items-center justify-center px-1 text-slate-500">
            ...
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => goToPage(item)}
            className={`flex h-9 min-w-9 items-center justify-center rounded-lg border px-3 text-sm font-semibold transition-colors ${
              item === safePage
                ? 'border-indigo-500 bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
            aria-current={item === safePage ? 'page' : undefined}
          >
            {item}
          </button>
        )
      )}

      <button
        type="button"
        onClick={() => goToPage(safePage + 1)}
        disabled={safePage >= safeTotalPages}
        className="flex h-9 min-w-9 items-center justify-center rounded-lg border border-slate-700 px-2 text-slate-300 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        title="Trang sau"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
};

const AdminFeedback = () => {
  const [items, setItems] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [updatingId, setUpdatingId] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [page, setPage] = useState(1);

  // ====== MỚI: state cho bộ lọc nâng cao ======
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [confidenceFilter, setConfidenceFilter] = useState('all');
  const [mismatchFilter, setMismatchFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
// all | confident_wrong | long_content | duplicate
  // ====== MỚI: state cho chọn nhiều dòng (bulk actions) ======
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkAction, setBulkAction] = useState(''); // '' | 'edit_label' | 'reject'
  const [bulkReason, setBulkReason] = useState('');
  const [bulkNewLabel, setBulkNewLabel] = useState('1');
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [isExportingSelected, setIsExportingSelected] = useState(false);
  
  // ====== MỚI: state cho Modal chi tiết phản hồi ======
  const [modalItem, setModalItem] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalReason, setModalReason] = useState('');
  const [modalNewLabel, setModalNewLabel] = useState('');
  const [modalSubmittingAction, setModalSubmittingAction] = useState('');

// ====== 1. HÀM LOAD DỮ LIỆU ĐÃ CHUYỂN QUA GỌI API BACKEND ======
  const loadFeedback = useCallback(async () => {
    setIsLoading(true);
    try {
      // Lấy ID người dùng trực tiếp từ hệ thống bảo mật của Supabase (Thay vì localStorage)
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError || !authData?.user) {
        throw new Error("Không tìm thấy thông tin đăng nhập (Phiên hết hạn)!");
      }

      const adminId = authData.user.id;

      const res = await fetch(`http://localhost:8000/api/admin/feedback?admin_id=${adminId}`);
      if (!res.ok) throw new Error('Lỗi server');
      
      const data = await res.json();
      
      // Xử lý dữ liệu trả về từ API (đã được Backend join sẵn bảng profiles)
      const formattedItems = [];
      const mappedProfiles = {};

      data.forEach(item => {
        // Tách phần profiles ra để lưu riêng vào state cho code bên dưới chạy khớp
        if (item.profiles) {
           mappedProfiles[item.user_id] = item.profiles;
        }
        // Xóa thuộc tính profiles để item trở về chuẩn cũ
        const { profiles, ...cleanItem } = item;
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

  // ====== MỚI (Cách A): sau khi loadFeedback (cũ) tải xong danh sách, gọi thêm API
  //         confidence-map để lấy độ tin cậy (join qua scraped_review_id) rồi merge
  //         vào items. Hoàn toàn tách biệt, không sửa 1 dòng nào của loadFeedback cũ. ======
  const confidenceMergedRef = useRef(false);

  useEffect(() => {
    if (isLoading) {
      confidenceMergedRef.current = false;
      return;
    }
    if (confidenceMergedRef.current || items.length === 0) return;

    const mergeConfidence = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const adminId = authData?.user?.id;
        if (!adminId) return;

        const res = await fetch(`http://localhost:8000/api/admin/feedback/confidence-map?admin_id=${adminId}`);
        if (!res.ok) return;
        const map = await res.json();

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

    return { total: items.length, pending, approved, rejected };
  }, [items]);
 
  // ====== MỚI: các hàm phụ trợ dùng chung cho filter/modal/table ======
  const isMismatch = (item) => item.old_ai_label !== item.corrected_label;
   const priorityStats = useMemo(() => {
  const normalizeText = (value) => (value || '').trim().toLowerCase();

  const duplicateMap = items.reduce((map, item) => {
    const key = normalizeText(item.original_content);
    if (!key) return map;

    map[key] = map[key] || {
      text: item.original_content,
      count: 0,
      ids: [],
    };

    map[key].count += 1;
    map[key].ids.push(item.id);

    return map;
  }, {});

  const duplicateGroups = Object.values(duplicateMap)
    .filter((group) => group.count >= 2)
    .sort((a, b) => b.count - a.count);

  const duplicateIds = new Set(
    duplicateGroups.flatMap((group) => group.ids),
  );

  const confidentWrongItems = items.filter((item) => {
    const value = item.ai_confidence;
    if (value === null || value === undefined) return false;

    const confidence = value <= 1 ? value * 100 : value;

    return isMismatch(item) && confidence >= 80;
  });

  const longContentItems = items.filter((item) => {
    const content = item.original_content || '';
    return content.trim().length >= 80;
  });

  return {
    confidentWrong: confidentWrongItems,
    longContent: longContentItems,
    duplicateGroups,
    duplicateIds,
  };
}, [items]);
  const getConfidenceBucket = (item) => {
    const value = item.ai_confidence;
    if (value === null || value === undefined) return 'unknown';
    const pct = value <= 1 ? value * 100 : value;
    if (pct >= 80) return 'high';
    if (pct >= 50) return 'mid';
    return 'low';
  };

  // ====== Lọc: giữ nguyên logic search/status cũ, MỚI: thêm nhiều email, độ tin cậy, sai khác, khoảng ngày ======
  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    // MỚI: hỗ trợ nhập nhiều email/từ khóa cách nhau bằng dấu phẩy -> khớp bất kỳ (OR)
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

      // MỚI: lọc theo độ tin cậy
      const matchConfidence = confidenceFilter === 'all' ? true : getConfidenceBucket(item) === confidenceFilter;

      // MỚI: lọc theo sai khác nhãn hệ thống vs admin
      const matchMismatch =
        mismatchFilter === 'all'
          ? true
          : mismatchFilter === 'mismatch'
          ? isMismatch(item)
          : !isMismatch(item);

      // MỚI: lọc theo khoảng ngày gửi
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
  matchPriority = isMismatch(item) && confidence >= 80;
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

  // ====== MỚI: reset toàn bộ filter về mặc định ======
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
  // ====== MỚI: helper lấy admin_id (dùng chung cho các hàm mới, không đụng handleReview/handleExport cũ) ======
  const getAdminId = async () => {
  const { data: authData } = await supabase.auth.getUser();

  if (authData?.user?.id) {
    return authData.user.id;
  }

  const localUserId =
    localStorage.getItem('userId') ||
    localStorage.getItem('user_id') ||
    localStorage.getItem('adminId') ||
    localStorage.getItem('uid');

  if (localUserId) {
    return localUserId;
  }

  throw new Error('Không tìm thấy thông tin đăng nhập!');
};

// ====== 2. HÀM THAO TÁC DUYỆT ĐÃ CHUYỂN QUA GỌI API BACKEND ======
  const handleReview = async (item, action) => {
    const status = action === 'approve' ? 'approved' : 'rejected';
    const actionText = action === 'approve' ? 'duyệt' : 'từ chối';

    setUpdatingId(item.id);
    try {
// Lấy ID người dùng trực tiếp từ hệ thống bảo mật của Supabase
const { data: authData, error: authError } = await supabase.auth.getUser();

if (authError || !authData?.user) {
  // Nếu chưa đăng nhập, đá văng ra trang login (tuỳ chọn) hoặc báo lỗi
  throw new Error("Không tìm thấy thông tin đăng nhập (Supabase Session rỗng)!");
}

const adminId = authData.user.id;

      const res = await fetch(`http://localhost:8000/api/admin/feedback/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_id: adminId,
          feedback_id: item.id,
          action: action // "approve" hoặc "reject"
        })
      });

      if (!res.ok) {
         const err = await res.json();
         throw new Error(err.detail || 'Lỗi server');
      }

      // Cập nhật giao diện ngay lập tức
      setItems((current) =>
        current.map((feedback) => (feedback.id === item.id ? { ...feedback, status } : feedback)),
      );
      toast.success(`Đã ${actionText} phản hồi thành công!`, {
        id: `admin-feedback-${action}-${item.id}`,
      });

      // ====== Ghi nhật ký hoạt động: admin nào vừa duyệt/từ chối phản hồi nào ======
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
  
// ====== HÀM XUẤT DATASET ĐÃ ĐƯỢC CHUYỂN QUA GỌI API BACKEND ======
  const handleExport = async () => {
  try {
    setIsExporting(true);

    const adminId = await getAdminId();

    const response = await fetch(`http://localhost:8000/api/admin/dataset/export?admin_id=${adminId}`, {
      method: 'GET',
    });

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
  // ====== Giao diện badge nhãn - giữ nguyên 100% từ file 1 ======
  const getLabelBadge = (labelValue) => {
    if (labelValue === null || labelValue === undefined) {
      return <span className="px-2.5 py-1 text-xs rounded-full font-medium border bg-slate-500/10 text-slate-400 border-slate-500/20">Chưa có nhãn</span>;
    }

    if (Number(labelValue) === 1) {
      return (
        <span className="px-2.5 py-1 text-xs rounded-full font-medium border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
          Tích cực (1)
        </span>
      );
    }

    if (Number(labelValue) === 0) {
      return (
        <span className="px-2.5 py-1 text-xs rounded-full font-medium border bg-rose-500/10 text-rose-400 border-rose-500/20">
          Tiêu cực (0)
        </span>
      );
    }

    return (
      <span className="px-2.5 py-1 text-xs rounded-full font-medium border bg-orange-500/10 text-orange-400 border-orange-500/20">
        Khác ({labelValue})
      </span>
    );
  };

  // Badge trạng thái - style đồng bộ với getLabelBadge của file 1
  const getStatusBadge = (status) => {
    const normalized = normalizeStatus(status);
    const classMap = {
      pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      rejected: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    };

    return (
  <span
    className={`inline-flex items-center justify-center whitespace-nowrap px-2.5 py-1 text-xs rounded-full font-medium border ${classMap[normalized]}`}
  >
    {STATUS_LABEL[normalized]}
  </span>
    );
  };

  // ====== MỚI: hiển thị thanh Độ tin cậy (Confidence) trong bảng/modal ======
  const getConfidenceDisplay = (item) => {
    const value = item.ai_confidence;
    if (value === null || value === undefined) {
      return <span className="text-xs text-slate-500">—</span>;
    }
    const pct = Math.round(value <= 1 ? value * 100 : value);
    const colorClass = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500';
    const textClass = pct >= 80 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-rose-400';

    return (
      <div className="flex items-center gap-2 w-28">
        <div className="flex-1 h-1.5 rounded-full bg-slate-700 overflow-hidden">
          <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${pct}%` }} />
        </div>
        <span className={`text-xs font-medium ${textClass}`}>{pct}%</span>
      </div>
    );
  };

  // ====== MỚI: icon "Sai khác" - hệ thống dán nhãn khác với nhãn admin/người dùng sửa ======
  const getMismatchIcon = (item) => {
    if (isMismatch(item)) {
      return (
        <span title="Nhãn hệ thống khác nhãn đã sửa" className="inline-flex items-center gap-1 text-amber-400 text-xs">
          <AlertTriangle size={14} />
          <span>Khác</span>
        </span>
      );
    }
    return <span className="text-xs text-slate-600">Trùng</span>;
  };

  const formatDate = (value) => {
    if (!value) return '—';
    try {
      return new Date(value).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return '—';
    }
  };

  // ====== MỚI: chọn dòng / chọn tất cả cho Bulk actions ======
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

  // ====== MỚI: gọi API hàng loạt (duyệt / từ chối / sửa nhãn / xóa) ======
  const submitBulkAction = async (action) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    if ((action === 'reject' || action === 'edit_label') && !bulkReason.trim()) {
      toast.error('Vui lòng nhập lý do trước khi thực hiện.', { id: 'bulk-reason-required' });
      return;
    }

    setIsBulkSubmitting(true);
    try {
      const adminId = await getAdminId();
      const res = await fetch('http://localhost:8000/api/admin/feedback/bulk-review', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_id: adminId,
          feedback_ids: ids,
          action,
          reason: bulkReason || null,
          new_label: action === 'edit_label' ? Number(bulkNewLabel) : null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Lỗi server');
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

      toast.success(`Đã xử lý ${ids.length} phản hồi thành công!`, { id: 'bulk-action-success' });

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
      toast.error(`Thất bại: ${error.message}`, { id: 'bulk-action-error' });
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  // ====== MỚI: xuất CSV chỉ những dòng được tick chọn ======
  const handleExportSelected = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setIsExportingSelected(true);
    try {
      const adminId = await getAdminId();
      const response = await fetch('http://localhost:8000/api/admin/feedback/export-selected', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_id: adminId, feedback_ids: ids }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Lỗi khi tải file');
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

      toast.success('Xuất CSV các mục đã chọn thành công!', { id: 'export-selected-success' });
    } catch (error) {
      console.error('Lỗi xuất CSV đã chọn:', error);
      toast.error(`Thất bại: ${error.message}`, { id: 'export-selected-error' });
    } finally {
      setIsExportingSelected(false);
    }
  };
const toggleRetrainFlag = async (item) => {
  try {
    const adminId = await getAdminId();
    const nextValue = !(item.include_retrain ?? true);

    const res = await fetch('http://localhost:8000/api/admin/feedback/retrain-flag', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        admin_id: adminId,
        feedback_id: item.id,
        include_retrain: nextValue,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Lỗi server');
    }

    setItems((current) =>
      current.map((feedback) =>
        feedback.id === item.id ? { ...feedback, include_retrain: nextValue } : feedback,
      ),
    );

    toast.success(nextValue ? 'Đã đưa vào tập retrain.' : 'Đã loại khỏi tập retrain.', {
      id: `retrain-flag-${item.id}`,
    });
  } catch (error) {
    console.error('Lỗi cập nhật retrain flag:', error);
    toast.error(`Thất bại: ${error.message}`, { id: 'retrain-flag-error' });
  }
};

  // ====== MỚI: mở modal chi tiết ======
  const openDetailModal = async (item) => {
    setModalItem({ ...item, review_history: [] });
    setModalReason('');
    setModalNewLabel(String(item.corrected_label ?? ''));
    setModalLoading(true);
    try {
      const adminId = await getAdminId();
      const res = await fetch(`http://localhost:8000/api/admin/feedback/${item.id}/detail?admin_id=${adminId}`);
      if (!res.ok) throw new Error('Không tải được chi tiết phản hồi');
      const detail = await res.json();
      setModalItem({
        ...item,
        ...detail,
        ai_confidence: detail.ai_confidence ?? item.ai_confidence,
      });
      setModalNewLabel(String(detail.corrected_label ?? ''));
    } catch (error) {
      console.error('Lỗi tải chi tiết:', error);
      toast.error('Không thể tải chi tiết phản hồi này.', { id: 'modal-detail-load-error' });
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

  // ====== MỚI: xử lý duyệt / từ chối / sửa nhãn ngay trong modal (có lý do + lịch sử) ======
  const submitModalAction = async (action) => {
    if (!modalItem) return;

    if ((action === 'reject' || action === 'edit_label') && !modalReason.trim()) {
      toast.error('Vui lòng nhập lý do trước khi thực hiện.', { id: 'modal-reason-required' });
      return;
    }

    setModalSubmittingAction(action);
    try {
      const adminId = await getAdminId();
      const res = await fetch('http://localhost:8000/api/admin/feedback/review-detailed', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_id: adminId,
          feedback_id: modalItem.id,
          action,
          reason: modalReason || null,
          new_label: action === 'edit_label' ? Number(modalNewLabel) : null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Lỗi server');
      }

      const actionText = action === 'approve' ? 'duyệt' : action === 'reject' ? 'từ chối' : 'sửa nhãn';

      // Đồng bộ lại state bảng chính
      setItems((current) =>
        current.map((feedback) => {
          if (feedback.id !== modalItem.id) return feedback;
          if (action === 'edit_label') return { ...feedback, corrected_label: Number(modalNewLabel) };
          return { ...feedback, status: action === 'approve' ? 'approved' : 'rejected' };
        }),
      );

      // Cập nhật modal (thêm dòng lịch sử mới cho người dùng thấy ngay, không cần load lại)
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

      toast.success(`Đã ${actionText} phản hồi thành công!`, { id: `modal-${action}-success` });

      logAdminActivity({
        actionType: `feedback_${action}`,
        targetType: 'feedback',
        targetId: modalItem.id,
        description: `${actionText} phản hồi qua modal chi tiết (lý do: ${modalReason || 'không có'})`,
      });

      setModalReason('');
    } catch (error) {
      console.error('Lỗi xử lý trong modal:', error);
      toast.error(`Thất bại: ${error.message}`, { id: 'modal-action-error' });
    } finally {
      setModalSubmittingAction('');
    }
  };

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500 font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-wide text-white">Quản lý Phản hồi</h1>
          <p className="text-sm text-slate-400">Duyệt các nhãn người dùng chỉnh sửa để cải thiện bộ dữ liệu.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadFeedback}
            disabled={isLoading}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-700"
            title="Làm mới"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={handleExport}
            disabled={isExporting}
            
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isExporting ? <RefreshCw size={18} className="animate-spin" /> : <Download size={18} />}
            <span>Xuất Dataset CSV</span>
          </button>
        </div>
      </div>

      {/* ====== Thẻ thống kê - chức năng từ file Feedback (Supabase), style đồng bộ giao diện file 1 ====== */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-md">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tổng phản hồi</h3>
          <p className="mt-4 text-4xl font-bold text-white">{isLoading ? '...' : stats.total}</p>
        </div>
        <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-md">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Chờ xử lý</h3>
          <p className="mt-4 text-4xl font-bold text-amber-400">{isLoading ? '...' : stats.pending}</p>
        </div>
        <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-md">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Đã duyệt</h3>
          <p className="mt-4 text-4xl font-bold text-emerald-400">{isLoading ? '...' : stats.approved}</p>
        </div>
        <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-md">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Đã từ chối</h3>
          <p className="mt-4 text-4xl font-bold text-rose-400">{isLoading ? '...' : stats.rejected}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-700 bg-slate-800/50 backdrop-blur-md overflow-hidden">
      <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-5 backdrop-blur-md">
  <div className="mb-4 flex flex-col gap-1">
    <h2 className="text-lg font-semibold text-white">Gợi ý ưu tiên xử lý</h2>
    <p className="text-sm text-slate-400">
      Tự động gom các phản hồi nên kiểm tra trước để giảm dữ liệu sai khi xuất dataset.
    </p>
  </div>

  <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
    <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-rose-300">AI tự tin nhưng sai</p>
          <p className="mt-1 text-xs text-slate-400">AI confidence ≥ 80% nhưng khác nhãn người dùng sửa.</p>
        </div>
        <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-sm font-bold text-rose-300">
          {priorityStats.confidentWrong.length} mẫu
        </span>
      </div>

      <button
        onClick={() => applyPriorityFilter('confident_wrong')}
        className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-300 transition-colors hover:bg-rose-500/20"
      >
        Xem ngay
      </button>
    </div>

    <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-indigo-300">Nội dung dài đáng duyệt</p>
          <p className="mt-1 text-xs text-slate-400">Câu dài từ 80 ký tự trở lên, thường có nhiều ngữ cảnh hơn.</p>
        </div>
        <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-sm font-bold text-indigo-300">
          {priorityStats.longContent.length} mẫu
        </span>
      </div>

      <button
        onClick={() => applyPriorityFilter('long_content')}
        className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-300 transition-colors hover:bg-indigo-500/20"
      >
        Xem ngay
      </button>
    </div>

    <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-amber-300">Nội dung bị lặp</p>
          <p className="mt-1 text-xs text-slate-400">Phát hiện nội dung giống nhau để tránh dataset bị lệch.</p>
        </div>
        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-sm font-bold text-amber-300">
          {priorityStats.duplicateGroups.length} nhóm
        </span>
      </div>

      <div className="mb-3 space-y-1">
        {priorityStats.duplicateGroups.slice(0, 2).map((group) => (
          <p key={group.text} className="truncate text-xs text-slate-300" title={group.text}>
            {group.text} - xuất hiện {group.count} lần
          </p>
        ))}

        {priorityStats.duplicateGroups.length === 0 && (
          <p className="text-xs text-slate-500">Chưa phát hiện nội dung bị lặp.</p>
        )}
      </div>

      <button
        onClick={() => applyPriorityFilter('duplicate')}
        className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300 transition-colors hover:bg-amber-500/20"
      >
        Xem ngay
      </button>
    </div>
  </div>

  {priorityFilter !== 'all' && (
    <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900/40 px-4 py-3">
      <p className="text-sm text-slate-300">
        Đang lọc theo gợi ý ưu tiên.
      </p>
      <button
        onClick={() => setPriorityFilter('all')}
        className="text-xs font-medium text-slate-400 transition-colors hover:text-white"
      >
        Bỏ lọc ưu tiên
      </button>
    </div>
  )}
</div>
        {/* ====== Thanh lọc - giữ icon Filter từ file 1, mở rộng thêm search + select để giữ chức năng lọc/tìm kiếm ====== */}
        <div className="flex flex-col gap-3 px-5 py-3 border-b border-slate-700/50 bg-slate-900/30 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Filter size={16} />
            <span>{isLoading ? 'Đang tải...' : `${filteredItems.length} phản hồi`}</span>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm theo nội dung, email, tên... (cách nhau bởi dấu phẩy)"
                className="w-full sm:w-72 rounded-lg border border-slate-700 bg-slate-900 py-1.5 pl-8 pr-3 text-xs text-white placeholder:text-slate-500 outline-none focus:border-indigo-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 outline-none focus:border-indigo-500"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="pending">Chờ duyệt</option>
              <option value="approved">Đã duyệt</option>
              <option value="rejected">Đã từ chối</option>
            </select>

            {/* ====== MỚI: nút mở bộ lọc nâng cao ====== */}
            <button
              onClick={() => setShowAdvancedFilters((current) => !current)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                showAdvancedFilters
                  ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                  : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600'
              }`}
            >
              <SlidersHorizontal size={14} />
              Lọc nâng cao
            </button>
          </div>
        </div>

        {/* ====== MỚI: bảng lọc nâng cao (confidence, sai khác, khoảng ngày, reset) ====== */}
        {showAdvancedFilters && (
          <div className="grid grid-cols-1 gap-3 px-5 py-4 border-b border-slate-700/50 bg-slate-900/20 sm:grid-cols-2 lg:grid-cols-5">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] uppercase tracking-wider text-slate-500">Độ tin cậy AI</label>
              <select
                value={confidenceFilter}
                onChange={(event) => setConfidenceFilter(event.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
              >
                {Object.entries(CONFIDENCE_BUCKETS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] uppercase tracking-wider text-slate-500">Sai khác nhãn</label>
              <select
                value={mismatchFilter}
                onChange={(event) => setMismatchFilter(event.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
              >
                {Object.entries(MISMATCH_OPTIONS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] uppercase tracking-wider text-slate-500">Từ ngày</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] uppercase tracking-wider text-slate-500">Đến ngày</label>
              <input
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={resetFilters}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-rose-500 hover:text-rose-400 transition-colors"
              >
                Reset Filter
              </button>
            </div>
          </div>
        )}

        {/* ====== MỚI: thanh Bulk Actions - chỉ hiện khi có dòng được chọn ====== */}
        {selectedIds.size > 0 && (
          <div className="flex flex-col gap-3 px-5 py-3 border-b border-slate-700/50 bg-indigo-500/10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm font-medium text-indigo-200">Đã chọn {selectedIds.size} phản hồi</div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => submitBulkAction('approve')}
                  disabled={isBulkSubmitting}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                >
                  <CheckCircle2 size={14} /> Duyệt tất cả
                </button>
                <button
                  onClick={() => setBulkAction(bulkAction === 'reject' ? '' : 'reject')}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    bulkAction === 'reject'
                      ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                  }`}
                >
                  <XCircle size={14} /> Từ chối tất cả
                </button>
                <button
                  onClick={() => setBulkAction(bulkAction === 'edit_label' ? '' : 'edit_label')}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    bulkAction === 'edit_label'
                      ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                      : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20'
                  }`}
                >
                  <Edit3 size={14} /> Sửa nhãn hàng loạt
                </button>
                <button
                  onClick={() => submitBulkAction('delete')}
                  disabled={isBulkSubmitting}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-700/50 border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30 transition-colors disabled:opacity-50"
                >
                  <Trash2 size={14} /> Xóa hàng loạt
                </button>
                <button
                  onClick={handleExportSelected}
                  disabled={isExportingSelected}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-700/50 border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                  {isExportingSelected ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                  Xuất CSV đã chọn
                </button>
                <button
                  onClick={clearSelection}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
                >
                  <X size={14} /> Bỏ chọn
                </button>
              </div>
            </div>

            {/* MỚI: ô nhập lý do + chọn nhãn mới khi bulk = reject hoặc edit_label */}
            {(bulkAction === 'reject' || bulkAction === 'edit_label') && (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                {bulkAction === 'edit_label' && (
                  <select
                    value={bulkNewLabel}
                    onChange={(event) => setBulkNewLabel(event.target.value)}
                    className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
                  >
                    <option value="1">Tích cực (1)</option>
                    <option value="0">Tiêu cực (0)</option>
                  </select>
                )}
                <input
                  value={bulkReason}
                  onChange={(event) => setBulkReason(event.target.value)}
                  placeholder="Nhập lý do (bắt buộc)..."
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-indigo-500"
                />
                <button
                  onClick={() => submitBulkAction(bulkAction)}
                  disabled={isBulkSubmitting}
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 text-xs font-medium text-white transition-colors disabled:opacity-60"
                >
                  {isBulkSubmitting ? <RefreshCw size={14} className="animate-spin" /> : null}
                  Xác nhận
                </button>
              </div>
            )}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-700/50 text-xs font-semibold uppercase tracking-wider text-slate-400">
                {/* ====== MỚI: cột checkbox chọn tất cả ====== */}
                <th className="px-4 py-4 w-10">
                  <input
                    type="checkbox"
                    checked={isAllFilteredSelected}
                    onChange={toggleSelectAll}
                    className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-900 accent-indigo-500 cursor-pointer"
                  />
                </th>
                <th className="px-5 py-4 w-[28%]">Nội dung gốc</th>
                <th className="px-5 py-4">Nhãn hệ thống</th>
                {/* ====== MỚI: cột Độ tin cậy ====== */}
                <th className="px-5 py-4">Độ tin cậy</th>
                <th className="px-5 py-4">Nhãn người dùng sửa</th>
                {/* ====== MỚI: cột Sai khác ====== */}
                <th className="px-5 py-4">Sai khác</th>
                <th className="px-5 py-4">Người gửi</th>
                {/* ====== MỚI: cột Ngày gửi ====== */}
                <th className="px-5 py-4">Ngày gửi</th>
                <th className="px-5 py-4">Trạng thái</th>
                <th className="px-5 py-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {isLoading ? (
                Array(5).fill(0).map((_, index) => (
                  <tr key={index}>
                    <td className="px-4 py-4"><div className="w-3.5 h-3.5 bg-slate-700/50 rounded animate-pulse" /></td>
                    <td className="px-5 py-4">
                      <div className="w-3/4 h-4 bg-slate-700/50 rounded animate-pulse mb-2" />
                      <div className="w-1/2 h-4 bg-slate-700/50 rounded animate-pulse" />
                    </td>
                    <td className="px-5 py-4"><div className="w-20 h-6 bg-slate-700/50 rounded-full animate-pulse" /></td>
                    <td className="px-5 py-4"><div className="w-20 h-4 bg-slate-700/50 rounded animate-pulse" /></td>
                    <td className="px-5 py-4"><div className="w-20 h-6 bg-slate-700/50 rounded-full animate-pulse" /></td>
                    <td className="px-5 py-4"><div className="w-12 h-4 bg-slate-700/50 rounded animate-pulse" /></td>
                    <td className="px-5 py-4"><div className="w-24 h-4 bg-slate-700/50 rounded animate-pulse" /></td>
                    <td className="px-5 py-4"><div className="w-20 h-4 bg-slate-700/50 rounded animate-pulse" /></td>
                    <td className="px-5 py-4"><div className="w-16 h-6 bg-slate-700/50 rounded-full animate-pulse" /></td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <div className="w-8 h-8 bg-slate-700/50 rounded animate-pulse" />
                        <div className="w-8 h-8 bg-slate-700/50 rounded animate-pulse" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-5 py-12 text-center text-slate-500 text-sm">
                    Không có phản hồi nào phù hợp.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => {
                  const profile = profiles[item.user_id] || {};
                  const disabled = updatingId === item.id;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-800/30 transition-colors group cursor-pointer"
                      onClick={() => openDetailModal(item)}
                    >
                      {/* ====== MỚI: checkbox từng dòng - chặn click lan ra mở modal ====== */}
                      <td className="px-4 py-4" onClick={(event) => event.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleSelectOne(item.id)}
                          className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-900 accent-indigo-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-300">
                        <p
                          className="max-w-[520px] overflow-hidden text-ellipsis text-sm leading-6 text-slate-300"
                          style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                          }}
                          title={item.original_content || ''}
                        >
                          {item.original_content || '—'}
                        </p>
                      </td>
                      <td className="px-5 py-4">{getLabelBadge(item.old_ai_label)}</td>
                      {/* ====== MỚI ====== */}
                      <td className="px-5 py-4">{getConfidenceDisplay(item)}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {item.old_ai_label !== item.corrected_label && (
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" title="Người dùng đã sửa nhãn" />
                          )}
                          {getLabelBadge(item.corrected_label)}
                        </div>
                      </td>
                      {/* ====== MỚI ====== */}
                      <td className="px-5 py-4">{getMismatchIcon(item)}</td>
                      <td className="px-5 py-4 text-sm">
                        <p className="text-slate-200 font-medium truncate max-w-[160px]">{profile.full_name || 'Người dùng'}</p>
                        <p className="text-xs text-slate-500 truncate max-w-[160px]">{profile.email || item.user_id || 'Không rõ'}</p>
                      </td>
                      {/* ====== MỚI ====== */}
                      <td className="px-5 py-4 text-xs text-slate-400 whitespace-nowrap">{formatDate(item.created_at)}</td>
                      <td className="px-5 py-4 min-w-[110px]">{getStatusBadge(item.status)}</td>
                      <td className="px-5 py-4 text-right" onClick={(event) => event.stopPropagation()}>
                        <div className="flex justify-end items-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                          {/* ====== MỚI: nút mở chi tiết tường minh ====== */}
                          <button
                            onClick={() => openDetailModal(item)}
                            className="flex items-center justify-center w-8 h-8 rounded text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                            title="Xem chi tiết"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => handleReview(item, 'approve')}
                            disabled={disabled}
                            className="flex items-center justify-center w-8 h-8 rounded text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Duyệt"
                          >
                            {disabled ? <RefreshCw size={18} className="animate-spin" /> : <CheckCircle2 size={20} />}
                          </button>
                          <button
                            onClick={() => handleReview(item, 'reject')}
                            disabled={disabled}
                            className="flex items-center justify-center w-8 h-8 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Từ chối"
                          >
                            {disabled ? <RefreshCw size={18} className="animate-spin" /> : <XCircle size={20} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && filteredItems.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-slate-700/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-400">
              Hiển thị <span className="font-semibold text-slate-200">{(page - 1) * ITEMS_PER_PAGE + 1}</span> -{' '}
              <span className="font-semibold text-slate-200">{Math.min(page * ITEMS_PER_PAGE, filteredItems.length)}</span> /{' '}
              <span className="font-semibold text-slate-200">{filteredItems.length}</span> phản hồi
            </p>
            <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>

      {/* ====================================================================
          MỚI: MODAL CHI TIẾT PHẢN HỒI
          ==================================================================== */}
      {modalItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-800 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <div>
                <h2 className="text-lg font-semibold text-white">Chi tiết phản hồi</h2>
                <p className="text-xs text-slate-500">Mã: {modalItem.id}</p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Nội dung gốc</h3>
                <div className="rounded-lg border border-slate-700 bg-slate-900 p-4 text-sm text-slate-200 whitespace-pre-wrap">
                  {modalItem.original_content}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Nhãn hệ thống + Độ tin cậy</h3>
                  <div className="flex items-center gap-3">
                    {getLabelBadge(modalItem.old_ai_label)}
                    {getConfidenceDisplay(modalItem)}
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Trạng thái hiện tại</h3>
                  {getStatusBadge(modalItem.status)}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Nhãn hiện tại của Admin</h3>
                <div className="flex items-center gap-3">
                  <select
                    value={modalNewLabel}
                    onChange={(event) => setModalNewLabel(event.target.value)}
                    className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500"
                  >
                    <option value="1">Tích cực (1)</option>
                    <option value="0">Tiêu cực (0)</option>
                  </select>
                  {Number(modalNewLabel) !== modalItem.corrected_label && (
                    <span className="text-xs text-amber-400">Nhãn sẽ thay đổi so với hiện tại: {getLabelBadge(modalItem.corrected_label)}</span>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Lý do chỉnh sửa / từ chối <span className="text-rose-400">(bắt buộc khi Từ chối hoặc Sửa nhãn)</span>
                </h3>
                <textarea
                  value={modalReason}
                  onChange={(event) => setModalReason(event.target.value)}
                  rows={3}
                  placeholder="Ví dụ: Câu mơ hồ, cần xem thêm ngữ cảnh..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => submitModalAction('approve')}
                  disabled={!!modalSubmittingAction}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-4 py-2 text-sm font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                >
                  {modalSubmittingAction === 'approve' ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  Duyệt
                </button>
                <button
                  onClick={() => submitModalAction('reject')}
                  disabled={!!modalSubmittingAction}
                  className="flex items-center gap-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 px-4 py-2 text-sm font-medium text-rose-400 hover:bg-rose-500/20 transition-colors disabled:opacity-50"
                >
                  {modalSubmittingAction === 'reject' ? <RefreshCw size={16} className="animate-spin" /> : <XCircle size={16} />}
                  Từ chối
                </button>
                <button
                  onClick={() => submitModalAction('edit_label')}
                  disabled={!!modalSubmittingAction || Number(modalNewLabel) === modalItem.corrected_label}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 px-4 py-2 text-sm font-medium text-indigo-300 hover:bg-indigo-500/20 transition-colors disabled:opacity-50"
                >
                  {modalSubmittingAction === 'edit_label' ? <RefreshCw size={16} className="animate-spin" /> : <Edit3 size={16} />}
                  Lưu nhãn mới
                </button>
              </div>

              <div>
                <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  <History size={14} /> Lịch sử chỉnh sửa
                </h3>
                {modalLoading ? (
                  <p className="text-xs text-slate-500">Đang tải lịch sử...</p>
                ) : (modalItem.review_history || []).length === 0 ? (
                  <p className="text-xs text-slate-500">Chưa có lịch sử xử lý nào cho phản hồi này.</p>
                ) : (
                  <div className="space-y-2">
                    {modalItem.review_history.slice().reverse().map((entry, index) => (
                      <div key={index} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-400">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-300">{entry.action}</span>
                          <span>{formatDate(entry.timestamp)}</span>
                        </div>
                        {entry.reason && <p className="mt-1 text-slate-500">Lý do: {entry.reason}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFeedback;