import { describe, it, expect } from 'vitest'
import { isReturningSignIn } from '../src/lib/supabase/auth'

/**
 * The gate that decides when a guest→cloud progress reconcile fires (sessionStore's subscribeAuth
 * callback). It must fire on a RETURNING sign-in (email/Google loading an existing account) and stay
 * quiet on the boot anon sign-in, token refreshes, INITIAL_SESSION, and link-in-place — anything that
 * would either double-merge or clobber the just-established state.
 */
describe('isReturningSignIn (reconcile gate)', () => {
  const account = { id: 'acct-1', isGuest: false }
  const guest = { id: 'anon-1', isGuest: true }

  it('FIRES: a guest signs into an existing account', () => {
    expect(isReturningSignIn('SIGNED_IN', account, { userId: 'anon-1', isGuest: true })).toBe(true)
  })

  it('FIRES: switching from one account straight into a different account', () => {
    expect(isReturningSignIn('SIGNED_IN', account, { userId: 'acct-2', isGuest: false })).toBe(true)
  })

  it('SKIPS: the boot anonymous sign-in (SIGNED_IN, but the new identity is a guest)', () => {
    expect(isReturningSignIn('SIGNED_IN', guest, { userId: null, isGuest: true })).toBe(false)
  })

  it('SKIPS: re-emitted SIGNED_IN for the SAME account we already hold (tab focus / refresh churn)', () => {
    expect(isReturningSignIn('SIGNED_IN', account, { userId: 'acct-1', isGuest: false })).toBe(false)
  })

  it('SKIPS: INITIAL_SESSION for a non-guest (already signed in on page load — boot handles it)', () => {
    expect(isReturningSignIn('INITIAL_SESSION', account, { userId: null, isGuest: true })).toBe(false)
  })

  it('SKIPS: TOKEN_REFRESHED and USER_UPDATED (link-in-place) never reconcile', () => {
    expect(isReturningSignIn('TOKEN_REFRESHED', account, { userId: 'acct-1', isGuest: false })).toBe(false)
    // linkEmail keeps the SAME id and fires USER_UPDATED, not SIGNED_IN → no reconcile
    expect(isReturningSignIn('USER_UPDATED', account, { userId: 'anon-1', isGuest: true })).toBe(false)
  })
})
