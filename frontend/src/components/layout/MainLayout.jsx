import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopHeader from './TopHeader';

export default function MainLayout() {
  return (
    <div className="flex h-screen bg-slate-900 text-white font-sans overflow-hidden">
      {/* Sidebar gọi 1 lần duy nhất */}
      <Sidebar /> 
      
      <div className="flex flex-col flex-1">
        {/* Top Header gọi 1 lần duy nhất */}
        <TopHeader />
        
        {/* Ruột của từng trang sẽ được nhét vào đây (Dashboard, Cài đặt, Phản hồi...) */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
