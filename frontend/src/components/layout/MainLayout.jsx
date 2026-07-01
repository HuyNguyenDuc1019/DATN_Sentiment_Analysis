import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopHeader from './TopHeader';
import Footer from './Footer';

export default function MainLayout() {
  return (
    <div className="flex h-screen bg-slate-900 text-white font-sans overflow-hidden">
      <Sidebar />

      <div className="flex flex-col flex-1 min-w-0">
        <TopHeader />

        <main className="flex-1 overflow-y-auto">
         
          <div className="flex flex-col min-h-full">
            <Outlet />
            <Footer />
          </div>
        </main>
      </div>
      
    </div>
  );
}