import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, Users, Settings, Menu, X, Sparkles, ArrowLeft } from 'lucide-react';
import { getAdminRoleLabel, getDisplayInitials } from './adminHelpers';

const AdminLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [adminProfile, setAdminProfile] = useState({
    full_name: 'Admin User',
    email: '',
    role: 'admin',
    avatar_url: '',
  });

  useEffect(() => {
    let isMounted = true;

    const loadAdminProfile = async () => {
      try {
        const { supabase } = await import('../../services/supabaseClient');
        const { data: authData } = await supabase.auth.getUser();
        const user = authData?.user;

        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name,email,avatar_url,role')
          .eq('id', user.id)
          .maybeSingle();

        if (isMounted) {
          setAdminProfile({
            full_name: profile?.full_name || user.user_metadata?.full_name || user.email || 'Admin User',
            email: profile?.email || user.email || '',
            role: profile?.role || 'admin',
            avatar_url: profile?.avatar_url || '',
          });
        }
      } catch {
        if (isMounted) {
          setAdminProfile((prev) => ({
            ...prev,
            full_name: localStorage.getItem('fullName') || localStorage.getItem('full_name') || prev.full_name,
            email: localStorage.getItem('email') || prev.email,
            role: localStorage.getItem('role') || prev.role,
          }));
        }
      }
    };

    loadAdminProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const initials = getDisplayInitials(adminProfile.full_name, adminProfile.email);

  const getLinkClass = ({ isActive }) => isActive
    ? 'flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-600 text-white font-medium transition-colors'
    : 'flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors';

  return (
    <div className="flex h-screen bg-slate-900 text-white font-sans overflow-hidden">
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 flex-shrink-0 flex flex-col h-full bg-[#0f172a] border-r border-slate-800 transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:static'}
        `}
      >
        <div className="flex items-center justify-between px-6 py-8">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-indigo-400" fill="currentColor" />
            <span className="text-white text-xl font-bold tracking-wide">Almotion</span>
          </div>
          <button
            className="lg:hidden text-slate-400 hover:text-white"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          <NavLink to="/admin/dashboard" className={getLinkClass} onClick={() => setIsMobileMenuOpen(false)}>
            <LayoutDashboard className="w-5 h-5" />Bảng điều khiển
          </NavLink>
          <NavLink to="/admin/feedback" className={getLinkClass} onClick={() => setIsMobileMenuOpen(false)}>
            <MessageSquare className="w-5 h-5" />Quản lý Phản hồi
          </NavLink>
          <NavLink to="/admin/users" className={getLinkClass} onClick={() => setIsMobileMenuOpen(false)}>
            <Users className="w-5 h-5" />Quản lý Người dùng
          </NavLink>
          <NavLink to="/admin/settings" className={getLinkClass} onClick={() => setIsMobileMenuOpen(false)}>
            <Settings className="w-5 h-5" />Cài đặt hệ thống
          </NavLink>
        </nav>

        <div className="px-4 pb-4 space-y-1">
          <Link to="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors">
            <ArrowLeft className="w-5 h-5" />Về trang khách
          </Link>
        </div>

        <Link to="/admin/profile" className="p-4 mx-4 mb-6 mt-2 rounded-xl border border-slate-800 flex items-center gap-3 hover:bg-slate-800/50 transition-colors cursor-pointer">
          <div className="w-10 h-10 flex-shrink-0 rounded-full bg-indigo-600 overflow-hidden flex items-center justify-center text-white font-semibold text-sm">
            {adminProfile.avatar_url ? (
              <img src={adminProfile.avatar_url} alt={adminProfile.full_name} className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-white text-sm font-medium" title={adminProfile.full_name}>
              {adminProfile.full_name}
            </span>
            <span className="truncate text-slate-500 text-xs" title={adminProfile.email || getAdminRoleLabel(adminProfile.role)}>
              {getAdminRoleLabel(adminProfile.role)}
            </span>
          </div>
        </Link>
      </aside>

      <div className="flex flex-col flex-1 min-w-0">
        <header className="h-20 flex-shrink-0 bg-[#0f172a] border-b border-slate-800 flex items-center justify-between px-8">
          <div className="flex items-center gap-3">
            <button
              className="text-slate-400 hover:text-white lg:hidden"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-medium text-slate-200 lg:hidden">Menu Admin</span>
          </div>

          <div className="flex items-center gap-5 ml-auto">
            <Link
              to="/admin/profile"
              title="Mở hồ sơ quản trị viên"
              className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 overflow-hidden flex items-center justify-center text-slate-300 font-semibold text-xs cursor-pointer hover:border-indigo-400 transition-colors"
            >
              {adminProfile.avatar_url ? (
                <img src={adminProfile.avatar_url} alt={adminProfile.full_name} className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-900">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;