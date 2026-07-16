import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../services/supabaseClient';

const AuthContext = createContext({
  user: null,
  session: null,
  userProfile: null,
  loading: true,
  profileLoading: true,
  refreshUserProfile: async () => null,
  signIn: async () => ({ data: null, error: null }),
  signUp: async () => ({ data: null, error: null }),
  signOut: async () => ({ error: null }),
});

function clearStoredAccountState() {
  localStorage.removeItem('userRole');
  localStorage.removeItem('user_role');
}

function storeProfileState(profile) {
  if (!profile) return;

  if (profile.role) {
    localStorage.setItem('userRole', profile.role);
    localStorage.setItem('user_role', profile.role);
  }

}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);

  const fetchUserProfile = useCallback(async (targetUserId) => {
    if (!targetUserId) {
      setUserProfile(null);
      setProfileLoading(false);
      return null;
    }

    setProfileLoading(true);

    try {
      const { data, error } = await supabase
  .from('profiles')
  .select(
    'id, email, full_name, avatar_url, role, status, created_at',
  )
  .eq('id', targetUserId)
  .maybeSingle();

      if (error) throw error;

      const profile = data || null;
      setUserProfile(profile);
      storeProfileState(profile);
      return profile;
    } catch (error) {
      console.error('Không thể tải hồ sơ người dùng:', error);
      setUserProfile(null);
      return null;
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const refreshUserProfile = useCallback(async () => {
    const currentUserId = user?.id || session?.user?.id;
    return fetchUserProfile(currentUserId);
  }, [fetchUserProfile, session?.user?.id, user?.id]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;

      const nextSession = data.session ?? null;
      const nextUser = nextSession?.user ?? null;

      setSession(nextSession);
      setUser(nextUser);
      setLoading(false);

      if (nextUser?.id) {
        await fetchUserProfile(nextUser.id);
      } else {
        clearStoredAccountState();
        setUserProfile(null);
        setProfileLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      const nextUser = nextSession?.user ?? null;

      setSession(nextSession ?? null);
      setUser(nextUser);
      setLoading(false);

      if (nextUser?.id) {
        await fetchUserProfile(nextUser.id);
      } else {
        clearStoredAccountState();
        setUserProfile(null);
        setProfileLoading(false);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  const value = useMemo(
    () => ({
      session,
      user,
      userProfile,
      loading,
      profileLoading,
      refreshUserProfile,
      signIn: (email, password) =>
        supabase.auth.signInWithPassword({
          email: String(email || '').trim().toLowerCase(),
          password,
        }),
      signUp: (email, password, fullName) =>
        supabase.auth.signUp({
          email: String(email || '').trim().toLowerCase(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: String(fullName || '').trim() },
          },
        }),
      signOut: async () => {
        clearStoredAccountState();
        setUserProfile(null);
        return supabase.auth.signOut();
      },
    }),
    [session, user, userProfile, loading, profileLoading, refreshUserProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

export default AuthContext;
