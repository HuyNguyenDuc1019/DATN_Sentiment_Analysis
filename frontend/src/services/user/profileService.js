import { supabase } from '../supabaseClient';

export async function fetchProfileById(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('full_name,email,avatar_url,role,status,tier')
    .eq('id', userId)
    .maybeSingle();

  return data;
}

export async function updateUserProfile({ user, fullName, email, avatarUrl }) {
  const authChanges = {
    data: {
      ...user.user_metadata,
      full_name: fullName,
      avatar_url: avatarUrl || null,
    },
  };

  if (email.trim().toLowerCase() !== user.email?.toLowerCase()) {
    authChanges.email = email;
  }

  const { error: authError } = await supabase.auth.updateUser(authChanges);
  if (authError) throw authError;

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: user.id,
    email,
    full_name: fullName,
    avatar_url: avatarUrl || null,
  });

  if (profileError) throw profileError;
}

export async function verifyCurrentPassword({ email, password }) {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error('Mật khẩu hiện tại không đúng.');
  }
}

export async function changeUserPassword(nextPassword) {
  const { error } = await supabase.auth.updateUser({
    password: nextPassword,
  });

  if (error) throw error;
}
