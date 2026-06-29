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
import { ensureSession, linkEmail, linkGoogle, signOut, subscribeAuth } from '../lib/supabase/auth'
import { loadProfile, updateProfileName } from '../lib/supabase/profiles'
import { submitScore as submitScoreToBoard, fetchMyBest } from '../lib/supabase/leaderboard'
import { loadProgress, saveProgress } from '../lib/persistence/progressRepo'
import {
  readLocalProgress,
  writeLocalProgress,
  clearLocalProgress,
  readLocalName,
  writeLocalName,
} from '../lib/persistence/localCache'

type Status = 'booting' | 'ready' | 'offline'
type SyncState = 'idle' | 'saving' | 'error'

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
  booted: boolean

  boot: () => Promise<void>
  applyRun: (run: RunResult) => Promise<void>
  submitScore: () => Promise<void>
  getModifiers: () => Modifiers
  unlockNode: (nodeId: string) => Promise<void>
  setDisplayName: (name: string) => Promise<void>
  linkEmail: (email: string) => Promise<{ ok: boolean; error?: string }>
  linkGoogle: () => Promise<{ ok: boolean; error?: string }>
  signOut: () => Promise<void>
}

export const useSessionStore = create<SessionStore>((set, get) => {
  /** Best-effort cloud save; never throws into the caller. */
  const cloudSave = async (userId: string, p: PlayerProgress) => {
    set({ syncState: 'saving' })
    try {
      await saveProgress(userId, p)
      set({ syncState: 'idle' })
    } catch {
      set({ syncState: 'error' })
    }
  }

  return {
    userId: null,
    isGuest: true,
    displayName: readLocalName() ?? DEFAULT_NAME,
    progress: readLocalProgress() ?? emptyProgress(now()),
    status: 'booting',
    syncState: 'idle',
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

        // React to future auth changes (link / sign-out). No supabase awaits inside the callback.
        subscribeAuth((u) => {
          if (u) set({ userId: u.id, isGuest: u.isGuest })
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
      const { progress } = applyRunRewards(get().progress, run, now())
      set({ progress })
      writeLocalProgress(progress)
      const { userId } = get()
      if (userId && isSupabaseConfigured) await cloudSave(userId, progress)
    },

    /**
     * Ensure the career best wave is on the global board. ACCOUNT-REQUIRED: guests (anonymous) and
     * the offline state are skipped. Posts ONLY when the career best beats the player's existing board
     * entry — so a best set BEFORE linking still gets posted (and re-calls are cheap no-ops, no dupes).
     * Best-effort, never throws. Safe to call on every run-end + whenever the board opens.
     */
    submitScore: async () => {
      const { userId, isGuest, displayName, progress } = get()
      if (!isSupabaseConfigured || !userId || isGuest) return
      const best = progress.stats.bestWave
      if (best < 1) return
      const boardBest = await fetchMyBest(userId, 'endless')
      if (best > boardBest) await submitScoreToBoard(userId, displayName, best, 'endless')
    },

    getModifiers: () => deriveModifiers(get().progress.unlockedNodes),

    unlockNode: async (nodeId) => {
      const progress = get().progress
      if (!canUnlock(nodeId, progress)) return // guards: exists, unowned, prereqs met, affordable
      const updated: PlayerProgress = {
        ...progress,
        unlockedNodes: [...progress.unlockedNodes, nodeId],
        updatedAt: now(),
      }
      set({ progress: updated })
      writeLocalProgress(updated)
      const { userId } = get()
      if (userId && isSupabaseConfigured) await cloudSave(userId, updated)
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

    signOut: async () => {
      await signOut()
      clearLocalProgress()
      set({
        userId: null,
        isGuest: true,
        progress: emptyProgress(now()),
        displayName: DEFAULT_NAME,
      })
    },
  }
})
