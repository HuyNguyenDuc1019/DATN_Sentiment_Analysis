import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import toast, { Toaster } from 'react-hot-toast'

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
}

window.alert = (message) => {
  toast(String(message || 'Có thông báo mới.'), {
    duration: 4200,
    style: toastStyle,
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
      <Toaster
        position="top-center"
        containerStyle={{
          top: 28,
        }}
        toastOptions={{
          duration: 3800,
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
    </AuthProvider>
  </StrictMode>,
)
