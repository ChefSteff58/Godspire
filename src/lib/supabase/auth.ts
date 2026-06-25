import { supabase } from './client'
import type { Session, User } from '@supabase/supabase-js'

export interface AuthUser {
  id: string
  isGuest: boolean
  email: string | null
  displayName: string | null
}

function toAuthUser(user: User | null): AuthUser | null {
  if (!user) return null
  return {
    id: user.id,
    isGuest: user.is_anonymous ?? false,
    email: user.email ?? null,
    displayName: (user.user_metadata?.display_name as string | undefined) ?? null,
  }
}

const REDIRECT = typeof window !== 'undefined' ? window.location.origin : undefined

/**
 * Guest-first: reuse an existing session, else create an anonymous one.
 * Returns null if Supabase isn't configured or anonymous sign-in fails (app stays local-only).
 */
export async function ensureSession(): Promise<AuthUser | null> {
  if (!supabase) return null
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (session) return toAuthUser(session.user)

  const { data, error } = await supabase.auth.signInAnonymously()
  if (error) {
    console.warn('[godspire] anonymous sign-in failed:', error.message)
    return null
  }
  return toAuthUser(data.user)
}

/** Upgrade the current anonymous user to email (magic link). Keeps the SAME user id + progress. */
export async function linkEmail(email: string): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'Cloud not configured' }
  const { error } = await supabase.auth.updateUser({ email })
  return error ? { ok: false, error: error.message } : { ok: true }
}

/** Upgrade the current anonymous user to Google. linkIdentity preserves the user id. */
export async function linkGoogle(): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'Cloud not configured' }
  const { error } = await supabase.auth.linkIdentity({
    provider: 'google',
    options: { redirectTo: REDIRECT },
  })
  return error ? { ok: false, error: error.message } : { ok: true }
}

export async function signOut(): Promise<void> {
  if (!supabase) return
  await supabase.auth.signOut()
}

/**
 * Subscribe to auth changes (link, sign-out, token refresh). Returns an unsubscribe fn.
 * NOTE: the callback must NOT await other supabase.auth methods (deadlock risk) — it only sets state.
 */
export function subscribeAuth(cb: (user: AuthUser | null, session: Session | null) => void): () => void {
  if (!supabase) return () => {}
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    cb(toAuthUser(session?.user ?? null), session)
  })
  return () => subscription.unsubscribe()
}
