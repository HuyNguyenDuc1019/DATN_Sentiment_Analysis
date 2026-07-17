import { confidenceRatio } from '../../services/reviews';

export function getConfidenceRatio(confidence) {
  return confidenceRatio(confidence);
}

export function isInRange(value, from, to) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) && time >= from && time < to;
}

export function formatWeekday(date) {
  return ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][date.getDay()];
}

export function buildTrendData(reviews) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));

    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    const items = reviews.filter((item) => isInRange(item.created_at, date.getTime(), nextDay.getTime()));

    return {
      label: formatWeekday(date),
      date: `${date.getDate()}/${date.getMonth() + 1}`,
      positive: items.filter((item) => Number(item.ai_label) === 1).length,
      negative: items.filter((item) => Number(item.ai_label) === 0).length,
    };
  });
}

function normalizeReviewAspects(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.flatMap((item) => normalizeReviewAspects(item));
  }

  if (typeof value === 'object') {
    return Object.entries(value)
      .filter(([, enabled]) => enabled !== false && enabled !== null)
      .map(([name]) => String(name).trim())
      .filter(Boolean);
  }

  const text = String(value).trim();
  if (!text) return [];

  if (text.startsWith('[') || text.startsWith('{')) {
    try {
      return normalizeReviewAspects(JSON.parse(text));
    } catch {
      // Dữ liệu cũ có thể được lưu dưới dạng chuỗi phân tách bằng dấu phẩy.
    }
  }

  return text
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function buildAspectSentimentData(reviews, limit = 8) {
  const aspectMap = new Map();

  (Array.isArray(reviews) ? reviews : []).forEach((review) => {
    const isPositive = Number(review?.ai_label) === 1;
    const uniqueAspects = new Set(normalizeReviewAspects(review?.aspects));

    uniqueAspects.forEach((aspect) => {
      const current = aspectMap.get(aspect) || {
        aspect,
        positive: 0,
        negative: 0,
        total: 0,
      };

      current[isPositive ? 'positive' : 'negative'] += 1;
      current.total += 1;
      aspectMap.set(aspect, current);
    });
  });

  return [...aspectMap.values()]
    .sort((a, b) => b.total - a.total || b.negative - a.negative)
    .slice(0, limit);
}

export function uniqueAlerts(alerts) {
  const seen = new Set();

  return alerts.filter((item) => {
    const key = item.id || item.content;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function normalizeAlert(item) {
  return {
    id: item.id || item.review_id || item.alert_id || item.created_at || item.content,
    content: item.content || item.comment || item.text || item.review || item.original_content || item.message || '',
    keywords: extractStoredKeywords(item),
    source_url: item.source_url || item.source || '',
    ai_label: item.ai_label,
    confidence: item.confidence,
    is_action_required: item.is_action_required,
    review_date: item.review_date,
    created_at: item.created_at,
  };
}

export function extractAlerts(payload) {
  const value = findArray(payload, ['alerts', 'items', 'results', 'reviews', 'comments', 'data']);
  return value.map(normalizeAlert).filter((item) => item.content);
}

export function extractStoredKeywords(item) {
  if (Array.isArray(item.keywords)) return item.keywords.map((word) => String(word).trim()).filter(Boolean);
  if (typeof item.keywords === 'string') return item.keywords.split(',').map((word) => word.trim()).filter(Boolean);
  return [];
}

export function isCriticalAlert(item) {
  const rawText = [
    item.content,
    item.comment,
    item.text,
    item.review,
    ...(Array.isArray(item.keywords) ? item.keywords : []),
    ...(Array.isArray(item.aspects) ? item.aspects : []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('vi-VN');

  const text = normalizeKeywordTextSafe(rawText);

  const riskWords = [
    'ngộ độc',
    'ngo doc',
    'đau bụng',
    'dau bung',
    'ruồi',
    'ruoi',
    'dị vật',
    'di vat',
    'tẩy chay',
    'tay chay',
    'chửi',
    'chui',
    'thái độ',
    'thai do',
    'tệ',
    'te',
    'bẩn',
    'ban',
    'dơ',
    'do',
    'sống',
    'song',
    'hôi',
    'hoi',
  ];

  const hasRiskSignal = riskWords.some((word) => keywordMatches(text, word));
  if (hasRiskSignal) return true;
  if (isClearlyPositiveFeedback(rawText)) return false;

  const isActionRequired = item.is_action_required === true || String(item.is_action_required).toLowerCase() === 'true';
  const hasNegativeSignal = hasNegativeFeedbackSignal(rawText);
  if (isActionRequired && hasNegativeSignal) return true;

  return Number(item.ai_label) === 0 && hasNegativeSignal;
}

export function isClearlyPositiveFeedback(text) {
  const normalizedText = normalizeKeywordTextSafe(text);
  const positiveWords = [
    'ngon',
    'qua ngon',
    'quá ngon',
    'dang tien',
    'đáng tiền',
    'tuyet',
    'tuyệt',
    'hai long',
    'hài lòng',
    'on ap',
    'ổn áp',
    'sach',
    'sạch',
    'nhanh',
    'vua mieng',
    'vừa miệng',
    'de thuong',
    'dễ thương',
    'nhiet tinh',
    'nhiệt tình',
    'rat tot',
    'rất tốt',
    'tot',
    'tốt',
  ];

  const negativeCues = [
    'khong',
    'không',
    'chua',
    'chưa',
    'that vong',
    'thất vọng',
    'te',
    'tệ',
    'do',
    'dở',
    'lau',
    'lâu',
    'ban',
    'bẩn',
    'hoi',
    'hôi',
    'nhat',
    'nhạt',
    'man',
    'mặn',
    'dat',
    'đắt',
    'kem',
    'kém',
  ];

  const chinesePositiveWords = ['不错', '好吃', '推荐', '弹性', '赞', '很好', '特别推荐'];
  const extraPositiveWords = ['thom', 'dep', 'gioi thieu', 'se ung ho', 'recommend'];
  const hasPositiveSignal = [...positiveWords, ...extraPositiveWords]
    .some((word) => normalizedText.includes(normalizeKeywordTextSafe(word)))
    || chinesePositiveWords.some((word) => String(text || '').includes(word));

  const hasNegativeSignal = hasNegativeFeedbackSignal(text)
    || negativeCues.some((word) => keywordMatches(normalizedText, word));

  return hasPositiveSignal && !hasNegativeSignal;
}

export function hasNegativeFeedbackSignal(text) {
  const normalizedText = normalizeKeywordTextSafe(text);
  const negativeCues = [
    'khong',
    'ko',
    'chua',
    'that vong',
    'te',
    'do',
    'lau',
    'ban',
    'hoi',
    'nhat',
    'man',
    'dat',
    'kem',
    'it',
    'doi',
    'kho chiu',
    'thai do',
    'nguoi',
    'song',
    'qua te',
    'khong dung',
    'khong ngon',
    'khong sach',
    'khong hai long',
  ];

  return negativeCues.some((word) => keywordMatches(normalizedText, word));
}

export function keywordMatches(normalizedText, term) {
  const keyword = normalizeKeywordTextSafe(term);
  if (!keyword) return false;

  if (!keyword.includes(' ') && keyword.length <= 4) {
    return normalizedText.split(/\s+/).includes(keyword);
  }

  return normalizedText.includes(keyword);
}

export function findArray(value, keys, depth = 0) {
  if (!value || depth > 5) return [];
  if (Array.isArray(value)) return value;

  for (const key of keys) {
    const found = findArray(value[key], keys, depth + 1);
    if (found.length) return found;
  }

  return [];
}

export function buildLeaderboardFromReviews(reviews) {
  const positiveMap = new Map();
  const negativeMap = new Map();

  reviews.forEach((item) => {
    const isPositive = Number(item.ai_label) === 1;
    const target = isPositive ? positiveMap : negativeMap;
    const text = item.content || item.comment || item.text || item.review || '';

    buildSentimentKeywords(text, isPositive).forEach((keyword) => {
      target.set(keyword, (target.get(keyword) || 0) + 1);
    });
  });

  const toList = (map) => [...map.entries()]
    .map(([text, value]) => ({ text, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return {
    top_positive: toList(positiveMap),
    top_negative: toList(negativeMap),
  };
}

export function buildSentimentKeywords(text, isPositive) {
  const normalizedText = normalizeKeywordTextSafe(text);
  const terms = isPositive ? POSITIVE_LEADERBOARD_TERMS : NEGATIVE_LEADERBOARD_TERMS;

  return terms
    .filter((item) => item.matches.some((term) => keywordMatches(normalizedText, term)))
    .map((item) => item.label);
}

export const POSITIVE_LEADERBOARD_TERMS = [
  { label: 'Ngon', matches: ['ngon', 'ngon qua', 'rat ngon'] },
  { label: 'Sạch sẽ', matches: ['sach', 'sach se'] },
  { label: 'Phục vụ nhanh', matches: ['phuc vu nhanh', 'len mon nhanh', 'giao hang nhanh', 'nhanh'] },
  { label: 'Nhân viên thân thiện', matches: ['nhan vien than thien', 'than thien', 'nhiet tinh', 'de thuong'] },
  { label: 'Đáng tiền', matches: ['dang tien', 'gia hop ly', 'gia re', 're'] },
  { label: 'Vừa miệng', matches: ['vua mieng', 'dam da', 'hop khau vi'] },
  { label: 'Thơm', matches: ['thom'] },
  { label: 'Tươi', matches: ['tuoi', 'tuoi ngon'] },
  { label: 'Không gian thoáng', matches: ['thoang', 'rong rai', 'khong gian rong'] },
  { label: 'Sẽ quay lại', matches: ['se quay lai', 'ung ho', 'se ung ho'] },
  { label: 'Tuyệt vời', matches: ['tuyet', 'tuyet voi', 'rat tot'] },
];

export const NEGATIVE_LEADERBOARD_TERMS = [
  { label: 'Thất vọng', matches: ['that vong'] },
  { label: 'Không ngon', matches: ['khong ngon', 'ko ngon', 'khong hop khau vi'] },
  { label: 'Chờ lâu', matches: ['cho lau', 'doi lau', 'lau', 'cham'] },
  { label: 'Phục vụ kém', matches: ['phuc vu kem', 'thai do', 'nhan vien kho chiu', 'khong ai nghe may'] },
  { label: 'Giá đắt', matches: ['gia dat', 'dat', 'hoi dat'] },
  { label: 'Không sạch', matches: ['khong sach', 'ban', 'mat ve sinh'] },
  { label: 'Đồ ăn nguội', matches: ['nguoi', 'do an nguoi'] },
  { label: 'Đồ ăn khô', matches: ['kho', 'bi kho'] },
  { label: 'Không tươi', matches: ['khong tuoi', 'kem tuoi'] },
  { label: 'Nhạt', matches: ['nhat'] },
  { label: 'Mặn', matches: ['man'] },
  { label: 'Chua', matches: ['chua'] },
  { label: 'Ồn ào', matches: ['on ao'] },
  { label: 'Khó chịu', matches: ['kho chiu'] },
  { label: 'Sai món', matches: ['sai mon', 'dat nham', 'nham'] },
];

export function buildBusinessLeaderboard(apiLeaderboard, reviews) {
  const apiPositive = normalizeLeaderboardItems(apiLeaderboard?.top_positive);
  const apiNegative = normalizeLeaderboardItems(apiLeaderboard?.top_negative);
  const fallback = buildLeaderboardFromReviews(reviews);

  return {
    top_positive: completeKeywordList(
      apiPositive.filter((item) => isPositiveKeyword(item.text)),
      normalizeLeaderboardItems(fallback.top_positive).filter((item) => isPositiveKeyword(item.text)),
    ),
    top_negative: completeKeywordList(
      apiNegative.filter((item) => isNegativeKeyword(item.text)),
      normalizeLeaderboardItems(fallback.top_negative).filter((item) => isNegativeKeyword(item.text)),
    ),
  };
}

export function completeKeywordList(primary, fallback) {
  const result = [];
  const seen = new Set();

  [...primary, ...fallback].forEach((item) => {
    const key = normalizeKeywordTextSafe(item.text);
    if (!key || seen.has(key) || result.length >= 5) return;
    seen.add(key);
    result.push(item);
  });

  return result;
}

export function normalizeLeaderboardItems(items = []) {
  return items
    .map((item) => ({
      text: String(item.text || item.keyword || item.name || '').trim(),
      value: Number(item.value || item.count || 0),
    }))
    .filter((item) => item.text && item.value > 0)
    .sort((a, b) => b.value - a.value);
}

export function normalizeKeywordTextSafe(text) {
  return String(text || '')
    .trim()
    .toLocaleLowerCase('vi-VN')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd');
}

export function isPositiveKeyword(text) {
  const word = normalizeKeywordTextSafe(text);
  const positiveTerms = [
    'ngon',
    'ngot',
    'sach',
    'tuyet',
    'tot',
    'nhanh',
    'than thien',
    'dang tien',
    'hai long',
    'vua mieng',
    'de thuong',
    'nhiet tinh',
    're',
    'dep',
    'thom',
    'gion',
    'mem',
    'dam da',
    'thoang',
    'rong rai',
  ];

  if (isNegativeKeyword(text)) return false;
  return positiveTerms.some((term) => word === term || word.includes(term));
}

export function isNegativeKeyword(text) {
  const word = normalizeKeywordTextSafe(text);
  const negativeTerms = [
    'te',
    'do',
    'lau',
    'cham',
    'ban',
    'hoi',
    'dat',
    'kem',
    'nhat',
    'man',
    'chua',
    'nong',
    'on ao',
    'that vong',
    'kho chiu',
    'thai do',
    'ngo doc',
    'dau bung',
    'ruoi',
    'di vat',
    'nguoi',
    'kho',
    'it',
    'doi',
    'khong ngon',
    'khong sach',
    'sai mon',
    'dat nham',
    'nham',
  ];

  return negativeTerms.some((term) => word === term || word.includes(term));
}
