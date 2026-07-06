import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { useAuth } from '../../contexts/AuthContext';

import BasicInfoCard from '../../components/user/profile/BasicInfoCard';
import SecurityCard from '../../components/user/profile/SecurityCard';
import PreferencesCard from '../../components/user/profile/PreferencesCard';

import {
  applyProfilePreferences,
  compressAvatar,
  getInitials,
  getRoleLabel,
  getStoredPreferences,
} from '../../utils/user/profileUtils';

import {
  changeUserPassword,
  fetchProfileById,
  updateUserProfile,
  verifyCurrentPassword,
} from '../../services/user/profileService';

export default function Profile() {
  const { user } = useAuth();

  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    avatarUrl: '',
    role: 'user',
  });
  const [passwords, setPasswords] = useState({
    current: '',
    next: '',
    confirm: '',
  });
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [preferences, setPreferences] = useState(() => getStoredPreferences());

  useEffect(() => {
    applyProfilePreferences(preferences);
  }, [preferences]);

  useEffect(() => {
    if (!user) return;

    setProfile({
      fullName: user.user_metadata?.full_name || '',
      email: user.email || '',
      avatarUrl: user.user_metadata?.avatar_url || '',
      role: localStorage.getItem('userRole') || localStorage.getItem('user_role') || user.app_metadata?.role || user.user_metadata?.role || 'user',
    });

    fetchProfileById(user.id).then((data) => {
      if (data) {
        const rawRole = data.role || localStorage.getItem('userRole') || localStorage.getItem('user_role') || 'user';

        localStorage.setItem('userRole', rawRole);
        localStorage.setItem('user_role', rawRole);

        setProfile({
          fullName: data.full_name || user.user_metadata?.full_name || '',
          email: data.email || user.email || '',
          avatarUrl: data.avatar_url || user.user_metadata?.avatar_url || '',
          role: rawRole,
        });
      }
    });
  }, [user]);

  const initials = useMemo(() => getInitials(profile.fullName, profile.email), [profile.fullName, profile.email]);
  const role = getRoleLabel(profile.role || user?.app_metadata?.role || user?.user_metadata?.role || 'user');

  const saveProfile = async () => {
    if (!user?.id || !profile.fullName.trim() || !profile.email.includes('@')) {
      toast.error('Vui lòng nhập họ tên và email hợp lệ.');
      return;
    }

    setSaving(true);

    try {
      const emailChanged = profile.email.trim().toLowerCase() !== user.email?.toLowerCase();

      await updateUserProfile({
        user,
        fullName: profile.fullName.trim(),
        email: profile.email.trim(),
        avatarUrl: profile.avatarUrl,
      });

      window.dispatchEvent(new CustomEvent('profile-updated', {
        detail: {
          fullName: profile.fullName.trim(),
          email: profile.email.trim(),
          avatarUrl: profile.avatarUrl,
          role: profile.role,
        },
      }));

      toast.success(
        emailChanged
          ? 'Đã lưu thông tin. Hãy kiểm tra email để xác nhận địa chỉ mới.'
          : 'Đã lưu thông tin cá nhân thành công!',
      );
    } catch (error) {
      toast.error(error.message || 'Không lưu được thông tin.');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (!user?.email) return;

    if (!passwords.current || passwords.next.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }

    if (passwords.next !== passwords.confirm) {
      toast.error('Mật khẩu xác nhận không khớp.');
      return;
    }

    setChangingPassword(true);

    try {
      await verifyCurrentPassword({
        email: user.email,
        password: passwords.current,
      });

      await changeUserPassword(passwords.next);

      setPasswords({ current: '', next: '', confirm: '' });
      toast.success('Đổi mật khẩu thành công!');
    } catch (error) {
      toast.error(error.message || 'Không đổi được mật khẩu.');
    } finally {
      setChangingPassword(false);
    }
  };

  const uploadAvatar = async (file) => {
    if (!user?.id || !file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ảnh đại diện không được vượt quá 2MB.');
      return;
    }

    setUploadingAvatar(true);

    try {
      const avatarUrl = await compressAvatar(file);
      setProfile((current) => ({ ...current, avatarUrl }));
      toast.success('Đã chọn ảnh mới. Bấm Lưu thông tin để cập nhật.');
    } catch (error) {
      toast.error(error.message || 'Không đọc được ảnh đã chọn.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const togglePreference = (key) => {
    const next = { ...preferences, [key]: !preferences[key] };
    setPreferences(next);

    toast.success(
      key === 'darkMode'
        ? `Đã chuyển sang chế độ ${next.darkMode ? 'tối' : 'sáng'}.`
        : `${next.weeklyEmail ? 'Đã bật' : 'Đã tắt'} email tóm tắt hàng tuần.`,
      { id: `profile-${key}` },
    );
  };

  return (
    <div className="p-8 h-full flex flex-col font-sans animate-in fade-in duration-500 overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-wide mb-2">Hồ sơ cá nhân</h1>
        <p className="text-slate-400 text-sm">Quản lý thông tin và cài đặt bảo mật của bạn.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        <div className="lg:col-span-2 flex flex-col">
          <BasicInfoCard
            profile={profile}
            setProfile={setProfile}
            initials={initials}
            role={role}
            saving={saving}
            uploadingAvatar={uploadingAvatar}
            onAvatarChange={uploadAvatar}
            onSave={saveProfile}
          />
        </div>

        <div className="lg:col-span-1 flex flex-col gap-6">
          <SecurityCard
            passwords={passwords}
            setPasswords={setPasswords}
            loading={changingPassword}
            onChangePassword={changePassword}
          />

          <PreferencesCard
            preferences={preferences}
            onToggle={togglePreference}
          />
        </div>
      </div>
    </div>
  );
}
