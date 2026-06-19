import { BarChart2, LayoutDashboard, Link as LinkIcon, List, LogOut, MessageSquare, Settings, Sparkles } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const links = [
  ['/dashboard', LayoutDashboard, 'Bảng điều khiển'],
  ['/url-analyzer', LinkIcon, 'Phân tích URL'],
  ['/batch-prediction', List, 'Dự đoán hàng loạt'],
  ['/feedback', MessageSquare, 'Trung tâm phản hồi'],
  ['/report', BarChart2, 'Báo cáo'],
  ['/settings', Settings, 'Cài đặt'],
];

export default function Sidebar() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const logout = async () => { await signOut(); navigate('/', { replace: true }); };

  return (
    <aside className="flex h-full w-20 flex-shrink-0 flex-col border-r border-slate-800 bg-slate-950 lg:w-64">
      <div className="flex items-center justify-center gap-3 px-4 py-6 lg:justify-start lg:px-6 lg:py-8"><Sparkles className="h-6 w-6 text-indigo-400" fill="currentColor" /><span className="hidden text-xl font-bold text-white lg:block">Almotion</span></div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 lg:px-4">
        {links.map(([path, Icon, label]) => <NavLink key={path} to={path} title={label} className={({ isActive }) => `flex items-center justify-center gap-3 rounded-xl px-3 py-3 transition lg:justify-start lg:px-4 ${isActive ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'}`}><Icon className="h-5 w-5 shrink-0" /><span className="hidden lg:block">{label}</span></NavLink>)}
      </nav>
      <button onClick={logout} className="m-3 flex items-center justify-center gap-3 rounded-xl px-3 py-3 text-slate-400 transition hover:bg-slate-800 hover:text-white lg:justify-start lg:px-4"><LogOut className="h-5 w-5" /><span className="hidden lg:block">Đăng xuất</span></button>
    </aside>
  );
}
