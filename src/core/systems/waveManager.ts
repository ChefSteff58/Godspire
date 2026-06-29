// ── src/core/systems ── endless wave escalation. Pure & framework-agnostic.
//
// Design (resolved in the M3 pre-mortem): HP carries difficulty so the per-frame budget stays
// flat. Enemy *count* grows only linearly (count is the real per-frame cost — sprites, targeting
// loops, projectile collisions); enemy *HP* compounds; speed rises but is capped.

import type { EnemyKind } from '../entities/enemy'

const BASE_HP = 10
const BASE_SPEED = 60 // px/sec, matches createEnemy's default

// HP is a GENTLE tail now (was ×1.12 compounding, which made enemy health outrun gold-bought DPS
// ~36× over 50 waves → "trivial then a wall"). ×1.05/wave only paces intra-kind attrition;
// difficulty rides on COMPOSITION (stronger TYPES) + count, BTD6-style — not on inflating one body.
const HP_RATE = 1.05

const SPEED_PER_WAVE = 0.01
const SPEED_CAP_MUL = 2 // never faster than 2× base

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

/** Cumulative HP multiplier at wave `n` (1-indexed) — a gentle ×1.05 tail, no late bend. */
export function enemyHpMul(n: number): number {
  return HP_RATE ** (Math.max(1, Math.floor(n)) - 1)
}

export function enemyHp(n: number): number {
  return Math.round(BASE_HP * enemyHpMul(n))
}

/**
 * Count grows on a SQRT curve under a HARD ceiling — more bodies early-to-mid (where the user wants
 * threat to come from "more creatures"), then flattens so the per-frame budget (sprites + targeting
 * loops + projectile collisions) stays safe. ~8 at w1, ~20 at w30, capped at 45 (~w70+).
 */
export const COUNT_CEILING = 45
export function enemyCount(n: number): number {
  const w = Math.max(1, Math.floor(n))
  return Math.round(Math.min(8 + 2.2 * Math.sqrt(w - 1), COUNT_CEILING))
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

// ── the roster composition (M4) ──
// Per-kind: when it debuts, its hp/speed multipliers on the wave curve, and flat bounty/leakWeight.
// (flying/armor are intrinsic to the kind — set in createEnemy, not here.)
//
// leakWeight is PER-KIND by the creature's THREAT — a stronger foe costs many more lives when it
// breaches (a Talos leak hurts far more than a Shade). It does NOT scale with the wave number;
// late-run lethality comes from tougher COMPOSITION (more of the heavy kinds), not from inflating
// the same creature's cost. Lives base ~100, so a handful of heavy leaks is a real threat.
// hpMul is a real LADDER (not noise): a Talos is unambiguously the tankiest body on screen at EVERY
// wave, a Shade always the flimsiest — so the player reads threat by TYPE, not by a hidden wave number.
const ORDER: readonly EnemyKind[] = ['shade', 'skeleton', 'harpy', 'talos', 'hydra', 'satyr', 'gorgon']
const KIND: Record<EnemyKind, { intro: number; hpMul: number; speedMul: number; bounty: number; leakWeight: number }> = {
  shade: { intro: 1, hpMul: 0.5, speedMul: 1.0, bounty: 3, leakWeight: 1 }, // chaff — flimsiest, let it trickle
  skeleton: { intro: 3, hpMul: 1.0, speedMul: 1.0, bounty: 5, leakWeight: 2 }, // the 1-RBE yardstick
  satyr: { intro: 15, hpMul: 0.7, speedMul: 1.6, bounty: 6, leakWeight: 3 }, // FAST → leaks easily but fragile
  harpy: { intro: 6, hpMul: 1.1, speedMul: 1.15, bounty: 7, leakWeight: 5 }, // flying → a structural anti-air gap
  gorgon: { intro: 18, hpMul: 1.4, speedMul: 1.0, bounty: 8, leakWeight: 7 }, // STEALTH → it was invisible to you
  hydra: { intro: 12, hpMul: 1.6, speedMul: 0.9, bounty: 9, leakWeight: 4 }, // splits — children inherit halved
  talos: { intro: 9, hpMul: 2.6, speedMul: 0.75, bounty: 12, leakWeight: 10 }, // armored wall → tankiest, leak = disaster
}

// COMPOSITION is the headline difficulty engine: weights DRIFT with the wave so the lane sweeps from a
// shade-sea (early) to a talos/gorgon/hydra wall (late). Chaff decays, heavies climb. weightAt(kind,wave).
const WEIGHT_CURVE: Record<EnemyKind, { base: number; slope: number; floor: number }> = {
  shade: { base: 6.0, slope: -0.13, floor: 0.5 }, // decays hardest
  skeleton: { base: 5.0, slope: -0.06, floor: 1.0 }, // decays slowly
  satyr: { base: 1.6, slope: 0.045, floor: 1.6 }, // climbs
  harpy: { base: 2.0, slope: 0.05, floor: 2.0 }, // climbs
  hydra: { base: 1.0, slope: 0.05, floor: 1.0 }, // climbs
  gorgon: { base: 1.4, slope: 0.06, floor: 1.4 }, // climbs
  talos: { base: 0.9, slope: 0.06, floor: 0.9 }, // climbs hardest
}
/** Blend weight for a kind at a given wave — chaff falls off, heavy kinds rise. Pure. */
export function weightAt(kind: EnemyKind, wave: number): number {
  const c = WEIGHT_CURVE[kind]
  return Math.max(c.floor, c.base + c.slope * (Math.max(1, Math.floor(wave)) - 1))
}

/** Every 10th wave is an "elite legion" — heavies surge (a readable tension peak, BTD6-style). */
export function isEliteWave(n: number): boolean {
  const w = Math.max(1, Math.floor(n))
  return w % 10 === 0
}

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

  // blended mix: distribute by the wave-DRIFTING weight (heavies surge on elite waves), cap the
  // heavies (caps RISE with the wave so they become a bigger slice late), remainder → Shade.
  const elite = isEliteWave(wave)
  const w = (k: EnemyKind): number => {
    const x = weightAt(k, wave)
    return elite && (k === 'talos' || k === 'hydra' || k === 'gorgon') ? x * 2.4 : x
  }
  const sumW = unlocked.reduce((s, k) => s + w(k), 0)
  let assigned = 0
  for (const k of unlocked) {
    counts[k] = Math.floor((total * w(k)) / sumW)
    assigned += counts[k]
  }
  const eliteMul = elite ? 1.5 : 1
  const capTalos = Math.floor(total * Math.min(0.45, (0.25 + 0.004 * wave) * eliteMul)) // 0.25→0.40 by ~w40
  const capHydra = Math.floor(total * Math.min(0.35, (0.15 + 0.004 * wave) * eliteMul)) // 0.15→0.30 by ~w40
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
    leakWeight: k.leakWeight, // per-kind by threat (NOT wave-scaled)
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
