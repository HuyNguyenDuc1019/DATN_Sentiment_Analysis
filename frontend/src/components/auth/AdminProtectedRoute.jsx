import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useUserProfile } from '../../hooks/useUserProfile';

export default function AdminProtectedRoute() {
  const { user, loading } = useAuth();
  const { isAdmin, roleLabel, loading: profileLoading } = useUserProfile();
  const location = useLocation();

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-slate-950 p-8 text-slate-300">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl flex-col justify-center">
          <div className="mb-8 space-y-3">
            <div className="h-8 w-64 animate-pulse rounded-xl bg-slate-800" />
            <div className="h-4 w-96 max-w-full animate-pulse rounded-lg bg-slate-800/80" />
          </div>
          <div className="h-72 animate-pulse rounded-2xl border border-slate-800 bg-slate-900/70" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  if (!isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-950 p-6 text-white">
        <div className="max-w-lg rounded-2xl border border-rose-500/40 bg-rose-500/10 p-8 shadow-2xl">
          <ShieldCheck className="mb-4 h-10 w-10 text-rose-300" />
          <h1 className="text-2xl font-bold">Tài khoản chưa có quyền quản trị</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            Tài khoản hiện tại đang được nhận diện là {roleLabel || 'Người dùng'}. Chỉ tài khoản có vai trò Quản trị viên
            mới xem được khu vực Admin.
          </p>
          <a
            href="/dashboard"
            className="mt-6 inline-flex rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Về trang khách
          </a>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
