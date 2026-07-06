export const SOURCE_OPTIONS = ['Tất cả', 'CSV', 'Foody', 'Shopee'];

export function getSourceName(sourceUrl = '') {
  if (sourceUrl === 'CSV_Upload') return 'CSV';
  if (sourceUrl.toLowerCase().includes('foody')) return 'Foody';
  if (sourceUrl.toLowerCase().includes('shopee')) return 'Shopee';
  return 'Khác';
}

export function toAnalyticsSource(source) {
  if (source === 'CSV') return 'CSV_Upload';
  if (source === 'Foody') return 'Foody';
  if (source === 'Shopee') return 'Shopee';
  return 'all';
}

export function wordColor(sentiment) {
  if (sentiment === 'positive') return '#34d399';
  if (sentiment === 'negative') return '#fb7185';
  return '#cbd5e1';
}

export function scaleWord(value, min, max) {
  if (max === min) return 22;
  return Math.round(14 + ((value - min) / (max - min)) * 28);
}

export function extractWordCloud(payload) {
  const words = payload?.wordcloud || payload?.data?.wordcloud;
  return Array.isArray(words) ? normalizeWordCloudWords(words) : null;
}

export function buildWordCloudFromReviews(reviews) {
  return normalizeWordCloudWords(
    reviews.flatMap((item) => {
      const sentiment = Number(item.ai_label) === 1 ? 'positive' : 'negative';
      return extractReportKeywords(item).map((keyword) => ({
        text: keyword,
        value: 1,
        sentiment,
      }));
    }),
  );
}

export function extractReportKeywords(item) {
  if (Array.isArray(item.keywords)) return item.keywords;

  if (typeof item.keywords === 'string') {
    return item.keywords
      .split(',')
      .map((word) => word.trim())
      .filter(Boolean);
  }

  return [];
}

export function normalizeWordCloudWords(words) {
  const counts = new Map();

  words.forEach((word) => {
    const classified = classifyWordCloudKeyword(word?.text, word?.sentiment);
    if (!classified) return;

    const key = `${normalizeText(classified.text)}|${classified.sentiment}`;
    const current = counts.get(key) || { ...classified, value: 0 };
    current.value += Math.max(1, Number(word?.value || 1));
    counts.set(key, current);
  });

  return [...counts.values()]
    .sort((a, b) => b.value - a.value)
    .slice(0, 36);
}

export function classifyWordCloudKeyword(rawText, rawSentiment) {
  const text = cleanKeyword(rawText);
  if (!text) return null;

  const normalized = normalizeText(text);
  const sentiment = normalizeSentiment(rawSentiment);
  const positive = findKeywordLabel(normalized, POSITIVE_WORD_CLOUD_TERMS);
  const negative = findKeywordLabel(normalized, NEGATIVE_WORD_CLOUD_TERMS);

  if (negative) return { text: negative, sentiment: 'negative' };
  if (positive && sentiment !== 'negative') return { text: positive, sentiment: 'positive' };
  if (positive && sentiment === 'negative') return null;

  return null;
}

export function findKeywordLabel(normalizedText, terms) {
  const match = terms.find((item) =>
    item.matches.some((term) => normalizedText.includes(normalizeText(term))),
  );

  return match?.label || null;
}

export function cleanKeyword(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/[.,;:!?()[\]{}"'`]/g, '')
    .trim();
}

export function normalizeSentiment(value) {
  const sentiment = normalizeText(value);

  if (['positive', 'pos', '1', 'true', 'tich cuc', 'hai long', 'khach hai long'].includes(sentiment)) return 'positive';
  if (['negative', 'neg', '0', 'false', 'tieu cuc', 'chua hai long', 'khach chua hai long'].includes(sentiment)) return 'negative';

  return 'neutral';
}

export function normalizeText(value) {
  return String(value || '')
    .toLocaleLowerCase('vi-VN')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export const POSITIVE_WORD_CLOUD_TERMS = [
  { label: 'Ngon', matches: ['ngon', 'ngon quá', 'rất ngon', 'đậm đà', 'vừa miệng'] },
  { label: 'Sạch sẽ', matches: ['sạch', 'sạch sẽ', 'vệ sinh'] },
  { label: 'Phục vụ tốt', matches: ['phục vụ tốt', 'phục vụ nhanh', 'nhiệt tình', 'thân thiện'] },
  { label: 'Nhân viên thân thiện', matches: ['nhân viên thân thiện', 'nhân viên nhiệt tình', 'nhân viên vui vẻ'] },
  { label: 'Giá hợp lý', matches: ['giá hợp lý', 'giá rẻ', 'đáng tiền', 'giá ổn'] },
  { label: 'Không gian tốt', matches: ['không gian', 'thoáng', 'rộng rãi', 'mát mẻ'] },
  { label: 'Giao nhanh', matches: ['giao nhanh', 'lên món nhanh', 'ra món nhanh'] },
  { label: 'Đóng gói kỹ', matches: ['đóng gói', 'gói kỹ', 'đóng gói kỹ'] },
  { label: 'Sẽ quay lại', matches: ['quay lại', 'ủng hộ', 'ghé lại'] },
];

export const NEGATIVE_WORD_CLOUD_TERMS = [
  { label: 'Không ngon', matches: ['không ngon', 'dở', 'tệ', 'nhạt', 'khó ăn', 'thất vọng'] },
  { label: 'Chờ lâu', matches: ['chờ lâu', 'đợi lâu', 'lâu', 'chậm', 'quá lâu'] },
  { label: 'Phục vụ kém', matches: ['phục vụ kém', 'thái độ', 'khó chịu', 'không thân thiện'] },
  { label: 'Nhân viên chưa tốt', matches: ['nhân viên tệ', 'nhân viên khó chịu', 'nhân viên chậm'] },
  { label: 'Giá cao', matches: ['giá cao', 'đắt', 'mắc', 'không đáng tiền'] },
  { label: 'Quá mặn', matches: ['mặn', 'quá mặn'] },
  { label: 'Quá ngọt', matches: ['ngọt gắt', 'quá ngọt'] },
  { label: 'Không sạch', matches: ['bẩn', 'không sạch', 'mất vệ sinh'] },
  { label: 'Sai món', matches: ['sai món', 'thiếu món', 'nhầm món'] },
  { label: 'Đóng gói kém', matches: ['đổ', 'tràn', 'bể', 'đóng gói kém'] },
  { label: 'Khó tìm quán', matches: ['khó tìm', 'địa chỉ khó tìm'] },
];
