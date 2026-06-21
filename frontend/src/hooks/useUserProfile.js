import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';

function getFallbackProfile(user) {
  return {
    fullName: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Người dùng',
    email: user?.email || '',
    avatarUrl: user?.user_metadata?.avatar_url || '',
  };
}

function formatRole(user) {
  const role = user?.app_metadata?.role || user?.user_metadata?.role || 'Người dùng';
  const normalizedRole = String(role).trim().toLowerCase();

  if (normalizedRole === 'admin' || normalizedRole === 'administrator') {
    return 'Quản trị viên';
  }

  if (normalizedRole === 'user' || normalizedRole === 'member') {
    return 'Người dùng';
  }

  return role;
}

export function useUserProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(() => getFallbackProfile(user));

  const loadProfile = useCallback(async () => {
    if (!user?.id) {
      setProfile(getFallbackProfile(user));
      return;
    }

    const fallback = getFallbackProfile(user);
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name,email,avatar_url')
      .eq('id', user.id)
      .maybeSingle();

    if (error || !data) {
      setProfile(fallback);
      return;
    }

    setProfile({
      fullName: data.full_name || fallback.fullName,
      email: data.email || fallback.email,
      avatarUrl: data.avatar_url || fallback.avatarUrl,
    });
  }, [user]);

  useEffect(() => {
    loadProfile();

    const handleProfileUpdated = (event) => {
      if (event.detail) setProfile((current) => ({ ...current, ...event.detail }));
      else loadProfile();
    };

    window.addEventListener('profile-updated', handleProfileUpdated);
    window.addEventListener('focus', loadProfile);
    return () => {
      window.removeEventListener('profile-updated', handleProfileUpdated);
      window.removeEventListener('focus', loadProfile);
    };
  }, [loadProfile]);

  const initials = useMemo(() => {
    const source = profile.fullName.trim() || profile.email || 'U';
    return source.split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]).join('').toUpperCase();
  }, [profile.email, profile.fullName]);

  return { ...profile, initials, role: formatRole(user) };
}
