import React from 'react';
import { 
  User, 
  Shield, 
  Sliders, 
  Save, 
  Check 
} from 'lucide-react';

// --- MAIN COMPONENT ---

export default function ProfileContent() {
  return (
    <div className="p-8 h-full flex flex-col font-sans animate-in fade-in duration-500 overflow-y-auto">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-wide mb-2">
          Hồ sơ cá nhân
        </h1>
        <p className="text-slate-400 text-sm">
          Quản lý thông tin và cài đặt bảo mật của bạn.
        </p>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        
        {/* Left Column: Basic Info */}
        <div className="lg:col-span-2 flex flex-col">
          <BasicInfoCard />
        </div>

        {/* Right Column: Security & Preferences */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <SecurityCard />
          <PreferencesCard />
        </div>

      </div>
    </div>
  );
}

// --- BỘ COMPONENTS PHỤ TRỢ ---

// 1. Thẻ Thông tin cơ bản (Basic Info)
function BasicInfoCard() {
  return (
    <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl p-6 md:p-8 flex flex-col h-full">
      
      {/* Card Header */}
      <div className="flex items-center gap-3 mb-8">
        <User className="w-5 h-5 text-slate-300" />
        <h2 className="text-lg font-medium text-white">Thông tin cơ bản</h2>
      </div>

      {/* Profile Form Area */}
      <div className="flex flex-col sm:flex-row gap-8 flex-1">
        
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="w-24 h-24 rounded-full bg-indigo-500 flex items-center justify-center text-white text-3xl font-medium shadow-lg shadow-indigo-500/20">
            NV
          </div>
        </div>

        {/* Form Fields */}
        <div className="flex-1 space-y-5">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Họ và tên
            </label>
            <input 
              type="text" 
              defaultValue="Nguyễn Văn A" 
              className="w-full bg-white border border-transparent rounded-lg py-2.5 px-4 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>

          {/* Business Email */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Email doanh nghiệp
            </label>
            <input 
              type="email" 
              defaultValue="nguyenvana@almotion.vn" 
              className="w-full bg-white border border-transparent rounded-lg py-2.5 px-4 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Vai trò
            </label>
            <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-slate-700/50 border border-slate-600 text-xs font-medium text-slate-300">
              Quản trị viên
            </span>
          </div>
        </div>

      </div>

      {/* Bottom Action */}
      <div className="mt-8 pt-6 border-t border-slate-700/50 flex justify-end">
        <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-6 rounded-xl transition-colors shadow-lg shadow-indigo-600/20">
          <Save className="w-4 h-4" />
          Lưu thông tin
        </button>
      </div>

    </div>
  );
}

// 2. Thẻ Bảo mật tài khoản (Account Security)
function SecurityCard() {
  return (
    <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl p-6 flex flex-col">
      
      {/* Card Header */}
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-5 h-5 text-slate-300" />
        <h2 className="text-lg font-medium text-white">Bảo mật tài khoản</h2>
      </div>

      {/* Password Form */}
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-2">
            Mật khẩu hiện tại
          </label>
          <input 
            type="password" 
            defaultValue="********" 
            className="w-full bg-white border border-transparent rounded-lg py-2 px-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>
        
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-2">
            Mật khẩu mới
          </label>
          <input 
            type="password" 
            placeholder="Nhập mật khẩu mới" 
            className="w-full bg-white border border-transparent rounded-lg py-2 px-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-2">
            Xác nhận mật khẩu
          </label>
          <input 
            type="password" 
            placeholder="Nhập lại mật khẩu mới" 
            className="w-full bg-white border border-transparent rounded-lg py-2 px-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>
      </div>

      <button className="w-full mt-6 bg-slate-700 hover:bg-slate-600 text-white font-medium py-2.5 rounded-xl transition-colors text-sm">
        Đổi mật khẩu
      </button>

    </div>
  );
}

// 3. Thẻ Tùy chọn hiển thị (Display Preferences)
function PreferencesCard() {
  return (
    <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl p-6 flex flex-col">
      
      {/* Card Header */}
      <div className="flex items-center gap-3 mb-6">
        <Sliders className="w-5 h-5 text-slate-300" />
        <h2 className="text-lg font-medium text-white">Tùy chọn hiển thị</h2>
      </div>

      {/* Toggles */}
      <div className="space-y-4">
        
        {/* Theme Toggle (Active) */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/30 border border-slate-700/50">
          <div>
            <div className="text-sm font-medium text-slate-200">Chế độ giao diện</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Chế độ tối (Sáng/Tối)</div>
          </div>
          {/* Active Switch */}
          <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-emerald-500 transition-colors focus:outline-none">
            <span className="translate-x-6 inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm flex items-center justify-center">
              <Check className="w-3 h-3 text-indigo-600" strokeWidth={3} />
            </span>
          </button>
        </div>

        {/* Email Toggle (Inactive) */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/30 border border-slate-700/50">
          <div>
            <div className="text-sm font-medium text-slate-200">Email tóm tắt</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Nhận báo cáo hàng tuần</div>
          </div>
          {/* Inactive Switch */}
          <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-600 transition-colors focus:outline-none">
            <span className="translate-x-1 inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm"></span>
          </button>
        </div>

      </div>

    </div>
  );
}