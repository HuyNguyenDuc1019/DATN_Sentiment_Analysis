import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { useUserProfile } from '../../hooks/useUserProfile';
import HelpCenterModal from '../help/HelpCenterModal';
import UpgradeModal from '../common/UpgradeModal';
import {
  BarChart2,
  HelpCircle,
  LayoutDashboard,
  Link as LinkIcon,
  List,
  LogOut,
  MessageSquare,
  Settings,
  ShieldCheck,
  Sparkles,
  Crown,
  Scale,
} from 'lucide-react';

export default function Sidebar() {
  const location = useLocation();
  const { signOut, userProfile, refreshUserProfile } = useAuth();
  const { fullName, avatarUrl, initials, role, isAdmin } = useUserProfile();

  const [helpOpen, setHelpOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const isVip = userProfile?.tier === 'vip';

  const getLinkClass = (path) =>
    location.pathname === path
      ? 'flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-600 text-white font-medium transition-colors'
      : 'flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors';

  const handleSignOut = () => {
    toast.success('Đã đăng xuất khỏi hệ thống.');
    signOut();
  };

  return (
    <>
      <aside className="w-64 flex-shrink-0 flex flex-col h-full bg-[#0f172a] border-r border-slate-800">
        <div className="flex items-center gap-3 px-6 py-8">
          <Sparkles className="w-6 h-6 text-indigo-400" fill="currentColor" />
          <span className="text-white text-xl font-bold tracking-wide">Almotion</span>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          <Link to="/dashboard" className={getLinkClass('/dashboard')}>
            <LayoutDashboard className="w-5 h-5" />Bảng điều khiển
          </Link>
          <Link to="/url-analyzer" className={getLinkClass('/url-analyzer')}>
            <LinkIcon className="w-5 h-5" />Trình phân tích URL
          </Link>
          <Link to="/compare" className={getLinkClass('/compare')}>
            <Scale className="w-5 h-5" />So sánh quán
          </Link>
          <Link to="/batch-prediction" className={getLinkClass('/batch-prediction')}>
            <List className="w-5 h-5" />Dự đoán hàng loạt
          </Link>
          <Link to="/feedback" className={getLinkClass('/feedback')}>
            <MessageSquare className="w-5 h-5" />Trung tâm phản hồi
          </Link>
          <Link to="/report" className={getLinkClass('/report')}>
            <BarChart2 className="w-5 h-5" />Báo cáo
          </Link>
          <Link to="/settings" className={getLinkClass('/settings')}>
            <Settings className="w-5 h-5" />Cài đặt
          </Link>
          {isAdmin && (
            <Link to="/admin/dashboard" className={getLinkClass('/admin/dashboard')}>
              <ShieldCheck className="w-5 h-5" />Trang quản trị
            </Link>
          )}
        </nav>

        <div className="px-4 mb-2 mt-auto">
          {isVip ? (
            <div className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500/15 to-indigo-500/15 border border-amber-400/30 text-amber-200 shadow-[0_0_15px_rgba(251,191,36,0.12)]">
              <Crown size={20} className="text-yellow-400" />
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-5">Tài khoản VIP</p>
                <p className="text-[11px] text-amber-100/70">Đã mở khóa toàn bộ tính năng</p>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsUpgradeModalOpen(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-900/50 to-purple-900/50 border border-indigo-500/30 text-white hover:border-indigo-400 hover:shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-all duration-300"
            >
              <Crown size={20} className="text-yellow-400" />
              <span className="font-semibold text-sm">Nâng cấp VIP</span>
            </button>
          )}
        </div>

        <div className="px-4 pb-4 space-y-1">
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors"
          >
            <HelpCircle className="w-5 h-5" />Trợ giúp
          </button>
          <Link
            to="/"
            onClick={handleSignOut}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors"
          >
            <LogOut className="w-5 h-5" />Đăng xuất
          </Link>
        </div>

        <Link
          to="/profile"
          className="m-4 rounded-xl border border-slate-800 bg-slate-900/40 p-4 flex items-center gap-3 hover:border-indigo-500/50 transition-colors"
        >
          <div className="relative w-10 h-10 rounded-full bg-indigo-600 overflow-hidden flex items-center justify-center text-white font-semibold">
            {avatarUrl ? (
              <img src={avatarUrl} alt={`Ảnh đại diện của ${fullName}`} className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-white text-sm font-semibold truncate">{fullName}</p>
              {isVip && <Crown size={13} className="shrink-0 text-yellow-400" fill="currentColor" />}
            </div>
            <p className="text-slate-500 text-xs">{isVip ? 'VIP' : role}</p>
          </div>
        </Link>
      </aside>

      {helpOpen && <HelpCenterModal onClose={() => setHelpOpen(false)} />}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        onUpgraded={refreshUserProfile}
      />
    </>
  );
}
