import { Camera, Save, User } from 'lucide-react';
import { useRef } from 'react';

export default function BasicInfoCard({
  profile,
  setProfile,
  initials,
  role,
  saving,
  uploadingAvatar,
  onAvatarChange,
  onSave,
}) {
  const avatarInputRef = useRef(null);

  return (
    <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl p-6 md:p-8 flex flex-col h-full">
      <div className="flex items-center gap-3 mb-8">
        <User className="w-5 h-5 text-slate-300" />
        <h2 className="text-lg font-medium text-white">Thông tin cơ bản</h2>
      </div>

      <div className="flex flex-col sm:flex-row gap-8 flex-1">
        <div className="flex-shrink-0">
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={(event) => {
              onAvatarChange(event.target.files?.[0]);
              event.target.value = '';
            }}
          />

          <div className="relative w-24 h-24">
            <div className="w-24 h-24 rounded-full bg-indigo-500 overflow-hidden flex items-center justify-center text-white text-3xl font-medium shadow-lg shadow-indigo-500/20">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="Ảnh đại diện" className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>

            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
              title="Thay đổi ảnh đại diện"
              className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-700 border-2 border-slate-800 text-white flex items-center justify-center shadow-lg transition-colors disabled:opacity-60"
            >
              {uploadingAvatar ? (
                <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-5">
          <ProfileInput
            label="Họ và tên"
            type="text"
            value={profile.fullName}
            onChange={(event) => setProfile((current) => ({ ...current, fullName: event.target.value }))}
          />

          <ProfileInput
            label="Email"
            type="email"
            value={profile.email}
            onChange={(event) => setProfile((current) => ({ ...current, email: event.target.value }))}
          />

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">Vai trò</label>
            <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-slate-700/50 border border-slate-600 text-xs font-medium text-slate-300">
              {role}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-slate-700/50 flex justify-end">
        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-6 rounded-xl transition-colors shadow-lg shadow-indigo-600/20 disabled:opacity-60"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Đang lưu...' : 'Lưu thông tin'}
        </button>
      </div>
    </div>
  );
}

function ProfileInput({ label, type, value, onChange }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-300 mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        className="w-full bg-white border border-transparent rounded-lg py-2.5 px-4 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
      />
    </div>
  );
}
