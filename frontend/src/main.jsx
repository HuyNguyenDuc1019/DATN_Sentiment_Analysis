import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { TaskProvider } from './contexts/TaskContext.jsx';
import toast, { Toaster } from 'react-hot-toast';

const toastStyle = {
  minWidth: '320px',
  maxWidth: '520px',
  padding: '14px 18px',
  background: 'rgba(15, 23, 42, 0.96)',
  color: '#f8fafc',
  border: '1px solid rgba(99, 102, 241, 0.28)',
  borderRadius: '18px',
  boxShadow: '0 24px 70px rgba(2, 6, 23, 0.48)',
  backdropFilter: 'blur(16px)',
  lineHeight: '1.45',
  fontSize: '14px',
  fontWeight: 500,
};

const recentToastKeys = new Map();
const TOAST_DEDUPE_TIME = 6000;

function formatToastMessage(message) {
  if (!message) return 'Có thông báo mới.';
  if (typeof message === 'string') return message;
  if (message.message) return String(message.message);
  if (message.detail) return String(message.detail);
  if (message.error) return String(message.error);

  try {
    const text = JSON.stringify(message);
    if (!text || text === '{}') return 'Thao tác chưa thành công. Vui lòng kiểm tra lại thông tin.';
    return text;
  } catch {
    return 'Thao tác chưa thành công. Vui lòng kiểm tra lại thông tin.';
  }
}

function normalizeToastKey(type, message) {
  return `${type}:${formatToastMessage(message).trim().toLowerCase()}`;
}

function shouldShowToast(key) {
  const now = Date.now();
  const lastShownAt = recentToastKeys.get(key);

  if (lastShownAt && now - lastShownAt < TOAST_DEDUPE_TIME) {
    return false;
  }

  recentToastKeys.set(key, now);

  for (const [savedKey, savedAt] of recentToastKeys.entries()) {
    if (now - savedAt > TOAST_DEDUPE_TIME) {
      recentToastKeys.delete(savedKey);
    }
  }

  return true;
}

const originalToast = toast.bind(toast);
const originalSuccess = toast.success.bind(toast);
const originalError = toast.error.bind(toast);

toast.success = (message, options = {}) => {
  const key = options.id || normalizeToastKey('success', message);
  if (!shouldShowToast(key)) return key;
  return originalSuccess(formatToastMessage(message), { ...options, id: key });
};

toast.error = (message, options = {}) => {
  const key = options.id || normalizeToastKey('error', message);
  if (!shouldShowToast(key)) return key;
  return originalError(formatToastMessage(message), { ...options, id: key });
};

toast.custom = toast.custom;

window.alert = (message) => {
  const key = normalizeToastKey('alert', message);
  if (!shouldShowToast(key)) return;
  originalToast(formatToastMessage(message), {
    id: key,
    duration: 4200,
    style: toastStyle,
  });
};

createRoot(document.getElementById('root')).render(
  <AuthProvider>
    <TaskProvider>
      <App />
    </TaskProvider>
    <Toaster
      position="top-center"
      containerStyle={{
        top: 28,
      }}
      toastOptions={{
        duration: 4200,
        style: toastStyle,
        success: {
          style: {
            ...toastStyle,
            border: '1px solid rgba(16, 185, 129, 0.35)',
            boxShadow: '0 24px 70px rgba(16, 185, 129, 0.16)',
          },
          iconTheme: {
            primary: '#10b981',
            secondary: '#ecfdf5',
          },
        },
        error: {
          style: {
            ...toastStyle,
            border: '1px solid rgba(244, 63, 94, 0.38)',
            boxShadow: '0 24px 70px rgba(244, 63, 94, 0.16)',
          },
          iconTheme: {
            primary: '#f43f5e',
            secondary: '#fff1f2',
          },
        },
      }}
    />
  </AuthProvider>,
);
