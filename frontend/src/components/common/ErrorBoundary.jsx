import React from 'react';
import { AlertTriangle, Home, RotateCcw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('App render error:', error, info);
  }

  reloadPage = () => {
    window.location.reload();
  };

  backToDashboard = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <section className="w-full max-w-lg rounded-3xl border border-rose-500/25 bg-slate-900/90 p-7 shadow-2xl shadow-rose-950/20">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-300">
            <AlertTriangle className="h-7 w-7" />
          </div>

          <h1 className="text-2xl font-bold text-white">Giao diện gặp lỗi tạm thời</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Một phần màn hình chưa tải đúng. Bạn có thể tải lại trang hoặc quay về Bảng điều khiển
            để tiếp tục sử dụng các chức năng khác.
          </p>

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
              onClick={this.backToDashboard}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-700"
            >
              <Home className="h-4 w-4" />
              Về Bảng điều khiển
            </button>
          </div>
        </section>
      </main>
    );
  }
}
