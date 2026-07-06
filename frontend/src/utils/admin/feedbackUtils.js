export const STATUS_LABEL = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Đã từ chối',
};

export const CONFIDENCE_BUCKETS = {
  all: 'Tất cả độ tin cậy',
  high: '≥ 80%',
  mid: '50% - 79%',
  low: '< 50%',
  unknown: 'Không rõ',
};

export const MISMATCH_OPTIONS = {
  all: 'Tất cả',
  mismatch: 'Hệ thống sai (khác nhãn admin)',
  match: 'Hệ thống đúng (trùng nhãn admin)',
};

export const ITEMS_PER_PAGE = 10;
export const WINDOW_SIZE = 3;

export function normalizeStatus(status) {
  return status || 'pending';
}

export function getErrorMessage(data, fallback = 'Lỗi server') {
  const raw = data?.detail || data?.message || data?.error || data;

  if (!raw) return fallback;
  if (typeof raw === 'string') return raw;

  if (Array.isArray(raw)) {
    return raw
      .map((item) => item?.msg || item?.message || JSON.stringify(item))
      .join('\n');
  }

  if (typeof raw === 'object') {
    return raw.msg || raw.message || JSON.stringify(raw);
  }

  return String(raw);
}

export function getPageItems(currentPage, totalPages) {
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
}

export function isFeedbackMismatch(item) {
  return item.old_ai_label !== item.corrected_label;
}

export function getConfidenceBucket(item) {
  const value = item.ai_confidence;

  if (value === null || value === undefined) return 'unknown';

  const pct = value <= 1 ? value * 100 : value;

  if (pct >= 80) return 'high';
  if (pct >= 50) return 'mid';

  return 'low';
}

export function getPriorityStats(items) {
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

  const confidentWrong = items.filter((item) => {
    const value = item.ai_confidence;

    if (value === null || value === undefined) return false;

    const confidence = value <= 1 ? value * 100 : value;

    return isFeedbackMismatch(item) && confidence >= 80;
  });

  const longContent = items.filter((item) => {
    const content = item.original_content || '';
    return content.trim().length >= 80;
  });

  return {
    confidentWrong,
    longContent,
    duplicateGroups,
    duplicateIds,
  };
}

export function formatDate(value) {
  if (!value) return '—';

  try {
    return new Date(value).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}
