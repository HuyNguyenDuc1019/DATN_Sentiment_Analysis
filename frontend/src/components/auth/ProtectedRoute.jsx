import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-slate-950 text-slate-300">Đang kiểm tra phiên đăng nhập...</div>;
  }

  return user ? <Outlet /> : <Navigate to="/" replace state={{ from: location.pathname }} />;
}
