import { supabase, isSyncEnabled } from './supabase';

export async function sendMagicLink(email, redirectTo) {
  if (!isSyncEnabled()) throw new Error('Sync not configured');
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo || window.location.origin },
  });
  if (error) throw error;
}

export async function signInWithPassword(email, password) {
  if (!isSyncEnabled()) throw new Error('Sync not configured');
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUpWithPassword(email, password, redirectTo) {
  if (!isSyncEnabled()) throw new Error('Sync not configured');
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectTo || window.location.origin,
      data: { has_password: true },
    },
  });
  if (error) throw error;
}

export async function sendPasswordReset(email, redirectTo) {
  if (!isSyncEnabled()) throw new Error('Sync not configured');
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectTo || `${window.location.origin}?reset=1`,
  });
  if (error) throw error;
}

export async function updatePassword(newPassword) {
  if (!isSyncEnabled()) throw new Error('Sync not configured');
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
    data: { has_password: true },
  });
  if (error) throw error;
}

export async function resendVerification(email) {
  if (!isSyncEnabled()) throw new Error('Sync not configured');
  const { error } = await supabase.auth.resend({ type: 'signup', email });
  if (error) throw error;
}

export async function userHasPassword() {
  if (!isSyncEnabled()) return false;
  const { data } = await supabase.auth.getUser();
  return Boolean(data?.user?.user_metadata?.has_password);
}

export async function signOut() {
  if (!isSyncEnabled()) return;
  await supabase.auth.signOut();
}

export async function getCurrentUser() {
  if (!isSyncEnabled()) return null;
  const { data } = await supabase.auth.getUser();
  return data?.user ?? null;
}

export function onAuthChange(callback) {
  if (!isSyncEnabled()) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
  return () => data.subscription.unsubscribe();
}
