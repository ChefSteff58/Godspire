// ── src/game/run ── the authoritative owner of one roguelike run.
//
// GameScene owns enemies/sprites/the clock; this object owns the NUMBERS (gold, lives, wave,
// phase, modifiers, the draft). React never writes these — it only enqueues intents that the
// scene drains and forwards here, and reads a single mirrored snapshot per frame. Pure logic
// lives in src/core; this is a thin stateful conductor over it (no Phaser/React/Zustand imports).

import type { Modifiers } from '../../core/progress/types'
import type { GodKind } from '../../core/data/towers'
import { createLedger, spend, canAfford, earn, waveIncome, type Ledger } from '../../core/economy/ledger'
import { waveSpec, type WaveSpec } from '../../core/systems/waveManager'
import { foldRunModifiers, type Boon } from '../../core/run/boons'
import { generateDraft, scheduleNextDraft, type DraftOption } from '../../core/run/draft'
import type { RunPhase, RunModifiers, SpawnDesc } from '../../core/run/types'

export interface RunSnapshot {
  gold: number
  lives: number
  wave: number
  kills: number
  phase: RunPhase
  draftOptions: DraftOption[] | null
  invincible: boolean
  /** True only when the player may press "Start wave" (building, no draft open, not over). */
  canStartWave: boolean
}

type Rng = () => number

export class RunController {
  private ledger: Ledger = createLedger(0)
  lives = 0
  wave = 0
  kills = 0
  phase: RunPhase = 'building'
  invincible = false

  private meta: Modifiers = { startingGold: 0, startingLives: 0, towerDamageMul: 1 }
  private modifiers: RunModifiers = { towerDamageMul: 1, fireRateMul: 1, goldPerKillBonus: 0, godDamageMul: { zeus: 1, apollo: 1 } }
  private activeBoons: Boon[] = []

  draft: DraftOption[] | null = null
  private nextDraftWave = 3

  // active-wave spawn bookkeeping
  private spec: WaveSpec | null = null
  private spawnedCount = 0
  private spawnTimerMs = 0

  private readonly rng: Rng

  constructor(rng: Rng = Math.random) {
    this.rng = rng
  }

  /** Begin a fresh run from the meta modifiers (skill tree → run start). */
  start(meta: Modifiers): void {
    this.meta = meta
    this.ledger = createLedger(meta.startingGold)
    this.lives = meta.startingLives
    this.wave = 0
    this.kills = 0
    this.phase = 'building'
    this.invincible = false
    this.activeBoons = []
    this.modifiers = foldRunModifiers(meta, this.activeBoons)
    this.draft = null
    this.nextDraftWave = scheduleNextDraft(0, this.rng) // first draft 3–5 waves in, never before wave 1
    this.spec = null
    this.spawnedCount = 0
    this.spawnTimerMs = 0
  }

  // ── intents (forwarded from React via the scene) ──

  requestStartWave(): void {
    if (this.phase !== 'building' || this.draft) return
    this.beginWave(this.wave + 1)
  }

  pickDraft(index: number): void {
    if (!this.draft) return
    const opt = this.draft[index]
    this.draft = null
    if (!opt || opt.type !== 'boon') return // M3 never emits 'god'; ignore defensively
    this.applyBoon(opt.boon)
  }

  cheatGold(): void {
    earn(this.ledger, 1000)
  }

  toggleInvincible(): void {
    this.invincible = !this.invincible
  }

  // ── purchasing (placement) ──

  canAfford(cost: number): boolean {
    return canAfford(this.ledger, cost)
  }

  /** Spend for a tower placement. Returns false (and changes nothing) if too poor. */
  purchase(cost: number): boolean {
    return spend(this.ledger, cost)
  }

  // ── the loop, driven by the scene's single clock ──

  /** Advance spawning by `dtSec`. Returns the enemies to spawn THIS frame (possibly several at FF). */
  tick(dtSec: number): SpawnDesc[] {
    if (this.phase !== 'spawning' || !this.spec) return []
    const out: SpawnDesc[] = []
    this.spawnTimerMs += dtSec * 1000
    while (this.spawnedCount < this.spec.count && this.spawnTimerMs >= this.spec.intervalMs) {
      this.spawnTimerMs -= this.spec.intervalMs
      this.spawnedCount++
      out.push({ kind: 'shade', hp: this.spec.hp, speed: this.spec.speed, bounty: this.spec.bounty, leakWeight: this.spec.leakWeight })
    }
    if (this.spawnedCount >= this.spec.count) this.phase = 'clearing'
    return out
  }

  /** A kill: pay the bounty (+ any per-kill boon) and count it. */
  onKill(bounty: number): void {
    earn(this.ledger, bounty + this.modifiers.goldPerKillBonus)
    this.kills++
  }

  /** A leak: lose lives (unless invincible) and maybe end the run. Returns true if a life was lost. */
  onLeak(weight: number): boolean {
    if (this.phase === 'over' || this.invincible) return false
    this.lives -= weight
    if (this.lives <= 0) {
      this.lives = 0
      this.phase = 'over'
    }
    return true
  }

  /**
   * The clear-gate: a wave is over ONLY when every enemy has been emitted AND none remain alive.
   * INVARIANT: any death-spawned enemy (future Hydra split, M4) MUST be pushed to the scene's
   * enemy array BEFORE this is called each frame, or `liveEnemyCount === 0` could false-trigger
   * between a parent's death and its children's spawn.
   */
  settle(liveEnemyCount: number): void {
    if (this.phase !== 'clearing' || liveEnemyCount > 0) return
    earn(this.ledger, waveIncome(this.wave, this.ledger.gold))
    this.phase = 'building'
    this.spec = null
    if (this.wave >= this.nextDraftWave) {
      this.draft = generateDraft(this.wave, this.rng)
      this.nextDraftWave = scheduleNextDraft(this.wave, this.rng)
    }
  }

  // ── fire-time stat reads (NEVER baked at placement, so re-folds reach existing towers) ──

  effectiveDamage(god: GodKind, baseDamage: number): number {
    return baseDamage * this.modifiers.towerDamageMul * this.modifiers.godDamageMul[god]
  }

  effectiveFireRate(_god: GodKind, baseFireRate: number): number {
    return baseFireRate * this.modifiers.fireRateMul
  }

  snapshot(): RunSnapshot {
    return {
      gold: this.ledger.gold,
      lives: this.lives,
      wave: this.wave,
      kills: this.kills,
      phase: this.phase,
      draftOptions: this.draft,
      invincible: this.invincible,
      canStartWave: this.phase === 'building' && !this.draft,
    }
  }

  // ── internals ──

  private beginWave(n: number): void {
    this.wave = n
    this.spec = waveSpec(n)
    this.spawnedCount = 0
    this.spawnTimerMs = this.spec.intervalMs // first enemy spawns on the first tick
    this.phase = 'spawning'
  }

  private applyBoon(boon: Boon): void {
    const e = boon.effect
    if (e.kind === 'goldGrant') earn(this.ledger, e.value)
    else if (e.kind === 'livesGrant') this.lives += e.value
    else {
      this.activeBoons.push(boon)
      this.modifiers = foldRunModifiers(this.meta, this.activeBoons) // re-fold live
    }
  }
}
