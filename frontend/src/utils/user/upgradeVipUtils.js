export const VIP_FEATURES = [
  'Phân tích dữ liệu <strong>không giới hạn</strong>.',
  'Upload file Excel/CSV cực lớn (lên đến 50MB).',
  'Lưu trữ lịch sử phân tích vĩnh viễn.',
  'Sử dụng <strong>Từ điển Khía cạnh tùy chỉnh</strong> của riêng bạn.',
];

export function delayPaymentMock(milliseconds = 2000) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
