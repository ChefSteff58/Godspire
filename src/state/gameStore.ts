import { create } from 'zustand'
import type { GodKind } from '../core/data/towers'
import type { TargetingMode } from '../core/systems/targeting'
import type { RunPhase } from '../core/run/types'
import type { DraftOption } from '../core/run/draft'
import type { RunSnapshot } from '../game/run/RunController'

/** Shown on the run-over screen. Computed once when the run ends. */
export interface RunSummary {
  wave: number
  favor: number
  bestWave: number
  kills: number
  bossesKilled: number
  goldEarned: number
  goldSpent: number
  towersBuilt: number
  /** The wave on which the most lives were lost (0 if none lost — e.g. a leak-free death by negative grant). */
  worstWave: number
  worstWaveLives: number
}

/** One upgrade path's state for the selected tower's panel. */
export interface SelectedTowerPath {
  name: string
  tier: number // 0–3 bought
  nextName: string | null // next purchasable tier name (null = maxed)
  nextCost: number | null
  nextDesc: string | null
  locked: boolean // blocked by the cross-path rule
}

/** The placed tower the player has selected (clicked). Drives the range ring + upgrade/sell panel. */
export interface SelectedTower {
  id: string
  god: GodKind
  sellValue: number
  /** Current target-priority (only meaningful for gods that actually acquire a target). */
  targeting: TargetingMode
  /** Whether this god picks a target at all (false for farms / auras / spike forges). */
  targets: boolean
  pathA: SelectedTowerPath
  pathB: SelectedTowerPath
}

/** React→Phaser intents. Enqueued by the UI, drained by GameScene each frame (even while paused). */
export type RunIntent =
  | { type: 'startWave' }
  | { type: 'pickDraft'; index: number }
  | { type: 'playAgain' }
  | { type: 'sellTower' }
  | { type: 'upgradeTower'; path: 'A' | 'B' }
  | { type: 'setTargeting'; mode: TargetingMode }
  | { type: 'cheatGold' }
  | { type: 'cheatInvincible' }

/**
 * UI-facing game state: values mirrored FROM the Phaser sim (read-only for React) + player intents
 * pushed back INTO it. The RunController owns the authoritative numbers; these are a per-frame copy.
 */
interface GameStore {
  // M2.5 bridge
  elapsed: number
  kills: number
  placingGod: GodKind | null
  showDebug: boolean
  /** 0 = paused, 1/3 = sim speed multiplier (applied to dt in GameScene). */
  timeScale: number
  /** Player preference: auto-start each wave after a short grace (survives Play Again). */
  autoStart: boolean
  /** The Pantheon skill-tree overlay is open (pauses the run while shown). */
  pantheonOpen: boolean
  /** The leaderboard overlay is open (pauses the run while shown). */
  leaderboardOpen: boolean
  /** Speed to restore when a full-screen menu overlay closes (stashed on open). */
  preMenuScale: number

  // M3 run mirrors (written only by mirrorRun)
  gold: number
  lives: number
  maxLives: number
  shieldCharges: number
  wave: number
  phase: RunPhase
  draftOptions: DraftOption[] | null
  invincible: boolean
  canStartWave: boolean
  runSummary: RunSummary | null
  /** The speed to restore after a draft pause — stashed so 3× FF survives the modal. */
  preDraftScale: number
  /** The currently-selected placed tower (set by the scene on click), or null. */
  selectedTower: SelectedTower | null

  // intent queue
  intents: RunIntent[]

  setElapsed: (seconds: number) => void
  beginPlacing: (god: GodKind) => void
  cancelPlacing: () => void
  toggleDebug: () => void
  setSpeed: (timeScale: number) => void
  toggleAutoStart: () => void
  openPantheon: () => void
  closePantheon: () => void
  openLeaderboard: () => void
  closeLeaderboard: () => void

  mirrorRun: (s: RunSnapshot) => void
  setRunSummary: (s: RunSummary | null) => void
  setPreDraftScale: (scale: number) => void
  setSelectedTower: (sel: SelectedTower | null) => void
  resetRun: () => void
  drainIntents: () => RunIntent[]

  // UI-facing intent helpers
  requestStartWave: () => void
  pickDraft: (index: number) => void
  playAgain: () => void
  sellTower: () => void
  upgradeTower: (path: 'A' | 'B') => void
  setTargeting: (mode: TargetingMode) => void
  cheatGold: () => void
  cheatInvincible: () => void
}

const FRESH_RUN = {
  gold: 0,
  lives: 0,
  maxLives: 0,
  shieldCharges: 0,
  wave: 0,
  kills: 0,
  phase: 'building' as RunPhase,
  draftOptions: null,
  invincible: false,
  canStartWave: true,
  runSummary: null,
  preDraftScale: 1,
  selectedTower: null,
}

export const useGameStore = create<GameStore>((set, get) => ({
  elapsed: 0,
  placingGod: null,
  showDebug: false,
  timeScale: 1,
  autoStart: true, // rounds auto-chain (BTD6 auto-play); the first wave still waits for a manual start
  pantheonOpen: false,
  leaderboardOpen: false,
  preMenuScale: 1,
  intents: [],
  ...FRESH_RUN,

  setElapsed: (seconds) => set({ elapsed: seconds }),
  beginPlacing: (god) => set({ placingGod: god }),
  cancelPlacing: () => set({ placingGod: null }),
  toggleDebug: () => set((s) => ({ showDebug: !s.showDebug })),
  setSpeed: (timeScale) => set({ timeScale }),
  toggleAutoStart: () => set((s) => ({ autoStart: !s.autoStart })),
  // Full-screen menu overlays pause the run (stash the prior speed, restore it on close).
  openPantheon: () => set((s) => ({ pantheonOpen: true, preMenuScale: s.timeScale === 0 ? 1 : s.timeScale, timeScale: 0 })),
  closePantheon: () => set((s) => ({ pantheonOpen: false, timeScale: s.preMenuScale })),
  openLeaderboard: () => set((s) => ({ leaderboardOpen: true, preMenuScale: s.timeScale === 0 ? 1 : s.timeScale, timeScale: 0 })),
  closeLeaderboard: () => set((s) => ({ leaderboardOpen: false, timeScale: s.preMenuScale })),

  // one batched write per frame — never tear gold/lives across separate setters
  mirrorRun: (s) =>
    set({
      gold: s.gold,
      lives: s.lives,
      maxLives: s.maxLives,
      shieldCharges: s.shieldCharges,
      wave: s.wave,
      kills: s.kills,
      phase: s.phase,
      draftOptions: s.draftOptions,
      invincible: s.invincible,
      canStartWave: s.canStartWave,
    }),
  setRunSummary: (runSummary) => set({ runSummary }),
  setPreDraftScale: (preDraftScale) => set({ preDraftScale }),
  setSelectedTower: (selectedTower) => set({ selectedTower }),
  resetRun: () => set({ ...FRESH_RUN, elapsed: 0, placingGod: null, intents: [] }),
  drainIntents: () => {
    const q = get().intents
    if (q.length) set({ intents: [] })
    return q
  },

  requestStartWave: () => set((s) => ({ intents: [...s.intents, { type: 'startWave' }] })),
  pickDraft: (index) => set((s) => ({ intents: [...s.intents, { type: 'pickDraft', index }] })),
  playAgain: () => set((s) => ({ intents: [...s.intents, { type: 'playAgain' }] })),
  sellTower: () => set((s) => ({ intents: [...s.intents, { type: 'sellTower' }] })),
  upgradeTower: (path) => set((s) => ({ intents: [...s.intents, { type: 'upgradeTower', path }] })),
  setTargeting: (mode) => set((s) => ({ intents: [...s.intents, { type: 'setTargeting', mode }] })),
  cheatGold: () => set((s) => ({ intents: [...s.intents, { type: 'cheatGold' }] })),
  cheatInvincible: () => set((s) => ({ intents: [...s.intents, { type: 'cheatInvincible' }] })),
}))
