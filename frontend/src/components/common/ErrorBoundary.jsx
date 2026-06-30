import React from 'react';
import { AlertTriangle, Home, RotateCcw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || 'Giao diện gặp lỗi khi tải trang.',
    };
  }

  componentDidCatch(error, info) {
    console.error('App render error:', error, info);
  }

  reloadPage = () => {
    window.location.reload();
  };

  backToLogin = () => {
    window.location.href = '/';
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100">
        <section className="w-full max-w-xl rounded-3xl border border-rose-500/30 bg-slate-900 p-8 shadow-2xl shadow-rose-950/25">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-300">
            <AlertTriangle className="h-7 w-7" />
          </div>

          <h1 className="text-2xl font-bold text-white">Trang chưa tải được</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Một phần giao diện đang gặp lỗi nên hệ thống đã dừng lại để tránh màn hình trắng. Bạn có thể tải lại trang
            hoặc quay về màn hình đăng nhập rồi vào lại.
          </p>

          {this.state.message ? (
            <div className="mt-5 rounded-2xl border border-slate-700 bg-slate-950/70 p-4 text-sm text-slate-300">
              {this.state.message}
            </div>
          ) : null}

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={this.reloadPage}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-950/30 transition hover:bg-indigo-500"
            >
              <RotateCcw className="h-4 w-4" />
              Tải lại trang
            </button>
            <button
              type="button"
              onClick={this.backToLogin}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-700"
            >
              <Home className="h-4 w-4" />
              Về đăng nhập
            </button>
          </div>
        </section>
      </main>
    );
  }
}
