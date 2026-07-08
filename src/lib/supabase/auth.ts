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

/**
 * Sign IN to a returning account by email — a magic link (the client's detectSessionInUrl handles the
 * callback). DISTINCT from linkEmail: linkEmail UPGRADES the current guest in place; this authenticates
 * as an existing (or new) account, replacing the session. SIGNED_IN then reconciles progress (sessionStore).
 */
export async function signInEmail(email: string): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'Cloud not configured' }
  const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: REDIRECT } })
  return error ? { ok: false, error: error.message } : { ok: true }
}

/** Sign IN with Google (returning account) — a fresh OAuth flow (redirect); the session lands via
 *  detectSessionInUrl → SIGNED_IN → reconcile. DISTINCT from linkGoogle (which upgrades the guest). */
export async function signInGoogle(): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: 'Cloud not configured' }
  const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: REDIRECT } })
  return error ? { ok: false, error: error.message } : { ok: true }
}

export async function signOut(): Promise<void> {
  if (!supabase) return
  await supabase.auth.signOut()
}

/**
 * Does this auth event represent a RETURNING sign-in — a player loading an EXISTING account — as opposed
 * to the boot anonymous sign-in, a token refresh, INITIAL_SESSION, or a link-in-place? True ONLY when a
 * SIGNED_IN hands us a NON-guest identity we weren't already holding (we were a guest, or a different
 * account). The store reconciles guest→cloud progress on exactly this signal. Pure — unit-tested.
 */
export function isReturningSignIn(
  event: string,
  next: { id: string; isGuest: boolean },
  prev: { userId: string | null; isGuest: boolean },
): boolean {
  return event === 'SIGNED_IN' && !next.isGuest && (prev.isGuest || prev.userId !== next.id)
}

/**
 * Subscribe to auth changes (sign-in, link, sign-out, token refresh). Returns an unsubscribe fn. The
 * `event` name is forwarded so the store can reconcile ONLY on a real SIGNED_IN (a returning sign-in),
 * not on every token refresh. NOTE: the callback must NOT await other supabase.auth methods (deadlock
 * risk) — DB reads/writes (progress) are fine, only `supabase.auth.*` is forbidden inside it.
 */
export function subscribeAuth(
  cb: (user: AuthUser | null, session: Session | null, event: string) => void,
): () => void {
  if (!supabase) return () => {}
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    cb(toAuthUser(session?.user ?? null), session, event)
  })
  return () => subscription.unsubscribe()
}
