// ── src/core/systems ── endless wave escalation. Pure & framework-agnostic.
//
// Design (resolved in the M3 pre-mortem): HP carries difficulty so the per-frame budget stays
// flat. Enemy *count* grows only linearly (count is the real per-frame cost — sprites, targeting
// loops, projectile collisions); enemy *HP* compounds; speed rises but is capped.

import type { EnemyKind } from '../entities/enemy'

const BASE_HP = 10
const BASE_SPEED = 60 // px/sec, matches createEnemy's default

const HP_RATE = 1.12 // compounding per wave
const HP_RATE_LATE = 1.14 // gentle bend upward so inevitability beats tedium
const HP_BEND_WAVE = 30

const SPEED_PER_WAVE = 0.01
const SPEED_CAP_MUL = 2 // never faster than 2× base

// A leak late in a run should HURT — a Talos breaching at wave 30 must cost far more than at wave 9.
// leakWeight compounds with the wave so late mistakes are punishing (×1.6 per 10 waves).
const LEAK_RATE = 1.6

/** One contiguous run of a single kind within a wave. */
export interface SpawnGroup {
  kind: EnemyKind
  count: number
  hp: number
  speed: number
  bounty: number
  leakWeight: number
  intervalMs: number
}

/** A wave = an ordered list of groups, emitted back-to-back. */
export interface WaveSpec {
  wave: number
  groups: SpawnGroup[]
}

/** Cumulative HP multiplier at wave `n` (1-indexed), with a gentle upward bend past wave 30. */
export function enemyHpMul(n: number): number {
  const w = Math.max(1, Math.floor(n))
  if (w <= HP_BEND_WAVE) return HP_RATE ** (w - 1)
  return HP_RATE ** (HP_BEND_WAVE - 1) * HP_RATE_LATE ** (w - HP_BEND_WAVE)
}

export function enemyHp(n: number): number {
  return Math.round(BASE_HP * enemyHpMul(n))
}

/** Linear count growth — keeps the frame budget bounded while HP climbs. (+20% difficulty pass.) */
const COUNT_DIFFICULTY_MUL = 1.2
export function enemyCount(n: number): number {
  return Math.round((8 + 0.5 * (Math.max(1, Math.floor(n)) - 1)) * COUNT_DIFFICULTY_MUL)
}

/** Speed rises slowly and is hard-capped at 2× base (pins ~wave 100). */
export function enemySpeed(n: number): number {
  const mul = Math.min(1 + SPEED_PER_WAVE * Math.max(1, Math.floor(n)), SPEED_CAP_MUL)
  return Math.round(BASE_SPEED * mul)
}

/** Gap between spawns — tightens with the wave (more pressure), floored so it stays readable. */
export function spawnIntervalMs(n: number): number {
  return Math.max(380, 950 - 12 * (Math.max(1, Math.floor(n)) - 1))
}

/** Lives a leaking enemy costs, scaled up the run so late breaches sting (compounds ×1.6/10 waves). */
export function leakWeightAt(base: number, n: number): number {
  const w = Math.max(1, Math.floor(n))
  return Math.max(base, Math.round(base * LEAK_RATE ** ((w - 1) / 10)))
}

// ── the roster composition (M4) ──
// Per-kind: when it debuts, its hp/speed multipliers on the wave curve, and flat bounty/leakWeight.
// (flying/armor are intrinsic to the kind — set in createEnemy, not here.)
const ORDER: readonly EnemyKind[] = ['shade', 'skeleton', 'harpy', 'talos', 'hydra', 'satyr', 'gorgon']
const KIND: Record<EnemyKind, { intro: number; hpMul: number; speedMul: number; bounty: number; leakWeight: number }> = {
  shade: { intro: 1, hpMul: 0.6, speedMul: 1.0, bounty: 3, leakWeight: 1 },
  skeleton: { intro: 3, hpMul: 1.0, speedMul: 1.0, bounty: 5, leakWeight: 1 },
  harpy: { intro: 6, hpMul: 0.8, speedMul: 1.15, bounty: 7, leakWeight: 1 },
  talos: { intro: 9, hpMul: 1.5, speedMul: 0.75, bounty: 12, leakWeight: 2 },
  hydra: { intro: 12, hpMul: 1.4, speedMul: 0.9, bounty: 9, leakWeight: 1 },
  satyr: { intro: 15, hpMul: 0.7, speedMul: 1.6, bounty: 6, leakWeight: 1 }, // FAST → demands a slow
  gorgon: { intro: 18, hpMul: 1.0, speedMul: 1.0, bounty: 8, leakWeight: 1 }, // STEALTH → demands detection
}
// Blend weights once multiple kinds are unlocked; talos/hydra are capped so they stay a minority.
const WEIGHT: Record<EnemyKind, number> = { shade: 5, skeleton: 4, harpy: 3, talos: 1.5, hydra: 1.5, satyr: 2.5, gorgon: 2.5 }

/**
 * How many of each kind spawn at wave `n`. Shares PARTITION the existing enemyCount(n) budget
 * (they never add bodies — only Hydra's on-death split does). A kind's DEBUT wave is single-kind
 * (≥1 guaranteed) + Shade cover so exactly one trait is taught at a time. Pure & testable.
 */
export function enemyCounts(n: number): Record<EnemyKind, number> {
  const wave = Math.max(1, Math.floor(n))
  const total = enemyCount(wave)
  const counts: Record<EnemyKind, number> = { shade: 0, skeleton: 0, harpy: 0, talos: 0, hydra: 0, satyr: 0, gorgon: 0 }
  const unlocked = ORDER.filter((k) => wave >= KIND[k].intro)

  const debut = unlocked.find((k) => k !== 'shade' && KIND[k].intro === wave)
  if (debut) {
    // teaching wave: mostly the new kind (Hydra capped lower to bound the split fan-out), rest Shade
    const share = debut === 'hydra' ? 0.4 : 0.7
    counts[debut] = Math.min(total, Math.max(1, Math.round(total * share)))
    counts.shade = total - counts[debut]
    return counts
  }

  // blended mix: distribute by weight, cap the heavies, dump the rounding remainder into Shade
  const sumW = unlocked.reduce((s, k) => s + WEIGHT[k], 0)
  let assigned = 0
  for (const k of unlocked) {
    counts[k] = Math.floor((total * WEIGHT[k]) / sumW)
    assigned += counts[k]
  }
  const capTalos = Math.floor(total * 0.25)
  const capHydra = Math.floor(total * 0.15)
  if (counts.talos > capTalos) { assigned -= counts.talos - capTalos; counts.talos = capTalos }
  if (counts.hydra > capHydra) { assigned -= counts.hydra - capHydra; counts.hydra = capHydra }
  counts.shade += Math.max(0, total - assigned)
  return counts
}

function makeGroup(kind: EnemyKind, count: number, n: number): SpawnGroup {
  const k = KIND[kind]
  return {
    kind,
    count,
    hp: Math.max(1, Math.round(enemyHp(n) * k.hpMul)),
    speed: Math.round(enemySpeed(n) * k.speedMul),
    bounty: k.bounty,
    leakWeight: leakWeightAt(k.leakWeight, n),
    intervalMs: spawnIntervalMs(n),
  }
}

/** The full spawn script for wave `n` — one group per present kind (skipping zero-count kinds). */
export function waveSpec(n: number): WaveSpec {
  const wave = Math.max(1, Math.floor(n))
  const counts = enemyCounts(wave)
  const groups = ORDER.filter((k) => counts[k] > 0).map((k) => makeGroup(k, counts[k], wave))
  return { wave, groups }
}
