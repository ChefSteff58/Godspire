import { describe, it, expect } from 'vitest'
import {
  emptyProgress,
  xpForLevel,
  levelForFavor,
  totalPoints,
  availablePoints,
  spentPoints,
  favorFromRun,
  applyRunRewards,
  deriveModifiers,
  BASE_MODIFIERS,
  mergeProgress,
  migrateProgress,
} from '../src/core/progress/rules'
import { rowToProgress } from '../src/lib/persistence/progressRepo'
import type { PlayerProgress, PlayerSettings } from '../src/core/progress/types'

const NOW = '2026-06-24T12:00:00.000Z'
const EARLIER = '2026-06-24T11:00:00.000Z'

/** The full settings shape (all fields required) — spread + override in tests that only care about one. */
const DEFAULT_SETTINGS: PlayerSettings = { muted: false, defaultSpeed: 1, reducedMotion: false, colorblind: false }

describe('level curve', () => {
  it('xpForLevel is 0 at level 1 and increasing', () => {
    expect(xpForLevel(1)).toBe(0)
    expect(xpForLevel(2)).toBe(125) // 100*1 + 25*1
    expect(xpForLevel(3)).toBe(300) // 100*2 + 25*4
    expect(xpForLevel(2)).toBeLessThan(xpForLevel(3))
  })

  it('levelForFavor is the inverse, exact at boundaries', () => {
    expect(levelForFavor(0)).toBe(1)
    expect(levelForFavor(124)).toBe(1)
    expect(levelForFavor(125)).toBe(2)
    expect(levelForFavor(299)).toBe(2)
    expect(levelForFavor(300)).toBe(3)
  })

  it('totalPoints = level - 1', () => {
    expect(totalPoints(0)).toBe(0)
    expect(totalPoints(125)).toBe(1)
    expect(totalPoints(300)).toBe(2)
  })
})

describe('favor + applyRunRewards', () => {
  it('favorFromRun sums waves, win bonus, kills, and bosses', () => {
    expect(favorFromRun({ waveReached: 5, victory: false, kills: 12 })).toBe(62) // 50 + 0 + 12 (+0 bosses)
    expect(favorFromRun({ waveReached: 20, victory: true, kills: 30 })).toBe(430) // 200 + 200 + 30
    expect(favorFromRun({ waveReached: 20, victory: false, kills: 30, bossesKilled: 1 })).toBe(280) // 200 + 30 + 50
  })

  it('does not mutate the previous progress and reports levels gained', () => {
    const prev = emptyProgress(EARLIER)
    const { progress, favorGained, levelsGained } = applyRunRewards(
      prev,
      { waveReached: 20, victory: true, kills: 30 },
      NOW,
    )
    expect(prev.favor).toBe(0) // untouched
    expect(favorGained).toBe(430)
    expect(progress.favor).toBe(430)
    expect(levelsGained).toBe(2) // level 1 -> 3
    expect(progress.stats.runsPlayed).toBe(1)
    expect(progress.stats.bestWave).toBe(20)
    expect(progress.stats.totalKills).toBe(30)
    expect(progress.stats.bossesKilled).toBe(0) // none provided → 0
    expect(progress.updatedAt).toBe(NOW)
  })

  it('accumulates the M6 lifetime stats (bosses / gold spent / towers built)', () => {
    const { progress, favorGained } = applyRunRewards(
      emptyProgress(EARLIER),
      { waveReached: 40, victory: false, kills: 50, bossesKilled: 2, goldSpent: 3000, towersBuilt: 12 },
      NOW,
    )
    expect(progress.stats.bossesKilled).toBe(2)
    expect(progress.stats.totalGoldSpent).toBe(3000)
    expect(progress.stats.totalTowersBuilt).toBe(12)
    expect(favorGained).toBe(40 * 10 + 50 + 2 * 50) // waves + kills + bosses
  })
})

describe('deriveModifiers', () => {
  it('empty unlocks === BASE_MODIFIERS', () => {
    expect(deriveModifiers([])).toEqual(BASE_MODIFIERS)
  })

  it('applies node effects and ignores unknown ids', () => {
    const m = deriveModifiers(['harvest_gold_1', 'war_dmg_1', 'does_not_exist'])
    expect(m.startingGold).toBe(800) // 650 + 150
    expect(m.towerDamageMul).toBeCloseTo(1.05)
    expect(m.startingLives).toBe(100) // unchanged
  })
})

describe('mergeProgress', () => {
  const make = (over: Partial<PlayerProgress>): PlayerProgress => ({
    ...emptyProgress(EARLIER),
    ...over,
  })

  it('both null -> empty; one null -> the other', () => {
    expect(mergeProgress(null, null).favor).toBe(0)
    const a = make({ favor: 99, updatedAt: NOW })
    expect(mergeProgress(a, null)).toBe(a)
    expect(mergeProgress(null, a)).toBe(a)
  })

  it('takes unlockedNodes WHOLE from the newer side (never unions -> no resurrected points)', () => {
    const local = make({ favor: 300, unlockedNodes: ['war_dmg_1', 'wisdom_life_1'], updatedAt: NOW })
    const cloud = make({ favor: 125, unlockedNodes: ['harvest_gold_1'], updatedAt: EARLIER })
    const merged = mergeProgress(local, cloud)
    expect(merged.unlockedNodes).toEqual(['war_dmg_1', 'wisdom_life_1']) // newer side only, not 3
    expect(merged.favor).toBe(300) // monotonic max
  })

  it('a no-gameplay timestamp bump on an EMPTY guest save cannot wipe a real account build', () => {
    // Returning player flips a Setting as a guest (empty save stamped now()) then signs in. The empty
    // local must NOT win the build even though it is "newer" — the higher-favor account keeps its nodes.
    const guestLocal = make({
      favor: 0,
      unlockedNodes: [],
      settings: { ...DEFAULT_SETTINGS, defaultSpeed: 3 },
      updatedAt: NOW,
    })
    const account = make({
      favor: 5000,
      unlockedNodes: ['war_dmg_1', 'wisdom_life_1', 'harvest_gold_1'],
      updatedAt: EARLIER,
    })
    const merged = mergeProgress(guestLocal, account)
    expect(merged.unlockedNodes).toEqual(['war_dmg_1', 'wisdom_life_1', 'harvest_gold_1']) // build preserved
    expect(merged.favor).toBe(5000)
    expect(merged.settings.defaultSpeed).toBe(3) // the just-expressed setting still rides along (newer side)
  })

  it('never produces negative available points after a merge', () => {
    const local = make({ favor: 125, unlockedNodes: ['war_dmg_1'], updatedAt: NOW })
    const cloud = make({ favor: 300, unlockedNodes: ['harvest_gold_1'], updatedAt: EARLIER })
    const merged = mergeProgress(local, cloud)
    expect(availablePoints(merged)).toBeGreaterThanOrEqual(0)
  })

  it('stats are monotonic-max across both sides', () => {
    const local = make({ stats: { runsPlayed: 5, bestWave: 12, totalKills: 100, bossesKilled: 4, totalGoldSpent: 9000, totalTowersBuilt: 30 }, updatedAt: EARLIER })
    const cloud = make({ stats: { runsPlayed: 3, bestWave: 18, totalKills: 80, bossesKilled: 2, totalGoldSpent: 12000, totalTowersBuilt: 25 }, updatedAt: NOW })
    const merged = mergeProgress(local, cloud)
    expect(merged.stats).toEqual({ runsPlayed: 5, bestWave: 18, totalKills: 100, bossesKilled: 4, totalGoldSpent: 12000, totalTowersBuilt: 30 })
  })

  it('a PRISTINE trigger-created cloud row loses the merge even with a newer timestamp', () => {
    // A fresh anon signup's row (all schema defaults) used to arrive stamped now() — newer than
    // any local save — and take unlockedNodes/settings WHOLE, wiping real progress. rowToProgress
    // detects the exact default shape and forces it to the epoch so the local save wins.
    const local = make({
      favor: 300,
      unlockedNodes: ['war_dmg_1', 'wisdom_life_1'],
      settings: { ...DEFAULT_SETTINGS, muted: true },
      updatedAt: EARLIER,
    })
    const pristineCloud = rowToProgress({
      favor: 0,
      unlocked_nodes: [],
      settings: {},
      stats: {},
      updated_at: NOW, // newer than the local save — must still lose
    })
    const merged = mergeProgress(local, pristineCloud)
    expect(merged.unlockedNodes).toEqual(['war_dmg_1', 'wisdom_life_1'])
    expect(merged.settings).toEqual({ ...DEFAULT_SETTINGS, muted: true })
    expect(merged.favor).toBe(300)
    expect(merged.updatedAt).toBe(EARLIER)
  })

  it('a REAL settings-only cloud save is NOT misread as pristine', () => {
    const cloud = rowToProgress({
      favor: 0,
      unlocked_nodes: [],
      settings: { muted: true }, // one real field → not the trigger-default shape
      stats: {},
      updated_at: NOW,
    })
    const local = make({ settings: { ...DEFAULT_SETTINGS, muted: false }, updatedAt: EARLIER })
    expect(mergeProgress(local, cloud).settings).toEqual({ ...DEFAULT_SETTINGS, muted: true }) // newer side wins
  })

  it('takes the WHOLE settings object from the newer side (new S2 fields ride along)', () => {
    const local = make({ settings: { muted: false, defaultSpeed: 3, reducedMotion: true, colorblind: false }, updatedAt: NOW })
    const cloud = make({ settings: { ...DEFAULT_SETTINGS, colorblind: true }, updatedAt: EARLIER })
    // NOW wins → the fast-speed + reduced-motion prefs survive; the older colorblind flag does NOT bleed in
    expect(mergeProgress(local, cloud).settings).toEqual({
      muted: false,
      defaultSpeed: 3,
      reducedMotion: true,
      colorblind: false,
    })
  })
})

describe('migrateProgress never throws', () => {
  it('coerces garbage to a valid empty-ish save', () => {
    for (const garbage of [null, undefined, 42, 'nope', [], { favor: 'x' }]) {
      const p = migrateProgress(garbage)
      expect(p.schemaVersion).toBe(2) // literal, not the constant — must fail loudly if the bump regresses
      expect(Array.isArray(p.unlockedNodes)).toBe(true)
      expect(typeof p.favor).toBe('number')
      expect(p.favor).toBeGreaterThanOrEqual(0)
      expect(p.settings).toEqual(DEFAULT_SETTINGS) // new fields default cleanly
    }
  })

  it('defaults the new S2 settings on an old (v1) save that only had { muted }', () => {
    const p = migrateProgress({ favor: 10, settings: { muted: true }, updatedAt: NOW })
    expect(p.settings).toEqual({ muted: true, defaultSpeed: 1, reducedMotion: false, colorblind: false })
  })

  it('coerces bad settings values (only 1|3 speed; booleans else default)', () => {
    const p = migrateProgress({
      settings: { muted: 'yes', defaultSpeed: 2, reducedMotion: 1, colorblind: 'true' },
    })
    expect(p.settings).toEqual(DEFAULT_SETTINGS) // muted:'yes'→false, speed 2→1, rm 1→false, cb 'true'→false
    expect(migrateProgress({ settings: { defaultSpeed: 3 } }).settings.defaultSpeed).toBe(3) // 3 is valid
  })

  it('preserves valid fields and drops non-string node ids', () => {
    const p = migrateProgress({
      favor: 500,
      unlockedNodes: ['war_dmg_1', 7, null, 'harvest_gold_1'],
      stats: { runsPlayed: 4, bestWave: 9, totalKills: 50 },
      settings: { muted: true },
      updatedAt: NOW,
    })
    expect(p.favor).toBe(500)
    expect(p.unlockedNodes).toEqual(['war_dmg_1', 'harvest_gold_1'])
    expect(p.stats.bestWave).toBe(9)
    expect(p.settings.muted).toBe(true)
    expect(p.updatedAt).toBe(NOW)
  })

  it('spentPoints tolerates unknown ids', () => {
    expect(spentPoints(['war_dmg_1', 'ghost'])).toBe(1)
  })
})
