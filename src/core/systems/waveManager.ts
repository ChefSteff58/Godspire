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

const SHADE_BOUNTY = 4 // flat — HP grows but bounty doesn't, a built-in late-game squeeze
const SHADE_LEAK_WEIGHT = 1

export interface WaveSpec {
  wave: number
  kind: EnemyKind
  count: number
  intervalMs: number
  hp: number
  speed: number
  bounty: number
  leakWeight: number
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

/** Linear count growth — keeps the frame budget bounded while HP climbs. */
export function enemyCount(n: number): number {
  return Math.round(8 + 0.5 * (Math.max(1, Math.floor(n)) - 1))
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

/** The full spawn script for wave `n`. M3 is Shade-only; the roster lands in M4. */
export function waveSpec(n: number): WaveSpec {
  const wave = Math.max(1, Math.floor(n))
  return {
    wave,
    kind: 'shade',
    count: enemyCount(wave),
    intervalMs: spawnIntervalMs(wave),
    hp: enemyHp(wave),
    speed: enemySpeed(wave),
    bounty: SHADE_BOUNTY,
    leakWeight: SHADE_LEAK_WEIGHT,
  }
}
