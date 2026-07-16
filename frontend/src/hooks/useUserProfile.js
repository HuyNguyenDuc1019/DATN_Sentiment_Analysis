import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';

function getStoredRole() {
  return localStorage.getItem('userRole') || localStorage.getItem('user_role') || 'user';
}

function normalizeRole(role) {
  return String(role || '').trim().toLowerCase();
}

function formatRole(role) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === 'admin' || normalizedRole === 'administrator') {
    return 'Quản trị viên';
  }

  if (!normalizedRole || normalizedRole === 'user' || normalizedRole === 'member') {
    return 'Người dùng';
  }

  return role;
}

function getFallbackProfile(user) {
  return {
    fullName: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Người dùng',
    email: user?.email || '',
    avatarUrl: user?.user_metadata?.avatar_url || '',
    role: user?.app_metadata?.role || user?.user_metadata?.role || getStoredRole(),
    status: '',
  };
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
      .select('full_name,email,avatar_url,role,status')
      .eq('id', user.id)
      .maybeSingle();

    if (error || !data) {
      setProfile(fallback);
      return;
    }

    const rawRole = data.role || fallback.role || 'user';
    localStorage.setItem('userRole', rawRole);
    localStorage.setItem('user_role', rawRole);

    setProfile({
      fullName: data.full_name || fallback.fullName,
      email: data.email || fallback.email,
      avatarUrl: data.avatar_url || fallback.avatarUrl,
      role: rawRole,
      status: data.status || '',
    });
  }, [user]);

  useEffect(() => {
    loadProfile();

    const handleProfileUpdated = (event) => {
      if (event.detail) {
        setProfile((current) => {
          const nextRole = event.detail.role || current.role;
          if (nextRole) {
            localStorage.setItem('userRole', nextRole);
            localStorage.setItem('user_role', nextRole);
          }
          return { ...current, ...event.detail, role: nextRole };
        });
      } else {
        loadProfile();
      }
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
    return source
      .split(/\s+/)
      .filter(Boolean)
      .slice(-2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }, [profile.email, profile.fullName]);

  const role = formatRole(profile.role);

  return {
    ...profile,
    initials,
    role,
    roleLabel: role,
    rawRole: profile.role,
    isAdmin: normalizeRole(profile.role) === 'admin',
  };
}
