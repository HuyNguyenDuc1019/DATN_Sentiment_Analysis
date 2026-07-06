import { Bell, BrainCircuit, CreditCard, Database } from 'lucide-react';

const tabs = [
  { id: 'ai', label: 'Cấu hình AI', icon: <BrainCircuit size={18} /> },
  { id: 'notifications', label: 'Thông báo', icon: <Bell size={18} /> },
  { id: 'billing', label: 'Gói & Thanh toán', icon: <CreditCard size={18} /> },
  { id: 'data', label: 'Quản lý Dữ liệu', icon: <Database size={18} /> },
];

export default function SettingsTabs({ activeTab, onTabChange }) {
  return (
    <div className="w-full md:w-64 flex-shrink-0">
      <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-2 border border-slate-700/50">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all mb-1 ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
