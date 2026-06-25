import { supabase } from './client'

/** The identity row — the single source of truth for display name + guest flag. */
export interface ProfileRow {
  displayName: string
  isAnonymous: boolean
}

export async function loadProfile(userId: string): Promise<ProfileRow | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('profiles')
    .select('display_name, is_anonymous')
    .eq('id', userId)
    .maybeSingle()
  if (error || !data) return null
  return {
    displayName: (data.display_name as string) ?? 'Mortal',
    isAnonymous: (data.is_anonymous as boolean) ?? true,
  }
}

/** Update the player's display name (the profiles row is the cloud source of truth). */
export async function updateProfileName(userId: string, name: string): Promise<void> {
  if (!supabase) return
  await supabase
    .from('profiles')
    .update({ display_name: name, updated_at: new Date().toISOString() })
    .eq('id', userId)
}
