export function getStoredPreferences() {
  return {
    darkMode: localStorage.getItem('almotion-theme') !== 'light',
    weeklyEmail: localStorage.getItem('almotion-weekly-email') === 'true',
  };
}

export function applyProfilePreferences(preferences) {
  document.documentElement.classList.toggle('dark', preferences.darkMode);
  document.documentElement.classList.toggle('light', !preferences.darkMode);

  localStorage.setItem('almotion-theme', preferences.darkMode ? 'dark' : 'light');
  localStorage.setItem('almotion-weekly-email', String(preferences.weeklyEmail));

  window.dispatchEvent(new Event('almotion-theme-change'));
}

export function getInitials(fullName, email) {
  const source = String(fullName || '').trim() || email || 'U';

  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export function getRoleLabel(rawRole) {
  const normalizedRole = String(rawRole || 'user').trim().toLowerCase();

  if (normalizedRole === 'admin' || normalizedRole === 'administrator') {
    return 'Quản trị viên';
  }

  if (normalizedRole === 'user' || normalizedRole === 'member') {
    return 'Người dùng';
  }

  return rawRole;
}

export function compressAvatar(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      const maxSize = 384;
      const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement('canvas');

      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext('2d');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);

      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL('image/jpeg', 0.75));
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Không thể đọc file ảnh đã chọn.'));
    };

    image.src = objectUrl;
  });
}
