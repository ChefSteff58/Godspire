import { create } from 'zustand'
import type { GodKind } from '../core/data/towers'

/**
 * UI-facing game state mirrored from the Phaser sim + player intents back into it.
 * (Gold/lives arrive in M3; this stays the bridge for HUD ↔ battlefield.)
 */
interface GameStore {
  /** Seconds the seal has held — mirrored from the scene loop. */
  elapsed: number
  /** Enemies slain — mirrored from the scene. */
  kills: number
  /** The god the player is currently placing (null = not placing). React→Phaser intent. */
  placingGod: GodKind | null
  /** Targeting-debug overlay toggle. */
  showDebug: boolean

  setElapsed: (seconds: number) => void
  addKill: () => void
  beginPlacing: (god: GodKind) => void
  cancelPlacing: () => void
  toggleDebug: () => void
}

export const useGameStore = create<GameStore>((set) => ({
  elapsed: 0,
  kills: 0,
  placingGod: null,
  showDebug: false,

  setElapsed: (seconds) => set({ elapsed: seconds }),
  addKill: () => set((s) => ({ kills: s.kills + 1 })),
  beginPlacing: (god) => set({ placingGod: god }),
  cancelPlacing: () => set({ placingGod: null }),
  toggleDebug: () => set((s) => ({ showDebug: !s.showDebug })),
}))
