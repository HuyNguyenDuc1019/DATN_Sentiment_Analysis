import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Sparkles, 
  LayoutDashboard, 
  Link as LinkIcon, 
  List, 
  MessageSquare, 
  BarChart2, 
  Settings, 
  HelpCircle, 
  LogOut 
} from 'lucide-react';

export default function Sidebar() {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Người dùng';
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

  const getLinkClass = (path) => {
    const isActive = location.pathname === path;
    return isActive 
      ? "flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-600 text-white font-medium transition-colors"
      : "flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors";
  };

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col h-full bg-[#0f172a] border-r border-slate-800">
      
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-8">
        <Sparkles className="w-6 h-6 text-indigo-400" fill="currentColor" />
        <span className="text-white text-xl font-bold tracking-wide">Almotion</span>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        <Link to="/dashboard" className={getLinkClass('/dashboard')}>
          <LayoutDashboard className="w-5 h-5" />
          Bảng điều khiển
        </Link>
        <Link to="/url-analyzer" className={getLinkClass('/url-analyzer')}>
          <LinkIcon className="w-5 h-5" />
          Trình phân tích URL
        </Link>
        <Link to="/batch-prediction" className={getLinkClass('/batch-prediction')}>
          <List className="w-5 h-5" />
          Dự đoán hàng loạt
        </Link>
        <Link to="/feedback" className={getLinkClass('/feedback')}>
          <MessageSquare className="w-5 h-5" />
          Trung tâm phản hồi
        </Link>
        <Link to="/report" className={getLinkClass('/report')}>
          <BarChart2 className="w-5 h-5" />
          Báo cáo
        </Link>
        <Link to="/settings" className={getLinkClass('/settings')}>
          <Settings className="w-5 h-5" />
          Cài đặt
        </Link>
      </nav>

      {/* Bottom Actions */}
      <div className="px-4 pb-4 space-y-1">
        <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors">
          <HelpCircle className="w-5 h-5" />
          Trợ giúp
        </a>
        <Link to="/" onClick={() => signOut()} className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors">
          <LogOut className="w-5 h-5" />
          Đăng xuất
        </Link>
      </div>

      {/* User Profile */}
      <Link to="/profile" className="p-4 mx-4 mb-6 mt-2 rounded-xl border border-slate-800 flex items-center gap-3 hover:bg-slate-800/50 transition-colors cursor-pointer block">
        <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
          {initials}
        </div>
        <div className="flex flex-col">
          <span className="text-white text-sm font-medium">Nguyễn Văn A</span>
          <span className="text-slate-500 text-xs">Quản trị viên</span>
        </div>
      </Link>
      
    </aside>
  );
}
