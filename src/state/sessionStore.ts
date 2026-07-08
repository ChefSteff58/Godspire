import { create } from 'zustand'
import type { PlayerProgress, RunResult, Modifiers } from '../core/progress/types'
import {
  emptyProgress,
  applyRunRewards,
  mergeProgress,
  deriveModifiers,
  canUnlock,
} from '../core/progress/rules'
import { isSupabaseConfigured } from '../lib/supabase/client'
import {
  ensureSession,
  isReturningSignIn,
  linkEmail,
  linkGoogle,
  signInEmail,
  signInGoogle,
  signOut,
  subscribeAuth,
} from '../lib/supabase/auth'
import { loadProfile, updateProfileName } from '../lib/supabase/profiles'
import { submitScore as submitScoreToBoard, fetchMyBest } from '../lib/supabase/leaderboard'
import { loadProgress, saveProgress } from '../lib/persistence/progressRepo'
import {
  readLocalProgress,
  writeLocalProgress,
  clearLocalProgress,
  readLocalName,
  writeLocalName,
  clearLocalName,
} from '../lib/persistence/localCache'

type Status = 'booting' | 'ready' | 'offline'
type SyncState = 'idle' | 'saving' | 'error'
type SubmitState = 'idle' | 'posting' | 'posted' | 'already-posted' | 'failed'

const DEFAULT_NAME = 'Mortal'
const now = () => new Date().toISOString()

/**
 * The auth + progress bridge. Phaser/React read mirrored state here; persistence I/O lives in
 * src/lib. `core` (pure) is never reached around — only its functions are called with plain data.
 */
interface SessionStore {
  userId: string | null
  isGuest: boolean
  displayName: string
  progress: PlayerProgress
  status: Status
  syncState: SyncState
  /** Outcome of the most recent submitScore call — drives the run-over "Submitted!" line honestly. */
  lastSubmit: SubmitState
  booted: boolean

  boot: () => Promise<void>
  applyRun: (run: RunResult) => Promise<void>
  submitScore: () => Promise<void>
  getModifiers: () => Modifiers
  unlockNode: (nodeId: string) => Promise<void>
  setDisplayName: (name: string) => Promise<void>
  linkEmail: (email: string) => Promise<{ ok: boolean; error?: string }>
  linkGoogle: () => Promise<{ ok: boolean; error?: string }>
  /** Sign IN to a returning account (email magic link) — replaces the guest session; SIGNED_IN reconciles. */
  signInEmail: (email: string) => Promise<{ ok: boolean; error?: string }>
  /** Sign IN to a returning account with Google (OAuth redirect) — SIGNED_IN reconciles on return. */
  signInGoogle: () => Promise<{ ok: boolean; error?: string }>
  signOut: () => Promise<void>
}

export const useSessionStore = create<SessionStore>((set, get) => {
  /**
   * Best-effort cloud save; never throws into the caller. Read-modify-write: merge with the
   * current cloud row first, so a stale-content write with a fresher timestamp (a second tab /
   * another device) can't clobber newer cloud state.
   */
  const cloudSave = async (userId: string, p: PlayerProgress) => {
    set({ syncState: 'saving' })
    try {
      const cloud = await loadProgress(userId)
      await saveProgress(userId, mergeProgress(p, cloud))
      set({ syncState: 'idle' })
    } catch {
      set({ syncState: 'error' })
    }
  }

  /** Post-boot cloud writes are allowed only after a SUCCESSFUL cloud reconcile (see boot). */
  const canCloudWrite = (): string | null => {
    const { userId, status } = get()
    return userId && isSupabaseConfigured && status === 'ready' ? userId : null
  }

  /**
   * A RETURNING sign-in (email magic link / Google OAuth) lands us on a different, NON-guest identity
   * than the boot guest. Merge the guest's local progress into that account's cloud progress — the same
   * LWW + monotonic-max reconcile boot() does — so nothing the player did as a guest is lost, then adopt
   * the account's display name. Best-effort; never throws.
   *
   * Invoked (fire-and-forget) from the auth callback, so it must NOT await any `supabase.auth.*` method
   * (deadlock). DB reads/writes via loadProgress/saveProgress/loadProfile are fine — only auth is barred.
   */
  const reconcile = async (userId: string) => {
    try {
      const local = readLocalProgress()
      const [cloud, profile] = await Promise.all([loadProgress(userId), loadProfile(userId)])
      const merged = mergeProgress(local, cloud)
      writeLocalProgress(merged)
      set({
        progress: merged,
        displayName: profile?.displayName ?? readLocalName() ?? DEFAULT_NAME,
        status: 'ready',
      })
      await cloudSave(userId, merged)
    } catch (e) {
      console.warn('[godspire] sign-in reconcile failed:', e)
    }
  }

  return {
    userId: null,
    isGuest: true,
    displayName: readLocalName() ?? DEFAULT_NAME,
    progress: readLocalProgress() ?? emptyProgress(now()),
    status: 'booting',
    syncState: 'idle',
    lastSubmit: 'idle',
    booted: false,

    boot: async () => {
      if (get().booted) return
      set({ booted: true })

      const local = readLocalProgress()
      if (local) set({ progress: local })

      if (!isSupabaseConfigured) {
        set({ status: 'offline' })
        return
      }

      try {
        const user = await ensureSession()
        if (!user) {
          set({ status: 'offline' })
          return
        }
        set({ userId: user.id, isGuest: user.isGuest })

        // React to future auth changes (sign-in / link / sign-out). NO supabase.auth.* awaits inside
        // the callback (deadlock) — reconcile() only touches the DB + local cache, which is safe.
        subscribeAuth((u, _session, event) => {
          if (u) {
            const prev = get()
            set({ userId: u.id, isGuest: u.isGuest })
            // A RETURNING sign-in hands us a NON-guest identity we didn't already hold. boot()'s own
            // anon sign-in is a guest SIGNED_IN → skipped; INITIAL_SESSION / TOKEN_REFRESHED /
            // USER_UPDATED aren't SIGNED_IN. (Predicate is pure + unit-tested in auth.ts.)
            if (isReturningSignIn(event, u, { userId: prev.userId, isGuest: prev.isGuest })) {
              void reconcile(u.id) // fire-and-forget (see reconcile's deadlock note)
            }
          } else {
            // cross-tab sign-out / session loss: drop identity so this tab can't resurrect the
            // just-cleared save back into localStorage
            clearLocalProgress()
            clearLocalName()
            set({ userId: null, isGuest: true, progress: emptyProgress(now()), displayName: DEFAULT_NAME })
          }
        })

        const [cloud, profile] = await Promise.all([loadProgress(user.id), loadProfile(user.id)])
        const merged = mergeProgress(local, cloud)
        writeLocalProgress(merged)
        set({
          progress: merged,
          displayName: profile?.displayName ?? readLocalName() ?? user.displayName ?? DEFAULT_NAME,
          isGuest: profile?.isAnonymous ?? user.isGuest,
          status: 'ready',
        })

        // Reconcile the cloud row to the merged result (idempotent).
        await cloudSave(user.id, merged)
      } catch (e) {
        console.warn('[godspire] boot failed; running local-only:', e)
        set({ status: 'offline' })
      }
    },

    applyRun: async (run) => {
      // Rebase on the freshest SHARED state first — another tab may have written localStorage
      // since our in-memory snapshot, and stamping a new updatedAt on a stale base would clobber
      // its work (e.g. a fresh unlock) in both localStorage and the cloud.
      const base = mergeProgress(readLocalProgress(), get().progress)
      const { progress } = applyRunRewards(base, run, now())
      set({ progress })
      writeLocalProgress(progress)
      const userId = canCloudWrite()
      if (userId) await cloudSave(userId, progress)
    },

    /**
     * Ensure the career best wave is on the global board. ACCOUNT-REQUIRED: guests (anonymous) and
     * the offline state are skipped. Posts ONLY when the career best beats the player's existing board
     * entry — so a best set BEFORE linking still gets posted (and re-calls are cheap no-ops, no dupes).
     * Best-effort, never throws. Safe to call on every run-end + whenever the board opens.
     */
    submitScore: async () => {
      const { userId, isGuest, displayName, progress, lastSubmit } = get()
      if (lastSubmit === 'posting') return // endRun + overlay-open can race → duplicate rows
      if (!isSupabaseConfigured || !userId || isGuest) return
      const best = progress.stats.bestWave
      if (best < 1) return
      set({ lastSubmit: 'posting' })
      const boardBest = await fetchMyBest(userId, 'endless')
      if (best <= boardBest) {
        set({ lastSubmit: 'already-posted' })
        return
      }
      const { ok } = await submitScoreToBoard(userId, displayName, best, 'endless')
      set({ lastSubmit: ok ? 'posted' : 'failed' })
    },

    getModifiers: () => deriveModifiers(get().progress.unlockedNodes),

    unlockNode: async (nodeId) => {
      // Rebase on shared state (see applyRun), then re-check the unlock against the rebased base.
      const base = mergeProgress(readLocalProgress(), get().progress)
      if (!canUnlock(nodeId, base)) return // guards: exists, unowned, prereqs met, affordable
      const updated: PlayerProgress = {
        ...base,
        unlockedNodes: [...base.unlockedNodes, nodeId],
        updatedAt: now(),
      }
      set({ progress: updated })
      writeLocalProgress(updated)
      const userId = canCloudWrite()
      if (userId) await cloudSave(userId, updated)
    },

    setDisplayName: async (name) => {
      const clean = name.trim().slice(0, 32) || DEFAULT_NAME
      set({ displayName: clean })
      writeLocalName(clean)
      const { userId } = get()
      if (userId && isSupabaseConfigured) {
        try {
          await updateProfileName(userId, clean)
        } catch {
          /* best effort */
        }
      }
    },

    linkEmail: (email) => linkEmail(email),
    linkGoogle: () => linkGoogle(),
    signInEmail: (email) => signInEmail(email),
    signInGoogle: () => signInGoogle(),

    signOut: async () => {
      await signOut()
      clearLocalProgress()
      clearLocalName() // otherwise the next boot resurrects the old identity from localStorage
      set({
        userId: null,
        isGuest: true,
        progress: emptyProgress(now()),
        displayName: DEFAULT_NAME,
      })
      // mint a fresh guest session — boot() is one-shot, so without this the tab has NO session
      // until reload: link buttons error and cloud saves silently stop
      const fresh = await ensureSession()
      if (fresh) set({ userId: fresh.id, isGuest: true })
      else set({ status: 'offline' })
    },
  }
})
