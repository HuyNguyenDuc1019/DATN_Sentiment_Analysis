export function formatDatasetType(type) {
  const value = String(type || '').toLowerCase();

  if (value === 'csv') return 'CSV';
  if (value === 'foody') return 'Foody';
  if (value === 'goole') return 'Goole';

  return 'URL';
}

export function formatVietnameseDate(value) {
  if (!value) return 'Không rõ';

  try {
    return new Date(value).toLocaleDateString('vi-VN');
  } catch {
    return 'Không rõ';
  }
}
