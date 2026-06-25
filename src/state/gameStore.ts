import { create } from 'zustand'
import type { GameCommand } from '../core/types'

/**
 * The Zustand store is the BRIDGE between Phaser (the simulation) and React (the UI).
 *  - Phaser -> React : the engine writes mirrored values (e.g. `elapsed`) for the HUD to read.
 *  - React -> Phaser : the UI enqueues commands; the GameScene drains them each frame.
 *
 * Phaser reads/writes via `useGameStore.getState()`; React subscribes via the hook.
 * For Milestone 0 this holds only a demo heartbeat + a pulse command to prove both
 * directions work end-to-end.
 */
interface GameStore {
  /** Seconds the seal has held — mirrored from Phaser's update loop. */
  elapsed: number
  /** How many "pulse" commands Phaser has handled — mirrored back after handling. */
  pulses: number
  /** Queue of player intents waiting to be applied on a clean frame boundary. */
  pendingCommands: GameCommand[]

  // Phaser -> React (engine writes)
  setElapsed: (seconds: number) => void
  registerPulse: () => void
  drainCommands: () => GameCommand[]

  // React -> Phaser (UI enqueues)
  requestPulse: () => void
}

export const useGameStore = create<GameStore>((set, get) => ({
  elapsed: 0,
  pulses: 0,
  pendingCommands: [],

  setElapsed: (seconds) => set({ elapsed: seconds }),
  registerPulse: () => set({ pulses: get().pulses + 1 }),
  drainCommands: () => {
    const cmds = get().pendingCommands
    if (cmds.length > 0) set({ pendingCommands: [] })
    return cmds
  },

  requestPulse: () =>
    set({ pendingCommands: [...get().pendingCommands, { type: 'pulse' }] }),
}))
