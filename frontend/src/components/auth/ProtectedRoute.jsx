import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 p-8 text-slate-300">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl flex-col justify-center">
          <div className="mb-8 space-y-3">
            <div className="h-8 w-64 animate-pulse rounded-xl bg-slate-800" />
            <div className="h-4 w-96 max-w-full animate-pulse rounded-lg bg-slate-800/80" />
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-32 animate-pulse rounded-2xl border border-slate-800 bg-slate-900/70" />
            ))}
          </div>
          <div className="mt-5 h-72 animate-pulse rounded-2xl border border-slate-800 bg-slate-900/70" />
        </div>
      </div>
    );
  }

  return user ? <Outlet /> : <Navigate to="/" replace state={{ from: location.pathname }} />;
}
