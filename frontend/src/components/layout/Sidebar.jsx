import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useUserProfile } from '../../hooks/useUserProfile';
import { Sparkles, LayoutDashboard, Link as LinkIcon, List, MessageSquare, BarChart2, Settings, HelpCircle, LogOut } from 'lucide-react';

export default function Sidebar() {
  const location = useLocation();
  const { signOut } = useAuth();
  const { fullName, avatarUrl, initials, role } = useUserProfile();

  const getLinkClass = (path) => location.pathname === path
    ? 'flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-600 text-white font-medium transition-colors'
    : 'flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors';

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col h-full bg-[#0f172a] border-r border-slate-800">
      <div className="flex items-center gap-3 px-6 py-8"><Sparkles className="w-6 h-6 text-indigo-400" fill="currentColor" /><span className="text-white text-xl font-bold tracking-wide">Almotion</span></div>
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        <Link to="/dashboard" className={getLinkClass('/dashboard')}><LayoutDashboard className="w-5 h-5" />Bảng điều khiển</Link>
        <Link to="/url-analyzer" className={getLinkClass('/url-analyzer')}><LinkIcon className="w-5 h-5" />Trình phân tích URL</Link>
        <Link to="/batch-prediction" className={getLinkClass('/batch-prediction')}><List className="w-5 h-5" />Dự đoán hàng loạt</Link>
        <Link to="/feedback" className={getLinkClass('/feedback')}><MessageSquare className="w-5 h-5" />Trung tâm phản hồi</Link>
        <Link to="/report" className={getLinkClass('/report')}><BarChart2 className="w-5 h-5" />Báo cáo</Link>
        <Link to="/settings" className={getLinkClass('/settings')}><Settings className="w-5 h-5" />Cài đặt</Link>
      </nav>
      <div className="px-4 pb-4 space-y-1">
        <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors"><HelpCircle className="w-5 h-5" />Trợ giúp</a>
        <Link to="/" onClick={() => signOut()} className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors"><LogOut className="w-5 h-5" />Đăng xuất</Link>
      </div>
      <Link to="/profile" className="p-4 mx-4 mb-6 mt-2 rounded-xl border border-slate-800 flex items-center gap-3 hover:bg-slate-800/50 transition-colors cursor-pointer">
        <div className="w-10 h-10 flex-shrink-0 rounded-full bg-indigo-600 overflow-hidden flex items-center justify-center text-white font-semibold text-sm">
          {avatarUrl ? <img src={avatarUrl} alt={`Ảnh đại diện của ${fullName}`} className="w-full h-full object-cover" /> : initials}
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-white text-sm font-medium" title={fullName}>{fullName}</span>
          <span className="truncate text-slate-500 text-xs" title={role}>{role}</span>
        </div>
      </Link>
    </aside>
  );
}
