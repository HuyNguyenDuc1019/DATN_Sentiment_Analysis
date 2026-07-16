export const DEFAULT_SETTINGS = {
  ai_threshold: 0.5,
  max_upload_size: 5,
  data_retention_days: 30,
  custom_dictionary: 'ngộ độc, đau bụng, ruồi, thái độ, tẩy chay, dị vật, chửi, tệ',
  crisis_alert_enabled: true,
  aspect_dictionary: {
    'Món ăn': 'mì cay, trà sữa, mặn, nhạt, nguội, ngon, dở, sống, cháy, chua, ngọt, đậm đà, vừa miệng, đồ ăn, nước lẩu, thịt bò, hải sản',
    'Dịch vụ': 'nhân viên, bảo vệ, quản lý, thái độ, chậm, lâu, nhiệt tình, chửi, phục vụ, order, lên món, giao hàng',
    'Không gian': 'máy lạnh, nóng, bẩn, dơ, sạch, chỗ để xe, ồn ào, rộng rãi, thoáng mát, nhà vệ sinh, decor, view',
  },
  // THÊM 3 MẢNG TỪ KHÓA MẶC ĐỊNH
  danger_keywords: [],
  positive_keywords: [],
  negative_signal_keywords: [],
};

export function normalizeSettingsForUi(data) {
  const loadedAspects = data.aspect_dictionary || {};
  const uiAspects = {};

  Object.keys(loadedAspects).forEach((key) => {
    uiAspects[key] = Array.isArray(loadedAspects[key])
      ? loadedAspects[key].join(', ')
      : loadedAspects[key];
  });

  return {
    ai_threshold: data.ai_threshold ?? 0.75,
    max_upload_size: data.max_upload_size ?? 5,
    data_retention_days: data.data_retention_days ?? 30,
    custom_dictionary: data.custom_dictionary ?? '',
    crisis_alert_enabled: data.crisis_alert_enabled ?? true,
    aspect_dictionary: uiAspects,
    // ĐẢM BẢO DỮ LIỆU TỪ DB LUÔN LÀ MẢNG
    danger_keywords: Array.isArray(data.danger_keywords) ? data.danger_keywords : [],
    positive_keywords: Array.isArray(data.positive_keywords) ? data.positive_keywords : [],
    negative_signal_keywords: Array.isArray(data.negative_signal_keywords) ? data.negative_signal_keywords : [],
  };
}

export function isSettingsDirty(settings, originalSettings) {
  return JSON.stringify(settings) !== JSON.stringify(originalSettings);
}

export function normalizeImportedSettings(importedData) {
  if (!importedData || typeof importedData !== 'object' || !Object.prototype.hasOwnProperty.call(importedData, 'ai_threshold')) {
    throw new Error('File không đúng định dạng cấu hình của Almotion.');
  }

  return importedData;
}

export function splitUniqueKeywords(value) {
  return Array.from(new Set(
    String(value || '')
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter((item) => item !== ''),
  ));
}

export function buildSettingsPayload(settings) {
  const finalAspectDict = {};

  Object.keys(settings.aspect_dictionary).forEach((key) => {
    const value = settings.aspect_dictionary[key];

    finalAspectDict[key] = Array.from(new Set(
      String(value || '')
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter((item) => item !== ''),
    ));
  });

  const finalCustomDict = splitUniqueKeywords(settings.custom_dictionary).join(', ');

  // Hàm dọn dẹp mảng từ khóa cảm xúc: Xóa khoảng trắng, bỏ dòng rỗng, và lọc trùng lặp
  const cleanArray = (arr) => {
    if (!Array.isArray(arr)) return [];
    return Array.from(new Set(arr.map((item) => item.trim()).filter(Boolean)));
  };

  const payload = {
    ...settings,
    custom_dictionary: finalCustomDict,
    aspect_dictionary: finalAspectDict,
    // LÀM SẠCH DỮ LIỆU TRƯỚC KHI GỬI LÊN API
    danger_keywords: cleanArray(settings.danger_keywords),
    positive_keywords: cleanArray(settings.positive_keywords),
    negative_signal_keywords: cleanArray(settings.negative_signal_keywords),
  };

  const savedUiAspects = {};

  Object.keys(finalAspectDict).forEach((key) => {
    savedUiAspects[key] = finalAspectDict[key].join(', ');
  });

  const savedSettings = {
    ...payload,
    aspect_dictionary: savedUiAspects,
  };

  return {
    payload,
    savedSettings,
  };
}