import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../services/supabaseClient';

const AuthContext = createContext({
  user: null,
  session: null,
  loading: true,
  signIn: async () => ({ data: null, error: null }),
  signUp: async () => ({ data: null, error: null }),
  signOut: async () => ({ error: null }),
});

function clearStoredAccountState() {
  localStorage.removeItem('userRole');
  localStorage.removeItem('user_role');
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
      setUser(nextSession?.user ?? null);
      setLoading(false);

      if (!nextSession?.user) {
        clearStoredAccountState();
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      session,
      user,
      loading,
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
        return supabase.auth.signOut();
      },
    }),
    [session, user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

export default AuthContext;
