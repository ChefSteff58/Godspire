// ── src/game/run ── the authoritative owner of one roguelike run.
//
// GameScene owns enemies/sprites/the clock; this object owns the NUMBERS (gold, lives, wave,
// phase, modifiers, the draft). React never writes these — it only enqueues intents that the
// scene drains and forwards here, and reads a single mirrored snapshot per frame. Pure logic
// lives in src/core; this is a thin stateful conductor over it (no Phaser/React/Zustand imports).

import type { Modifiers } from '../../core/progress/types'
import type { GodKind } from '../../core/data/towers'
import { createLedger, spend, canAfford, earn, waveIncome, type Ledger } from '../../core/economy/ledger'
import { waveSpec, wavePreview, type WaveSpec } from '../../core/systems/waveManager'
import { foldRunModifiers, boonGod, type BoonEffect, type Boon } from '../../core/run/boons'
import { generateDraft, scheduleNextDraft, type DraftOption } from '../../core/run/draft'
import type { SpawnDesc } from '../../core/entities/enemy'
import type { RunPhase, RunModifiers } from '../../core/run/types'

export interface RunSnapshot {
  gold: number
  lives: number
  maxLives: number
  shieldCharges: number
  wave: number
  kills: number
  phase: RunPhase
  draftOptions: DraftOption[] | null
  invincible: boolean
  /** True only when the player may press "Start wave" (building, no draft open, not over). */
  canStartWave: boolean
  /** Gold cost of the next reroll of the open draft — 0 while the run's one free reroll is unused. */
  rerollCost: number
}

type Rng = () => number

/** Grace before an auto-started wave begins (counted on the scaled clock, never wall-clock). */
const BUILD_GRACE_MS = 1500
/** Longer grace before a wave that debuts a kind / brings a boss / masses an elite legion — the
 * pre-wave telegraph needs to be ACTIONABLE (time to buy the counter), not just decorative. */
const BUILD_GRACE_BIG_MS = 4000
/** M11 reroll economy: base gold for the first PAID reroll, ×growth per paid reroll this run, and the
 * whole thing scales with wave depth (`×(1+wave/10)`) so it stays meaningful as gold inflates. */
const REROLL_BASE = 50
const REROLL_GROWTH = 2

export class RunController {
  private ledger: Ledger = createLedger(0)
  lives = 0
  maxLives = 0
  wave = 0
  kills = 0
  phase: RunPhase = 'building'
  invincible = false
  /** When true, the next wave begins automatically after a short build grace. */
  autoStart = false
  private buildGraceMs = BUILD_GRACE_MS
  private shieldCharges = 0
  private secondWindArmed = false
  /** Gods currently fielded — GameScene refreshes on place/sell; draft filters dead god-boons. */
  builtGods = new Set<string>()
  /** Pulses true the moment Nike catches a fatal leak — GameScene consumes it for the fanfare. */
  secondWindFired = false

  // ── per-run stats for the end-of-run dump (M6) ──
  private goldSpent = 0
  private goldEarned = 0
  private towersBuilt = 0
  private bossesKilled = 0
  private livesLostThisWave = 0
  private worstWave = 0
  private worstWaveLives = 0
  /** Leaked lives tallied by enemy kind — the death screen names your deadliest foe. */
  private leaksByKind: Record<string, number> = {}

  private meta: Modifiers = { startingGold: 0, startingLives: 0, towerDamageMul: 1, fireRateMul: 1, bossDamageMul: 1, incomeMul: 1, goldPerKillAdd: 0, startingShield: 0, secondWindStart: false, draftBonusOptions: 0 }
  // Placeholder; start() rebuilds modifiers (incl. a godDamageMul entry per god) via foldRunModifiers.
  private modifiers: RunModifiers = { towerDamageMul: 1, fireRateMul: 1, goldPerKillBonus: 0, godDamageMul: { zeus: 1, apollo: 1, demeter: 1, hermes: 1, hephaestus: 1, poseidon: 1, aphrodite: 1, athena: 1 }, bossDamageMul: 1, incomeMul: 1, demeterIncomeMul: 1, knockbackMul: 1, auraRangeMul: 1, charmTargetsAdd: 0, spikeChargesAdd: 0, critChance: 0, critMult: 1, chainChance: 0, instakillChance: 0, camoRevealChance: 0, monotheistMul: 1, pantheonPerGod: 0, vengeancePerLife: 0 }
  private persistentEffects: BoonEffect[] = []
  /** How many times each boon id has been drafted — de-weights repeats in later drafts. */
  private boonCounts = new Map<string, number>()

  draft: DraftOption[] | null = null
  private nextDraftWave = 3
  /** M11 reroll: ONE free reroll for the whole run, then each paid reroll costs escalating gold. */
  private freeRerollUsed = false
  private paidRerolls = 0

  // active-wave spawn bookkeeping — a cursor over the wave's groups
  private spec: WaveSpec | null = null
  private groupIdx = 0
  private spawnedInGroup = 0
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
    this.maxLives = meta.startingLives
    this.shieldCharges = meta.startingShield ?? 0 // Pantheon Gate Wards
    this.secondWindArmed = meta.secondWindStart ?? false // Pantheon Breath of Nike
    this.wave = 0
    this.kills = 0
    this.phase = 'building'
    this.invincible = false
    this.buildGraceMs = BUILD_GRACE_MS
    this.persistentEffects = []
    this.boonCounts = new Map()
    this.modifiers = foldRunModifiers(meta, this.persistentEffects)
    this.draft = null
    this.nextDraftWave = scheduleNextDraft(0, this.rng) // first draft 3–5 waves in, never before wave 1
    this.freeRerollUsed = false
    this.paidRerolls = 0
    this.spec = null
    this.groupIdx = 0
    this.spawnedInGroup = 0
    this.spawnTimerMs = 0
    this.goldSpent = 0
    this.goldEarned = 0
    this.towersBuilt = 0
    this.bossesKilled = 0
    this.livesLostThisWave = 0
    this.worstWave = 0
    this.worstWaveLives = 0
    this.leaksByKind = {}
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
    this.boonCounts.set(opt.boon.id, (this.boonCounts.get(opt.boon.id) ?? 0) + 1)
    this.applyEffect(opt.boon.effect)
  }

  /** Boons that are DEAD CARDS right now — an armed Nike re-offer, a heal at full HP, or a per-god
   * boon for a god not on the field. Shared by the wave-clear draft and the reroll so they filter alike. */
  private draftExclude = (b: Boon): boolean => {
    if (b.effect.kind === 'secondWind' && this.secondWindArmed) return true // an armed Nike re-offer is dead
    if (b.effect.kind === 'livesGrant' && this.lives >= this.maxLives) return true // heal at full HP is dead
    const g = boonGod(b) // a per-god signature boon for a god not on the field is dead
    return g !== null && !this.builtGods.has(g)
  }

  /** Gold cost of the NEXT reroll — 0 while the run's single free reroll is unused, else escalating
   * with wave depth AND how many paid rerolls you've already bought this run. */
  rerollCost(): number {
    if (!this.freeRerollUsed) return 0
    return Math.round(REROLL_BASE * (1 + this.wave / 10) * REROLL_GROWTH ** this.paidRerolls)
  }

  /** "Tempt the Fates": reroll the OPEN draft, spending the free reroll or escalating gold. Returns
   * true only if it actually rerolled (false when no draft is open or the player can't afford it). */
  rerollDraft(): boolean {
    if (!this.draft) return false
    const cost = this.rerollCost()
    if (cost > 0) {
      if (!this.purchase(cost)) return false // too poor — no-op, the card stays
      this.paidRerolls++
    } else {
      this.freeRerollUsed = true
    }
    this.draft = generateDraft(this.wave, this.rng, 3 + (this.meta.draftBonusOptions ?? 0), this.draftExclude, this.boonCounts)
    return true
  }

  /** Earn gold AND tally it for the end-of-run stats (the one income choke point). */
  private earnGold(amount: number): void {
    earn(this.ledger, amount)
    this.goldEarned += amount
  }

  /** Add gold directly (Demeter harvest, tower-sell refund, etc.). */
  grantGold(amount: number): void {
    this.earnGold(amount)
  }

  cheatGold(): void {
    earn(this.ledger, 1000) // a cheat — deliberately NOT counted in goldEarned
  }

  /** Count a tower placement (gold for it is tracked separately in purchase). */
  onTowerBuilt(): void {
    this.towersBuilt++
  }

  toggleInvincible(): void {
    this.invincible = !this.invincible
  }

  /** DEV only: jump straight to a wave (boss testing / tuning). */
  devJumpToWave(n: number): void {
    this.beginWave(Math.max(1, Math.floor(n)))
  }

  // ── purchasing (placement) ──

  canAfford(cost: number): boolean {
    return canAfford(this.ledger, cost)
  }

  /** Spend for a tower placement / upgrade. Returns false (and changes nothing) if too poor. */
  purchase(cost: number): boolean {
    const ok = spend(this.ledger, cost)
    if (ok) this.goldSpent += cost
    return ok
  }

  // ── the loop, driven by the scene's single clock ──

  /** Advance spawning by `dtSec`. Returns the enemies to spawn THIS frame (possibly several at FF). */
  tick(dtSec: number, graceDtSec = dtSec): SpawnDesc[] {
    // Auto-start: after a wave clears, begin the next one once a short grace elapses. Counted on
    // the SCALED clock (this is fed scaled dt), so it respects pause/FF and never fires mid-draft.
    // The FIRST wave never auto-starts — the player needs unhurried time to lay opening towers
    // (matches BTD6, where you press play for round 1 and rounds auto-chain after).
    if (this.autoStart && this.phase === 'building' && !this.draft && this.wave >= 1) {
      // grace runs on WALL time (graceDtSec) — at 3× the sim races but the telegraph window
      // must stay readable; at pause neither advances (tick isn't called)
      this.buildGraceMs -= graceDtSec * 1000
      if (this.buildGraceMs <= 0) this.beginWave(this.wave + 1)
    }
    if (this.phase !== 'spawning' || !this.spec) return []
    const out: SpawnDesc[] = []
    this.spawnTimerMs += dtSec * 1000
    const groups = this.spec.groups
    // Walk the group cursor: emit from the current group until its count, advance to the next, and
    // flip to 'clearing' only once the LAST group is fully emitted (the clear-gate depends on this).
    while (true) {
      const group = groups[this.groupIdx]
      if (!group) {
        this.phase = 'clearing'
        break
      }
      if (this.spawnedInGroup >= group.count) {
        this.groupIdx++
        this.spawnedInGroup = 0
        continue
      }
      if (this.spawnTimerMs < group.intervalMs) break // wait for the next spawn tick
      this.spawnTimerMs -= group.intervalMs
      this.spawnedInGroup++
      out.push({ kind: group.kind, hp: group.hp, speed: group.speed, bounty: group.bounty, leakWeight: group.leakWeight, splitDepth: 0, bossId: group.bossId, damageCap: group.damageCap, armor: group.armor })
    }
    return out
  }

  /** A kill: pay the bounty (+ any per-kill boon) and count it (+ tally bosses). */
  onKill(bounty: number, isBoss = false): void {
    this.earnGold(bounty + this.modifiers.goldPerKillBonus)
    this.kills++
    if (isBoss) this.bossesKilled++
  }

  /**
   * A leak: a gate shield absorbs it if any charge remains; otherwise lose lives, with Second Wind
   * catching the first lethal blow. Returns true if the player felt it (life lost / saved) — for juice.
   */
  onLeak(weight: number, kind = 'enemy'): boolean {
    if (this.phase === 'over' || this.invincible) return false
    if (this.shieldCharges > 0) {
      this.shieldCharges -= 1 // shield eats the leak, no life lost
      return false
    }
    const actual = Math.min(weight, this.lives) // count ACTUAL lives lost, not raw weight
    this.livesLostThisWave += actual
    this.leaksByKind[kind] = (this.leaksByKind[kind] ?? 0) + actual
    this.lives -= weight
    if (this.lives <= 0) {
      if (this.secondWindArmed) {
        this.secondWindArmed = false
        this.lives = 25 // Nike refuses to let you lose — once
        this.secondWindFired = true // the game's most legendary save must not happen silently
        return true
      }
      this.lives = 0
      this.finalizeWorstWave() // capture the death wave before the run ends (no beginWave will run)
      this.phase = 'over'
    }
    return true
  }

  /** Roll the current wave's lives-lost into the worst-wave record, then reset for the next wave. */
  private finalizeWorstWave(): void {
    if (this.livesLostThisWave > this.worstWaveLives) {
      this.worstWaveLives = this.livesLostThisWave
      this.worstWave = this.wave
    }
    this.livesLostThisWave = 0
  }

  /**
   * The clear-gate: a wave is over ONLY when every enemy has been emitted AND none remain alive.
   * INVARIANT: any death-spawned enemy (future Hydra split, M4) MUST be pushed to the scene's
   * enemy array BEFORE this is called each frame, or `liveEnemyCount === 0` could false-trigger
   * between a parent's death and its children's spawn.
   * Returns the wave income paid on a clear (the scene floats it as a payday), else null.
   */
  settle(liveEnemyCount: number): number | null {
    if (this.phase !== 'clearing' || liveEnemyCount > 0) return null
    const income = Math.round(waveIncome(this.wave, this.ledger.gold) * this.modifiers.incomeMul) // Pantheon income
    this.earnGold(income)
    this.phase = 'building'
    // Restart the auto-start grace — longer when the NEXT wave debuts a kind / brings a boss / is
    // elite, so the pre-wave telegraph leaves real time to buy the counter before it starts.
    const next = wavePreview(this.wave + 1)
    this.buildGraceMs = next.debutKind || next.bossId || next.elite ? BUILD_GRACE_BIG_MS : BUILD_GRACE_MS
    this.spec = null
    if (this.wave >= this.nextDraftWave) {
      this.draft = generateDraft(
        this.wave,
        this.rng,
        3 + (this.meta.draftBonusOptions ?? 0), // Pantheon draft luck
        this.draftExclude,
        this.boonCounts,
      )
      this.nextDraftWave = scheduleNextDraft(this.wave, this.rng)
    }
    return income // a wave just cleared this frame (the scene pays Demeter income + floats the payday)
  }

  // ── fire-time stat reads (NEVER baked at placement, so re-folds reach existing towers) ──

  effectiveDamage(god: GodKind, baseDamage: number): number {
    return baseDamage * this.modifiers.towerDamageMul * this.modifiers.godDamageMul[god] * this.buildMul()
  }

  /** M11 build-defining boons — a DYNAMIC damage factor read from live run state (roster + lives lost),
   * so it re-evaluates every shot as you build/sell gods or bleed lives. 1 when no build boon is active. */
  private buildMul(): number {
    const m = this.modifiers
    let f = 1
    if (m.pantheonPerGod > 0) f *= 1 + m.pantheonPerGod * this.builtGods.size // reward a broad roster
    if (m.vengeancePerLife > 0) f *= 1 + m.vengeancePerLife * Math.max(0, this.maxLives - this.lives) // comeback
    if (m.monotheistMul > 1 && this.builtGods.size === 1) f *= m.monotheistMul // devotion to a single god
    return f
  }

  effectiveFireRate(_god: GodKind, baseFireRate: number): number {
    return baseFireRate * this.modifiers.fireRateMul
  }

  /** Pantheon Titan-Slayer: bonus damage vs bosses (applied at hit-time in the scene). */
  get bossDamageMul(): number {
    return this.modifiers.bossDamageMul
  }

  // ── M11 per-god signature reads (the scene applies these at the god's mechanic site) ──
  get demeterIncomeMul(): number { return this.modifiers.demeterIncomeMul }
  get knockbackMul(): number { return this.modifiers.knockbackMul }
  get auraRangeMul(): number { return this.modifiers.auraRangeMul }
  get charmTargetsAdd(): number { return this.modifiers.charmTargetsAdd }
  get spikeChargesAdd(): number { return this.modifiers.spikeChargesAdd }
  // ── M11 long-shot proc reads (rolled per shot in the fire loop) ──
  get critChance(): number { return this.modifiers.critChance }
  get critMult(): number { return this.modifiers.critMult }
  get chainChance(): number { return this.modifiers.chainChance }
  get instakillChance(): number { return this.modifiers.instakillChance }
  get camoRevealChance(): number { return this.modifiers.camoRevealChance }

  snapshot(): RunSnapshot {
    return {
      gold: this.ledger.gold,
      lives: this.lives,
      maxLives: this.maxLives,
      shieldCharges: this.shieldCharges,
      wave: this.wave,
      kills: this.kills,
      phase: this.phase,
      draftOptions: this.draft,
      invincible: this.invincible,
      canStartWave: this.phase === 'building' && !this.draft,
      rerollCost: this.rerollCost(),
    }
  }

  /** Per-run tallies for the end-of-run stats screen (read once when the run ends). */
  runStats(): {
    goldSpent: number
    goldEarned: number
    towersBuilt: number
    bossesKilled: number
    worstWave: number
    worstWaveLives: number
    deadliestFoe: { kind: string; lives: number } | null
  } {
    let deadliestFoe: { kind: string; lives: number } | null = null
    for (const [kind, lives] of Object.entries(this.leaksByKind)) {
      if (!deadliestFoe || lives > deadliestFoe.lives) deadliestFoe = { kind, lives }
    }
    return {
      goldSpent: this.goldSpent,
      goldEarned: this.goldEarned,
      towersBuilt: this.towersBuilt,
      bossesKilled: this.bossesKilled,
      worstWave: this.worstWave,
      worstWaveLives: this.worstWaveLives,
      deadliestFoe,
    }
  }

  // ── internals ──

  private beginWave(n: number): void {
    this.finalizeWorstWave() // close out the prior wave's lives-lost before advancing
    this.wave = n
    this.spec = waveSpec(n)
    this.groupIdx = 0
    this.spawnedInGroup = 0
    this.spawnTimerMs = this.spec.groups[0]?.intervalMs ?? 0 // first enemy spawns on the first tick
    this.phase = 'spawning'
  }

  /**
   * Apply one boon effect. Immediate kinds resolve now; persistent kinds join the fold (re-folded
   * live so they reach already-placed towers); composite/coinflip recurse so the fold only ever
   * sees flat leaf effects.
   */
  private applyEffect(e: BoonEffect): void {
    switch (e.kind) {
      case 'goldGrant':
        this.earnGold(e.value)
        break
      case 'livesGrant':
        this.addLives(e.value)
        break
      case 'maxLivesAdd':
        this.maxLives += e.value
        this.addLives(e.value)
        break
      case 'gateShield':
        this.shieldCharges += e.value
        break
      case 'secondWind':
        this.secondWindArmed = true
        break
      case 'composite':
        for (const sub of e.effects) this.applyEffect(sub)
        break
      case 'coinflipFold':
        this.applyEffect(this.rng() < 0.5 ? e.win : e.lose)
        break
      default: // persistent: goldPerKillAdd | towerDamageMul | godDamageMul | fireRateMul
        this.persistentEffects.push(e)
        this.modifiers = foldRunModifiers(this.meta, this.persistentEffects)
    }
  }

  /** Heal (clamped to maxLives); a negative grant can drive the run to defeat. */
  private addLives(v: number): void {
    this.lives = Math.min(this.lives + v, this.maxLives)
    if (this.lives <= 0) {
      this.lives = 0
      this.phase = 'over'
    }
  }
}
