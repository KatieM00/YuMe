import { supabase } from './supabase';

// =========================================================================
// TYPES
// =========================================================================

export interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  partner_id: string | null;
  invite_code: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface PartnerInfo {
  id: string;
  email: string;
  display_name: string | null;
  timezone: string;
}

// =========================================================================
// GET CURRENT USER'S PROFILE
// =========================================================================

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.error('No authenticated user');
    return null;
  }

  // Try to fetch the profile
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.error('Error fetching user profile:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return null;
  }

  // If profile doesn't exist, create it
  if (!data) {
    console.log('No profile found, creating one...');
    const inviteCode = Math.random().toString(36).substring(2, 10);

    const { data: newProfile, error: createError } = await supabase
      .from('user_profiles')
      .insert([{
        id: user.id,
        email: user.email || '',
        invite_code: inviteCode,
        timezone: 'Europe/London'
      }])
      .select()
      .single();

    if (createError) {
      console.error('Error creating user profile:', createError);
      return null;
    }

    return newProfile;
  }

  return data;
}

// =========================================================================
// GET PARTNER INFO
// =========================================================================

export async function getPartnerInfo(): Promise<PartnerInfo | null> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Use the SECURITY DEFINER function to get partner info
  // This bypasses RLS to avoid infinite recursion
  const { data, error } = await supabase
    .rpc('get_partner_profile', { user_id: user.id });

  if (error) {
    console.error('Error fetching partner info:', error);
    return null;
  }

  // The RPC returns an array, get the first item
  if (!data || data.length === 0) {
    return null;
  }

  return data[0];
}

// =========================================================================
// LINK PARTNER ACCOUNT
// =========================================================================

export async function linkPartnerAccount(inviteCode: string): Promise<{ success: boolean; message: string }> {
  const { data, error } = await supabase.rpc('link_partner_account', {
    invite_code_input: inviteCode,
  });

  if (error) {
    console.error('Error linking partner:', error);
    return { success: false, message: error.message || 'Failed to link partner' };
  }

  return data as { success: boolean; message: string };
}

// =========================================================================
// UNLINK PARTNER ACCOUNT
// =========================================================================

export async function unlinkPartnerAccount(): Promise<{ success: boolean; message: string }> {
  const { data, error } = await supabase.rpc('unlink_partner_account');

  if (error) {
    console.error('Error unlinking partner:', error);
    return { success: false, message: error.message || 'Failed to unlink partner' };
  }

  return data as { success: boolean; message: string };
}

// =========================================================================
// UPDATE DISPLAY NAME
// =========================================================================

export async function updateDisplayName(displayName: string): Promise<boolean> {
  const { error } = await supabase
    .from('user_profiles')
    .update({ display_name: displayName })
    .eq('id', (await supabase.auth.getUser()).data.user?.id);

  if (error) {
    console.error('Error updating display name:', error);
    return false;
  }

  return true;
}

// =========================================================================
// UPDATE TIMEZONE
// =========================================================================

export async function updateTimezone(timezone: string): Promise<boolean> {
  const { error } = await supabase
    .from('user_profiles')
    .update({ timezone })
    .eq('id', (await supabase.auth.getUser()).data.user?.id);

  if (error) {
    console.error('Error updating timezone:', error);
    return false;
  }

  return true;
}
