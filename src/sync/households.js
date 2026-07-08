import { supabase } from './supabase';
import { generateInviteToken } from '../utils/inviteToken';

export async function createHousehold(name, displayName) {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');

  const { data: household, error } = await supabase
    .from('households')
    .insert({ name, created_by: user.id })
    .select()
    .single();
  if (error) throw error;

  const { error: memberError } = await supabase
    .from('household_members')
    .insert({
      household_id: household.id,
      user_id: user.id,
      role: 'admin',
      display_name: displayName,
    });
  if (memberError) throw memberError;

  return household;
}

export async function getMyHouseholds() {
  const { data, error } = await supabase
    .from('household_members')
    .select('household_id, role, display_name, joined_at, households(*)');
  if (error) throw error;
  return data.map(row => ({
    ...row.households,
    role: row.role,
    displayName: row.display_name,
    joinedAt: row.joined_at,
  }));
}

export async function getHouseholdMembers(householdId) {
  const { data, error } = await supabase
    .from('household_members')
    .select('user_id, role, display_name, joined_at')
    .eq('household_id', householdId);
  if (error) throw error;
  return data;
}

export async function createInvite(householdId) {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');
  const token = generateInviteToken();
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from('household_invites')
    .insert({
      token,
      household_id: householdId,
      created_by: user.id,
      expires_at: expiresAt,
    });
  if (error) throw error;
  return { token, expiresAt };
}

export async function redeemInvite(token, displayName) {
  const { data, error } = await supabase.rpc('redeem_invite', {
    p_token: token,
    p_display_name: displayName,
  });
  if (error) {
    const code = ['invite_not_found', 'invite_used', 'invite_expired'].find((c) =>
      error.message.includes(c),
    );
    throw new Error(code || error.message);
  }
  return data;
}

export async function leaveHousehold(householdId) {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');
  const { error } = await supabase
    .from('household_members')
    .delete()
    .eq('household_id', householdId)
    .eq('user_id', user.id);
  if (error) throw error;
}
