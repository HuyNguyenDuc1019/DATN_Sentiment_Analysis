import React from 'react';
import { Search, History, Bell } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function TopHeader() {
  const { user } = useAuth();
  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Người dùng';
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  return (
    <header className="h-20 flex-shrink-0 bg-[#0f172a] border-b border-slate-800 flex items-center justify-between px-8">
      
      {/* Search Bar */}
      <div className="relative w-[480px]">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input 
          type="text" 
          placeholder="Tìm kiếm tài liệu, phân tích..." 
          className="w-full bg-[#1e293b] border-none text-sm text-slate-200 placeholder-slate-500 rounded-full py-2.5 pl-11 pr-4 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {/* Right Header Actions */}
      <div className="flex items-center gap-5">
        <button className="text-slate-400 hover:text-white transition-colors">
          <History className="w-5 h-5" />
        </button>
        
        <button className="relative text-slate-400 hover:text-white transition-colors">
          <Bell className="w-5 h-5" />
          {/* Notification Badge */}
          <span className="absolute 0 right-0.5 top-0 w-2 h-2 bg-indigo-500 rounded-full ring-2 ring-[#0f172a]"></span>
        </button>

        {/* Header Avatar */}
        <div className="w-8 h-8 ml-2 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-slate-300 font-semibold text-xs cursor-pointer hover:bg-slate-600 transition-colors">
          {initials}
        </div>
      </div>
      
    </header>
  );
}
