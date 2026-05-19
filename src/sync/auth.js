import { supabase, isSyncEnabled } from './supabase';

export async function sendMagicLink(email, redirectTo) {
  if (!isSyncEnabled()) throw new Error('Sync not configured');
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo || window.location.origin },
  });
  if (error) throw error;
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
