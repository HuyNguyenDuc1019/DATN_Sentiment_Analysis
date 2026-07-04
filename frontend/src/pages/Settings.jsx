import React, { useEffect, useState } from 'react';
import { 
  Palette, 
  BrainCircuit, 
  Database, 
  KeyRound, 
  ChevronDown, 
  X, 
  Copy, 
  Save 
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import UpgradeModal from '../components/common/UpgradeModal';

// --- MAIN COMPONENT ---

export default function SettingsContent() {
  const { userProfile, refreshUserProfile } = useAuth();
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const isVip = userProfile?.tier === 'vip';

  return (
    <div className="p-8 h-full flex flex-col font-sans animate-in fade-in duration-500 overflow-y-auto">
      
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white tracking-wide mb-1">
          Cài đặt hệ thống
        </h1>
        <p className="text-slate-400 text-sm">
          Quản lý cấu hình AI, giao diện và tích hợp dữ liệu.
        </p>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
        <UiUxCard />
        <AiLogicCard isVip={isVip} onUpgrade={() => setIsUpgradeModalOpen(true)} />
        <DataManagementCard />
        <ApiCard />
      </div>

      {/* Footer Action */}
      <div className="mt-8 flex justify-end">
        <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-6 rounded-xl transition-colors shadow-lg shadow-indigo-600/20">
          <Save className="w-4 h-4" />
          Lưu cấu hình
        </button>
      </div>

      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        onUpgraded={refreshUserProfile}
      />
    </div>
  );
}

// --- BỘ COMPONENTS PHỤ TRỢ ---

// 1. Cài đặt Giao diện (UI/UX)
function UiUxCard() {
  const getInitialDarkMode = () => {
    if (typeof window === 'undefined') return true;

    const savedTheme = localStorage.getItem('almotion-theme');
    if (savedTheme === 'light') return false;
    if (savedTheme === 'dark') return true;

    return document.documentElement.classList.contains('dark');
  };

  const [darkMode, setDarkMode] = useState(getInitialDarkMode);

  useEffect(() => {
    const theme = darkMode ? 'dark' : 'light';

    localStorage.setItem('almotion-theme', theme);
    document.documentElement.classList.toggle('dark', darkMode);
    document.documentElement.classList.toggle('light', !darkMode);

    window.dispatchEvent(new Event('almotion-theme-change'));
  }, [darkMode]);

  const toggleTheme = () => {
    setDarkMode((current) => !current);
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl p-6 flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-slate-900/50 flex items-center justify-center border border-slate-700/50">
          <Palette className="w-4 h-4 text-indigo-400" />
        </div>
        <h2 className="text-base font-medium text-white">Cài đặt Giao diện (UI/UX)</h2>
      </div>

      <div className="space-y-6 flex-1">
        {/* Toggle Theme */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-slate-300">Chế độ màn hình</div>
            <div className="text-xs text-slate-500 mt-0.5">
              {darkMode ? 'Đang dùng giao diện tối' : 'Đang dùng giao diện sáng'}
            </div>
          </div>
          {/* Custom Toggle (Active) */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-pressed={darkMode}
            className={`w-11 h-6 rounded-full flex items-center px-1 transition-colors relative cursor-pointer focus:outline-none ${
              darkMode ? 'bg-indigo-500' : 'bg-slate-300'
            }`}
            title={darkMode ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
          >
            <div
              className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform ${
                darkMode ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Display Density */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-2">
            Mật độ hiển thị
          </label>
          <div className="relative">
            <select className="w-full bg-slate-900/80 border border-slate-800 text-slate-300 text-sm rounded-lg py-2.5 pl-4 pr-10 appearance-none focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer">
              <option>Dạng lưới</option>
              <option>Dạng danh sách</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
}

// 2. Cài đặt cấu hình AI (AI Logic) - Có viền active
function AiLogicCard({ isVip, onUpgrade }) {
  return (
    <div className="relative overflow-hidden bg-slate-800/60 backdrop-blur-md border border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.05)] rounded-2xl p-6 flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-slate-900/50 flex items-center justify-center border border-slate-700/50">
          <BrainCircuit className="w-4 h-4 text-indigo-400" />
        </div>
        <h2 className="text-base font-medium text-white">Cài đặt cấu hình AI (AI Logic)</h2>
      </div>

      <div className={`space-y-6 flex-1 flex flex-col justify-center ${!isVip ? 'pointer-events-none blur-sm select-none' : ''}`}>
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-8">
            Điều chỉnh độ nhạy phân tích (Thresholds)
          </label>
          
          {/* Dual Range Slider Mockup */}
          <div className="px-2">
            <div className="relative h-1.5 w-full bg-slate-700/50 rounded-full">
              {/* Active Track */}
              <div className="absolute left-[35%] right-[25%] h-full bg-slate-600 rounded-full"></div>
              
              {/* Left Thumb (35%) */}
              <div className="absolute left-[35%] top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md border-2 border-indigo-500 cursor-pointer hover:scale-110 transition-transform"></div>
              
              {/* Right Thumb (75%) */}
              <div className="absolute left-[75%] top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md border-2 border-indigo-500 cursor-pointer hover:scale-110 transition-transform"></div>
            </div>

            {/* Threshold Labels */}
            <div className="flex justify-between items-center mt-4 text-[10px] sm:text-[11px] font-semibold tracking-wide">
              <span className="text-orange-400">Tích cực {'>'} 75%</span>
              <span className="text-slate-400">Trung tính: 35% - 75%</span>
              <span className="text-rose-400">Tiêu cực {'<'} 35%</span>
            </div>
          </div>
        </div>
      </div>

      {!isVip && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/45 backdrop-blur-sm">
          <button
            type="button"
            onClick={onUpgrade}
            className="rounded-xl border border-amber-400/30 bg-slate-950/80 px-5 py-3 text-sm font-semibold text-amber-200 shadow-lg transition-colors hover:bg-slate-900"
          >
            🔒 Nâng cấp VIP để dùng Từ điển tùy chỉnh & Khía cạnh
          </button>
        </div>
      )}
    </div>
  );
}

// 3. Quản lý Dữ liệu (Data Management)
function DataManagementCard() {
  return (
    <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl p-6 flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-slate-900/50 flex items-center justify-center border border-slate-700/50">
          <Database className="w-4 h-4 text-indigo-400" />
        </div>
        <h2 className="text-base font-medium text-white">Quản lý Dữ liệu (Data Management)</h2>
      </div>

      <div className="space-y-5 flex-1">
        {/* Max File Size */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-2">
            Dung lượng file tối đa (MB)
          </label>
          <input 
            type="number" 
            defaultValue={50}
            className="w-full bg-slate-900/80 border border-slate-800 text-slate-300 text-sm rounded-lg py-2.5 px-4 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Required Columns (Tag Input mock) */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-2">
            Cột tiêu đề bắt buộc
          </label>
          <div className="w-full bg-slate-900/80 border border-slate-800 rounded-lg p-1.5 flex flex-wrap items-center gap-2 min-h-[42px] focus-within:border-indigo-500 transition-colors">
            <span className="flex items-center gap-1.5 bg-slate-700/50 text-slate-300 px-2.5 py-1 rounded-md text-xs font-medium">
              content 
              <X className="w-3 h-3 text-slate-400 hover:text-rose-400 cursor-pointer transition-colors" />
            </span>
            <span className="flex items-center gap-1.5 bg-slate-700/50 text-slate-300 px-2.5 py-1 rounded-md text-xs font-medium">
              review 
              <X className="w-3 h-3 text-slate-400 hover:text-rose-400 cursor-pointer transition-colors" />
            </span>
            <input 
              type="text" 
              placeholder="Thêm cột..." 
              className="bg-transparent border-none focus:outline-none text-xs text-slate-300 placeholder-slate-500 w-24 ml-1"
            />
          </div>
        </div>

        {/* Export Format */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-2">
            Định dạng xuất báo cáo
          </label>
          <div className="relative">
            <select className="w-full bg-slate-900/80 border border-slate-800 text-slate-300 text-sm rounded-lg py-2.5 pl-4 pr-10 appearance-none focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer">
              <option>Excel (.xlsx)</option>
              <option>CSV (.csv)</option>
              <option>PDF (.pdf)</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
}

// 4. Tài khoản & Tích hợp (Profile & API)
function ApiCard() {
  return (
    <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl p-6 flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-slate-900/50 flex items-center justify-center border border-slate-700/50">
          <KeyRound className="w-4 h-4 text-indigo-400" />
        </div>
        <h2 className="text-base font-medium text-white">Tài khoản & Tích hợp (Profile & API)</h2>
      </div>

      <div className="space-y-4 flex-1 mt-2">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-2">
            Mã API định danh (Supabase)
          </label>
          <div className="relative">
            <input 
              type="text" 
              readOnly
              value="sk-ai-mtn-98f2a1b4c7d9e5f3..." 
              className="w-full bg-slate-900/80 border border-slate-800 text-slate-400 text-sm font-mono rounded-lg py-3 pl-4 pr-10 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors bg-slate-900">
              <Copy className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 font-medium">
            Bảo mật mã API này. Không chia sẻ công khai.
          </p>
        </div>
      </div>
    </div>
  );
}