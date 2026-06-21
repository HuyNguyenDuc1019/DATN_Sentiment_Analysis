import React, { useEffect, useMemo, useRef, useState } from 'react';
import { User, Shield, Sliders, Save, Check, Camera } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';

export default function ProfileContent() {
  const { user } = useAuth();
  const [profile, setProfile] = useState({ fullName: '', email: '', avatarUrl: '' });
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (!user) return;
    setProfile({
      fullName: user.user_metadata?.full_name || '',
      email: user.email || '',
      avatarUrl: user.user_metadata?.avatar_url || '',
    });

    supabase
      .from('profiles')
      .select('full_name,email,avatar_url')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setProfile({
            fullName: data.full_name || user.user_metadata?.full_name || '',
            email: data.email || user.email || '',
            avatarUrl: data.avatar_url || user.user_metadata?.avatar_url || '',
          });
        }
      });
  }, [user]);

  const initials = useMemo(() => {
    const source = profile.fullName.trim() || profile.email || 'U';
    return source.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  }, [profile]);

  const role = user?.app_metadata?.role || user?.user_metadata?.role || 'Người dùng';

  const saveProfile = async () => {
    if (!user?.id || !profile.fullName.trim() || !profile.email.includes('@')) {
      window.alert('Vui lòng nhập họ tên và email hợp lệ.');
      return;
    }

    setSaving(true);
    try {
      const authChanges = {
        data: {
          ...user.user_metadata,
          full_name: profile.fullName.trim(),
          avatar_url: profile.avatarUrl || null,
        },
      };
      if (profile.email.trim().toLowerCase() !== user.email?.toLowerCase()) {
        authChanges.email = profile.email.trim();
      }

      const { error: authError } = await supabase.auth.updateUser(authChanges);
      if (authError) throw authError;

      const { error: profileError } = await supabase.from('profiles').upsert({
        id: user.id,
        email: profile.email.trim(),
        full_name: profile.fullName.trim(),
        avatar_url: profile.avatarUrl || null,
      });
      if (profileError) throw profileError;

      window.dispatchEvent(new CustomEvent('profile-updated', {
        detail: {
          fullName: profile.fullName.trim(),
          email: profile.email.trim(),
          avatarUrl: profile.avatarUrl,
        },
      }));

      window.alert(profile.email.trim().toLowerCase() !== user.email?.toLowerCase()
        ? 'Đã lưu thông tin. Hãy kiểm tra email để xác nhận địa chỉ mới.'
        : 'Đã lưu thông tin cá nhân thành công!');
    } catch (error) {
      window.alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (!user?.email) return;
    if (!passwords.current || passwords.next.length < 6) {
      window.alert('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (passwords.next !== passwords.confirm) {
      window.alert('Mật khẩu xác nhận không khớp.');
      return;
    }

    setChangingPassword(true);
    try {
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwords.current,
      });
      if (verifyError) throw new Error('Mật khẩu hiện tại không đúng.');

      const { error: updateError } = await supabase.auth.updateUser({ password: passwords.next });
      if (updateError) throw updateError;

      setPasswords({ current: '', next: '', confirm: '' });
      window.alert('Đổi mật khẩu thành công!');
    } catch (error) {
      window.alert(error.message);
    } finally {
      setChangingPassword(false);
    }
  };

  const uploadAvatar = async (file) => {
    if (!user?.id || !file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      window.alert('Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      window.alert('Ảnh đại diện không được vượt quá 2MB.');
      return;
    }

    setUploadingAvatar(true);
    try {
      const avatarUrl = await compressAvatar(file);
      setProfile((current) => ({ ...current, avatarUrl }));
    } catch (error) {
      window.alert(error.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <div className="p-8 h-full flex flex-col font-sans animate-in fade-in duration-500 overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-wide mb-2">Hồ sơ cá nhân</h1>
        <p className="text-slate-400 text-sm">Quản lý thông tin và cài đặt bảo mật của bạn.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        <div className="lg:col-span-2 flex flex-col">
          <BasicInfoCard profile={profile} setProfile={setProfile} initials={initials} role={role} saving={saving} uploadingAvatar={uploadingAvatar} onAvatarChange={uploadAvatar} onSave={saveProfile} />
        </div>
        <div className="lg:col-span-1 flex flex-col gap-6">
          <SecurityCard passwords={passwords} setPasswords={setPasswords} loading={changingPassword} onChangePassword={changePassword} />
          <PreferencesCard />
        </div>
      </div>
    </div>
  );
}

function BasicInfoCard({ profile, setProfile, initials, role, saving, uploadingAvatar, onAvatarChange, onSave }) {
  const avatarInputRef = useRef(null);
  return (
    <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl p-6 md:p-8 flex flex-col h-full">
      <div className="flex items-center gap-3 mb-8"><User className="w-5 h-5 text-slate-300" /><h2 className="text-lg font-medium text-white">Thông tin cơ bản</h2></div>
      <div className="flex flex-col sm:flex-row gap-8 flex-1">
        <div className="flex-shrink-0">
          <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => { onAvatarChange(event.target.files?.[0]); event.target.value = ''; }} />
          <div className="relative w-24 h-24">
            <div className="w-24 h-24 rounded-full bg-indigo-500 overflow-hidden flex items-center justify-center text-white text-3xl font-medium shadow-lg shadow-indigo-500/20">
              {profile.avatarUrl ? <img src={profile.avatarUrl} alt="Ảnh đại diện" className="w-full h-full object-cover" /> : initials}
            </div>
            <button type="button" onClick={() => avatarInputRef.current?.click()} disabled={uploadingAvatar} title="Thay đổi ảnh đại diện" className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-700 border-2 border-slate-800 text-white flex items-center justify-center shadow-lg transition-colors disabled:opacity-60">
              {uploadingAvatar ? <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> : <Camera className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div className="flex-1 space-y-5">
          <div><label className="block text-xs font-medium text-slate-300 mb-2">Họ và tên</label><input type="text" value={profile.fullName} onChange={(event) => setProfile((current) => ({ ...current, fullName: event.target.value }))} className="w-full bg-white border border-transparent rounded-lg py-2.5 px-4 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" /></div>
          <div><label className="block text-xs font-medium text-slate-300 mb-2">Email doanh nghiệp</label><input type="email" value={profile.email} onChange={(event) => setProfile((current) => ({ ...current, email: event.target.value }))} className="w-full bg-white border border-transparent rounded-lg py-2.5 px-4 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" /></div>
          <div><label className="block text-xs font-medium text-slate-300 mb-2">Vai trò</label><span className="inline-flex items-center px-3 py-1.5 rounded-full bg-slate-700/50 border border-slate-600 text-xs font-medium text-slate-300">{role}</span></div>
        </div>
      </div>
      <div className="mt-8 pt-6 border-t border-slate-700/50 flex justify-end"><button onClick={onSave} disabled={saving} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-6 rounded-xl transition-colors shadow-lg shadow-indigo-600/20 disabled:opacity-60"><Save className="w-4 h-4" />{saving ? 'Đang lưu...' : 'Lưu thông tin'}</button></div>
    </div>
  );
}

function SecurityCard({ passwords, setPasswords, loading, onChangePassword }) {
  const change = (field) => (event) => setPasswords((current) => ({ ...current, [field]: event.target.value }));
  return (
    <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl p-6 flex flex-col">
      <div className="flex items-center gap-3 mb-6"><Shield className="w-5 h-5 text-slate-300" /><h2 className="text-lg font-medium text-white">Bảo mật tài khoản</h2></div>
      <div className="space-y-4">
        <PasswordField label="Mật khẩu hiện tại" value={passwords.current} onChange={change('current')} placeholder="Nhập mật khẩu hiện tại" />
        <PasswordField label="Mật khẩu mới" value={passwords.next} onChange={change('next')} placeholder="Nhập mật khẩu mới" />
        <PasswordField label="Xác nhận mật khẩu" value={passwords.confirm} onChange={change('confirm')} placeholder="Nhập lại mật khẩu mới" />
      </div>
      <button onClick={onChangePassword} disabled={loading} className="w-full mt-6 bg-slate-700 hover:bg-slate-600 text-white font-medium py-2.5 rounded-xl transition-colors text-sm disabled:opacity-60">{loading ? 'Đang đổi mật khẩu...' : 'Đổi mật khẩu'}</button>
    </div>
  );
}

function PasswordField({ label, value, onChange, placeholder }) {
  return <div><label className="block text-xs font-medium text-slate-300 mb-2">{label}</label><input type="password" value={value} onChange={onChange} placeholder={placeholder} autoComplete="new-password" className="w-full bg-white border border-transparent rounded-lg py-2 px-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" /></div>;
}

function PreferencesCard() {
  return (
    <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl p-6 flex flex-col">
      <div className="flex items-center gap-3 mb-6"><Sliders className="w-5 h-5 text-slate-300" /><h2 className="text-lg font-medium text-white">Tùy chọn hiển thị</h2></div>
      <div className="space-y-4">
        <PreferenceToggle title="Chế độ giao diện" description="Chế độ tối (Sáng/Tối)" active />
        <PreferenceToggle title="Email tóm tắt" description="Nhận báo cáo hàng tuần" active={false} />
      </div>
    </div>
  );
}

function PreferenceToggle({ title, description, active }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/30 border border-slate-700/50">
      <div><div className="text-sm font-medium text-slate-200">{title}</div><div className="text-[11px] text-slate-500 mt-0.5">{description}</div></div>
      <button type="button" aria-pressed={active} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-default ${active ? 'bg-emerald-500' : 'bg-slate-600'}`}>
        <span className={`${active ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm flex items-center justify-center`}>{active && <Check className="w-3 h-3 text-indigo-600" strokeWidth={3} />}</span>
      </button>
    </div>
  );
}

function compressAvatar(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      const maxSize = 384;
      const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext('2d');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);

      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL('image/jpeg', 0.75));
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Không thể đọc file ảnh đã chọn.'));
    };

    image.src = objectUrl;
  });
}
