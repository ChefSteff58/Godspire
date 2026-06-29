import Phaser from 'phaser'
import { useGameStore } from '../../state/gameStore'
import { useSessionStore } from '../../state/sessionStore'
import { PathSystem, OLYMPUS_PATH } from '../../core/map/path'
import { OBSTACLES } from '../../core/map/obstacles'
import { canPlace } from '../../core/map/placement'
import {
  createEnemy,
  advanceEnemy,
  damageEnemy,
  onDeath,
  applySlow,
  enemyRadius,
  enemyColor,
  enemyStroke,
  damagedColor,
  damagedRadius,
  type Enemy,
  type SpawnDesc,
} from '../../core/entities/enemy'
import { bossById } from '../../core/data/bosses'
import { createTower, type Tower } from '../../core/entities/tower'
import {
  createProjectile,
  advanceProjectile,
  projectileDone,
  type Projectile,
} from '../../core/entities/projectile'
import { selectTarget, type TargetingMode } from '../../core/systems/targeting'
import { TOWER_STATS, sellValue, type GodKind } from '../../core/data/towers'
import {
  UPGRADES,
  towerEffectiveStats,
  auraBuff,
  demeterIncome,
  nextTier,
  canUpgradePath,
} from '../../core/data/upgrades'
import { favorFromRun } from '../../core/progress/rules'
import type { Vec2 } from '../../core/types'
import { RunController } from '../run/RunController'
import { GAME_WIDTH, GAME_HEIGHT } from '../dimensions'

const MAX_DELTA_MS = 50
const BOUNDS = { w: GAME_WIDTH, h: GAME_HEIGHT }
// Frame-budget guard: never let more than this many bodies live at once (targeting/collision loops
// are O(towers × enemies) / O(projectiles × enemies)). Over-budget wave spawns DEFER, they don't drop.
const MAX_CONCURRENT_BODIES = 60

/** A Hephaestus spike trap on the path — pops each ground enemy once, consuming a charge. */
type Spike = { pos: Vec2; charges: number; damage: number; hitRadius: number; hitIds: string[] }

/**
 * GameScene owns the game loop. M2.5: flat top-down map with dead zones, fast-forward (timeScale),
 * Zeus hitscan + Apollo piercing projectiles, and hit/HP "juice." Logic lives in src/core; this
 * scene renders it, drives the (scaled) clock, and handles placement input.
 */
export class GameScene extends Phaser.Scene {
  private readonly path = new PathSystem(OLYMPUS_PATH)
  private enemies: Enemy[] = []
  // Wave spawns waiting for a free body slot (keeps the wave intact when we hit the concurrency cap).
  private pendingSpawns: SpawnDesc[] = []
  private readonly enemySprites = new Map<string, Phaser.GameObjects.Arc>()
  private towers: Tower[] = []
  private readonly towerSprites = new Map<string, Phaser.GameObjects.Container>()
  // Mobile gods (Hermes) get a static "home base" badge at their orbit center — the click target.
  private readonly homeBaseGfx = new Map<string, Phaser.GameObjects.Container>()
  private projectiles: Projectile[] = []
  private readonly projSprites = new Map<string, Phaser.GameObjects.Rectangle>()
  // Hephaestus spike traps, one per owner tower (keyed by tower id).
  private readonly spikes = new Map<string, Spike>()
  private readonly spikeGfx = new Map<string, Phaser.GameObjects.Graphics>()
  // Aphrodite holds a STABLE set of charmed enemy ids per tower, so the slowed foes don't churn.
  private readonly charmedByTower = new Map<string, Set<string>>()
  private overlay!: Phaser.GameObjects.Graphics
  private ghost!: Phaser.GameObjects.Graphics
  private pointer: Vec2 = { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 }
  private elapsedAccumMs = 0
  private elapsedSec = 0
  private run = new RunController()
  private runEnded = false
  private draftWasOpen = false
  private selectedTowerId: string | null = null
  private harpyTold = false

  constructor() {
    super('Game')
  }

  create(): void {
    this.drawBackground()
    this.drawTerrain()
    this.drawPath()
    this.drawObstacles()
    this.drawMarkers()
    this.overlay = this.add.graphics().setDepth(3)
    this.ghost = this.add.graphics().setDepth(10)

    this.enemies = []
    this.pendingSpawns = []
    this.enemySprites.clear()
    this.towers = []
    this.towerSprites.clear()
    this.homeBaseGfx.clear()
    this.projectiles = []
    this.projSprites.clear()
    this.spikes.clear()
    this.spikeGfx.clear() // old graphics are destroyed by scene.restart
    this.charmedByTower.clear()
    this.elapsedAccumMs = 0
    this.elapsedSec = 0

    // Start a fresh run: the skill-tree meta (gold/lives/towerDmg) feeds run-start here.
    this.run = new RunController()
    this.run.start(useSessionStore.getState().getModifiers())
    this.runEnded = false
    this.draftWasOpen = false
    this.selectedTowerId = null
    this.harpyTold = false
    useGameStore.getState().setElapsed(0)
    useGameStore.getState().setRunSummary(null)
    useGameStore.getState().setSelectedTower(null)
    useGameStore.getState().mirrorRun(this.run.snapshot())

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      this.pointer = { x: p.worldX, y: p.worldY }
    })
    // Click-to-place (clearer than drag on a laptop): click a god in the rail, then click the
    // field to place. Clicking empty ground while not placing selects/deselects a tower.
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onPointerDown(p))
    this.input.keyboard?.on('keydown-ESC', () => {
      useGameStore.getState().cancelPlacing()
      this.deselectTower()
    })

    if (import.meta.env.DEV) {
      ;(window as unknown as Record<string, unknown>).godspireScene = this
    }
  }

  devStep(frames: number, dtMs = 16): void {
    for (let i = 0; i < frames; i++) this.update(0, dtMs)
  }

  getEnemies(): readonly Enemy[] {
    return this.enemies
  }
  getTowers(): readonly Tower[] {
    return this.towers
  }

  private enemyPos = (e: Enemy): Vec2 => this.path.getPointAt(e.pathT)
  private towerFootprints() {
    // A mobile god's dead zone is its FIXED home base, not its orbiting position — so other towers
    // can be built freely under its sweep (only the small base footprint is blocked).
    return this.towers.map((t) => ({
      pos: TOWER_STATS[t.god].mobile ? t.center : t.pos,
      footprint: TOWER_STATS[t.god].footprint,
    }))
  }

  // ── static map (flat, top-down) ──
  private drawBackground(): void {
    const g = this.add.graphics().setDepth(0)
    g.fillStyle(0x14121a, 1)
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
    // flat atmosphere only — ember glow at Tartarus (bottom-left), gold at Olympus (top-right)
    g.fillStyle(0x4a121b, 0.22)
    g.fillCircle(0, GAME_HEIGHT, 240)
    g.fillStyle(0x3a2f10, 0.2)
    g.fillCircle(GAME_WIDTH, 0, 240)
  }

  private drawPath(): void {
    const g = this.add.graphics().setDepth(1)
    g.lineStyle(46, 0x0d0b12, 1) // dead-zone buffer band (tight to the road)
    this.strokePolyline(g)
    g.lineStyle(40, 0x2a2533, 1) // walkable road
    this.strokePolyline(g)
  }

  private strokePolyline(g: Phaser.GameObjects.Graphics): void {
    g.beginPath()
    g.moveTo(OLYMPUS_PATH[0].x, OLYMPUS_PATH[0].y)
    for (let i = 1; i < OLYMPUS_PATH.length; i++) g.lineTo(OLYMPUS_PATH[i].x, OLYMPUS_PATH[i].y)
    g.strokePath()
  }

  private drawTerrain(): void {
    const g = this.add.graphics().setDepth(0.5)
    // subtle buildable "plots" so the field reads as a map, not a flat void (placeholder; art in M8)
    const zones: [number, number, number, number, number][] = [
      [40, 150, 330, 210, 0x1b2018],
      [400, 95, 380, 150, 0x191c22],
      [360, 340, 430, 175, 0x1d1a16],
    ]
    for (const [x, y, w, h, c] of zones) {
      g.fillStyle(c, 0.6)
      g.fillRoundedRect(x, y, w, h, 24)
    }
  }

  private drawObstacles(): void {
    const g = this.add.graphics().setDepth(2)
    for (const o of OBSTACLES) {
      const s = o.shape
      if (o.id === 'styx' && s.kind === 'circle') {
        g.fillStyle(0x123847, 0.95)
        g.fillCircle(s.x, s.y, s.r)
        g.fillStyle(0x2f6f8c, 0.95)
        g.fillCircle(s.x, s.y, s.r - 6)
        g.fillStyle(0x5aa6c2, 0.5)
        g.fillCircle(s.x - 7, s.y - 7, s.r * 0.42)
      } else if (o.id === 'columns' && s.kind === 'circle') {
        for (const [dx, dy] of [[-12, -4], [5, -13], [13, 7], [-5, 11]]) {
          g.fillStyle(0x5f6470, 1)
          g.fillCircle(s.x + dx, s.y + dy + 3, 8)
          g.fillStyle(0x9aa0ac, 1)
          g.fillCircle(s.x + dx, s.y + dy, 8)
        }
      } else if (o.id === 'olive' && s.kind === 'rect') {
        for (let i = 0; i < 6; i++) {
          const cx = s.x + 14 + (i % 3) * ((s.w - 28) / 2)
          const cy = s.y + 13 + Math.floor(i / 3) * (s.h - 26)
          g.fillStyle(0x2f4a1f, 1)
          g.fillCircle(cx, cy + 2, 11)
          g.fillStyle(0x4e7a32, 1)
          g.fillCircle(cx - 2, cy - 2, 9)
        }
      } else if (s.kind === 'circle') {
        g.fillStyle(0x42424a, 1)
        g.fillCircle(s.x, s.y, s.r)
        g.fillStyle(0x63636d, 0.85)
        g.fillCircle(s.x - 6, s.y - 7, s.r * 0.5)
      } else {
        g.fillStyle(o.color, 0.9)
        g.fillRoundedRect(s.x, s.y, s.w, s.h, 6)
      }
    }
  }

  private drawMarkers(): void {
    const start = OLYMPUS_PATH[0]
    const end = OLYMPUS_PATH[OLYMPUS_PATH.length - 1]
    const g = this.add.graphics().setDepth(2)
    // Tartarus rift — concentric ellipses bleeding off the bottom-left edge
    const rings: [number, number][] = [
      [62, 0x2a0810],
      [46, 0x7a1020],
      [30, 0xd83a2a],
      [15, 0xffb070],
    ]
    for (const [r, c] of rings) {
      g.fillStyle(c, 0.92)
      g.fillEllipse(start.x, start.y, r * 1.9, r * 1.35)
    }
    this.add
      .text(start.x + 34, start.y - 46, 'Tartarus', { fontFamily: 'Georgia, serif', fontSize: '12px', color: '#e08a98' })
      .setOrigin(0.5)
      .setDepth(2)
    // Olympus gate — gold pillared slab off the top-right edge
    g.fillStyle(0xf5d061, 0.96)
    g.fillRoundedRect(end.x - 78, end.y - 36, 130, 74, 6)
    g.fillStyle(0xbfa03a, 1)
    g.fillRect(end.x - 64, end.y - 36, 11, 74)
    g.fillRect(end.x - 30, end.y - 36, 11, 74)
    this.add
      .text(end.x - 44, end.y, 'OLYMPUS', {
        fontFamily: 'Georgia, serif',
        fontSize: '11px',
        color: '#1a1407',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(2)
  }

  update(_time: number, delta: number): void {
    // Intents + run-over + draft-pause run EVERY frame, even while paused (dt may be 0).
    this.applyIntents()
    this.run.autoStart = useGameStore.getState().autoStart // read-through preference
    if (this.run.phase === 'over' && !this.runEnded) this.endRun()
    this.syncDraftPause()

    const scale = useGameStore.getState().timeScale
    const dt = Math.min(delta, MAX_DELTA_MS) * scale

    if (dt > 0 && this.run.phase !== 'over') {
      const dtSec = dt / 1000

      this.elapsedAccumMs += dt
      if (this.elapsedAccumMs >= 1000) {
        this.elapsedAccumMs -= 1000
        this.elapsedSec += 1
        useGameStore.getState().setElapsed(this.elapsedSec)
      }

      // spawn this wave's enemies on the run's schedule — but never exceed the concurrency cap;
      // over-budget spawns wait in pendingSpawns and emit as bodies die (the wave stays intact).
      for (const desc of this.run.tick(dtSec)) this.pendingSpawns.push(desc)
      while (this.pendingSpawns.length > 0 && this.enemies.length < MAX_CONCURRENT_BODIES) {
        this.spawnEnemy(this.pendingSpawns.shift()!)
      }

      // Aphrodite chills foes in her field BEFORE they move this frame
      this.updateSlowAuras()

      // advance enemies; sync sprites; leak → lose lives + juice
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i]
        const leaked = advanceEnemy(enemy, dtSec, this.path.length)
        if (leaked) {
          this.onEnemyLeak(enemy)
          continue
        }
        const pos = this.path.getPointAt(enemy.pathT)
        this.enemySprites.get(enemy.id)?.setPosition(pos.x, pos.y)
      }

      // mobile gods (Hermes) orbit their placed center — move them before they acquire/fire
      this.updateMobileTowers(dtSec)

      // towers acquire + fire (effective stats from UPGRADES × run modifiers, read at fire-time)
      for (const tower of this.towers) {
        const eff = towerEffectiveStats(tower)
        if (eff.fireRate <= 0 || eff.damage <= 0) continue // farms (Demeter) don't fire
        tower.cooldown -= dtSec
        if (tower.cooldown > 0) continue
        const aura = this.auraAt(tower.pos) // Athena buffs nearby gods + reveals stealth foes
        const fireRate = this.run.effectiveFireRate(tower.god, eff.fireRate * aura.fireRateMul)
        const dep = TOWER_STATS[tower.god].deployable
        if (dep) {
          // Hephaestus produces a trap charge instead of shooting an enemy directly.
          tower.cooldown = 1 / fireRate
          this.produceSpike(tower, { damage: eff.damage * aura.damageMul, maxCharges: eff.maxCharges }, dep)
          continue
        }
        const target = selectTarget(
          { pos: tower.pos, range: eff.range, canHitAir: eff.canHitAir, canDetect: aura.detect },
          this.enemies,
          this.enemyPos,
          tower.targeting,
        )
        if (!target) continue
        tower.cooldown = 1 / fireRate
        const dmg = this.run.effectiveDamage(tower.god, eff.damage * aura.damageMul)
        const stats = TOWER_STATS[tower.god]
        if (stats.splash) this.fireSplash(this.path.getPointAt(target.pathT), dmg, eff.splashRadius, eff.knockback)
        else if (stats.attack === 'hitscan') this.fireHitscan(tower, target, dmg)
        else this.fireProjectile(tower, target, dmg, eff.pierce, eff.projectileSpeed)
      }

      this.updateProjectiles(dtSec)
      this.updateSpikes()

      // clear-gate: a wave ends only when fully emitted AND no enemy remains alive. Pending (capped)
      // spawns count as "still alive" so a deferred body can't let the wave clear out from under it.
      // When it clears, Demeter farms pay out their harvest.
      if (this.run.settle(this.enemies.length + this.pendingSpawns.length)) this.payDemeterIncome()
    }

    useGameStore.getState().mirrorRun(this.run.snapshot())
    this.renderOverlay()
    this.renderGhost()
  }

  /** Drain React→Phaser intents and forward them to the authoritative run. */
  private applyIntents(): void {
    for (const it of useGameStore.getState().drainIntents()) {
      if (it.type === 'startWave') this.run.requestStartWave()
      else if (it.type === 'pickDraft') this.run.pickDraft(it.index)
      else if (it.type === 'sellTower') this.sellSelectedTower()
      else if (it.type === 'upgradeTower') this.upgradeSelectedTower(it.path)
      else if (it.type === 'setTargeting') this.setSelectedTargeting(it.mode)
      else if (it.type === 'cheatGold') this.run.cheatGold()
      else if (it.type === 'cheatInvincible') this.run.toggleInvincible()
      else if (it.type === 'playAgain') {
        // ORDER MATTERS: clear store mirrors → reset speed → restart, or the overlay sticks.
        useGameStore.getState().resetRun()
        useGameStore.getState().setSpeed(1)
        this.scene.restart()
        return
      }
    }
  }

  /** Pause the sim for the Fate Draft, stashing the player's prior speed (so 3× FF survives). */
  private syncDraftPause(): void {
    const store = useGameStore.getState()
    const open = !!this.run.draft
    if (open && !this.draftWasOpen) {
      this.draftWasOpen = true
      store.setPreDraftScale(store.timeScale === 0 ? 1 : store.timeScale)
      store.setSpeed(0)
    } else if (!open && this.draftWasOpen) {
      this.draftWasOpen = false
      store.setSpeed(store.preDraftScale || 1)
    }
  }

  /** End the run: bank Favor (fire-and-forget — never await, or the lose screen hangs). */
  private endRun(): void {
    this.runEnded = true
    const session = useSessionStore.getState()
    const s = this.run.runStats()
    const result = {
      waveReached: this.run.wave,
      victory: false,
      kills: this.run.kills,
      bossesKilled: s.bossesKilled,
      goldSpent: s.goldSpent,
      goldEarned: s.goldEarned,
      towersBuilt: s.towersBuilt,
      worstWave: s.worstWave,
      worstWaveLives: s.worstWaveLives,
    }
    const bestWave = Math.max(session.progress.stats.bestWave, this.run.wave)
    void session.applyRun(result)
    useGameStore.getState().setRunSummary({
      wave: this.run.wave,
      favor: favorFromRun(result),
      bestWave,
      kills: this.run.kills,
      bossesKilled: s.bossesKilled,
      goldEarned: s.goldEarned,
      goldSpent: s.goldSpent,
      towersBuilt: s.towersBuilt,
      worstWave: s.worstWave,
      worstWaveLives: s.worstWaveLives,
    })
  }

  private onEnemyLeak(enemy: Enemy): void {
    const lost = this.run.onLeak(enemy.leakWeight)
    this.removeEnemy(enemy)
    if (lost) this.flashLeak()
  }

  /** Red pulse at the Olympus gate — the game's only negative feedback, so it's mandatory. */
  private flashLeak(): void {
    const end = OLYMPUS_PATH[OLYMPUS_PATH.length - 1]
    const flash = this.add.circle(end.x, end.y, 26, 0xff2d3a, 0.6).setDepth(9)
    this.tweens.add({ targets: flash, scale: 2.2, alpha: 0, duration: 320, onComplete: () => flash.destroy() })
    this.cameras.main.shake(120, 0.004)
  }

  private spawnEnemy(desc: SpawnDesc): void {
    const enemy = createEnemy(desc.kind)
    enemy.hp = desc.hp
    enemy.maxHp = desc.hp
    enemy.speed = desc.speed
    enemy.bounty = desc.bounty
    enemy.leakWeight = desc.leakWeight
    if (desc.splitDepth !== undefined) enemy.splitDepth = desc.splitDepth
    if (desc.spawnAtT !== undefined) enemy.pathT = desc.spawnAtT // split children appear mid-path
    if (desc.bossId !== undefined) enemy.bossId = desc.bossId
    if (desc.damageCap !== undefined) enemy.damageCap = desc.damageCap
    if (desc.armor !== undefined) enemy.armor = desc.armor // boss armor overrides the kind trait
    if (enemy.kind === 'boss' && enemy.bossId) {
      // derive the live mechanic fields from the roster (Minotaur's CC-resist + charge)
      const m = bossById(enemy.bossId).mechanic
      if (m.slowResist !== undefined) enemy.slowResist = m.slowResist
      if (m.knockbackImmune) enemy.knockbackImmune = true
      if (m.charge) {
        enemy.charge = m.charge
        enemy.baseSpeed = enemy.speed
        enemy.chargeTimerMs = m.charge.periodMs
      }
    }
    this.enemies.push(enemy)
    if (enemy.kind === 'harpy') this.telegraphHarpy()
    if (enemy.kind === 'boss') this.telegraphBoss(enemy)
    const pos = this.path.getPointAt(enemy.pathT)
    const isBoss = enemy.kind === 'boss'
    const sprite = this.add
      .circle(pos.x, pos.y, enemyRadius(enemy), enemyColor(enemy), 1)
      .setStrokeStyle(isBoss ? 4 : enemy.flying ? 3 : 2, enemyStroke(enemy))
      .setDepth(isBoss ? 6 : enemy.flying ? 5 : 4) // bosses ride above everything
    if (enemy.stealth) sprite.setAlpha(0.5) // hidden — reads as a ghostly shimmer
    this.enemySprites.set(enemy.id, sprite)
  }

  /** One-time hint the first time a Harpy appears — the only enemy with a hard counter requirement. */
  private telegraphHarpy(): void {
    if (this.harpyTold) return
    this.harpyTold = true
    const t = this.add
      .text(GAME_WIDTH / 2, 72, "Harpies fly — only Apollo's arrows reach them!", {
        fontFamily: 'Georgia, serif',
        fontSize: '15px',
        color: '#bfe3ff',
        backgroundColor: '#000000aa',
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0.5)
      .setDepth(20)
    this.tweens.add({ targets: t, alpha: 0, delay: 3500, duration: 800, onComplete: () => t.destroy() })
  }

  /** A dramatic banner every time a boss arrives (unlike the once-per-run Harpy hint). */
  private telegraphBoss(enemy: Enemy): void {
    if (!enemy.bossId) return
    const boss = bossById(enemy.bossId)
    this.cameras.main.shake(220, 0.006)
    const t = this.add
      .text(GAME_WIDTH / 2, 80, `⚠ ${boss.name.toUpperCase()} ⚠\n${boss.telegraph}`, {
        fontFamily: 'Georgia, serif',
        fontSize: '17px',
        color: '#ffe6a0',
        align: 'center',
        backgroundColor: '#000000c0',
        padding: { x: 16, y: 9 },
      })
      .setOrigin(0.5)
      .setDepth(20)
    t.setScale(0.6)
    this.tweens.add({ targets: t, scale: 1, duration: 260, ease: 'Back.easeOut' })
    this.tweens.add({ targets: t, alpha: 0, delay: 4200, duration: 900, onComplete: () => t.destroy() })
  }

  private removeEnemy(enemy: Enemy): void {
    this.enemySprites.get(enemy.id)?.destroy()
    this.enemySprites.delete(enemy.id)
    const idx = this.enemies.indexOf(enemy)
    if (idx >= 0) this.enemies.splice(idx, 1)
  }

  /** Mobile gods (Hermes) orbit their placed center; recompute pos + move the sprite each frame. */
  private updateMobileTowers(dtSec: number): void {
    for (const tower of this.towers) {
      const m = TOWER_STATS[tower.god].mobile
      if (!m) continue
      tower.orbitPhase += m.angularSpeed * dtSec
      tower.pos.x = tower.center.x + Math.cos(tower.orbitPhase) * m.orbitRadius
      tower.pos.y = tower.center.y + Math.sin(tower.orbitPhase) * m.orbitRadius
      this.towerSprites.get(tower.id)?.setPosition(tower.pos.x, tower.pos.y)
    }
  }

  /** Athena: the combined buff (+ stealth detection) at a point from every covering aura tower. */
  private auraAt(pos: Vec2): { damageMul: number; fireRateMul: number; detect: boolean } {
    let damageMul = 1
    let fireRateMul = 1
    let detect = false
    for (const a of this.towers) {
      const buff = auraBuff(a)
      if (!buff) continue
      const r = towerEffectiveStats(a).range
      if ((a.pos.x - pos.x) ** 2 + (a.pos.y - pos.y) ** 2 > r * r) continue
      damageMul *= buff.damageMul
      fireRateMul *= buff.fireRateMul
      detect = detect || buff.detect
    }
    return { damageMul, fireRateMul, detect }
  }

  /**
   * Aphrodite: charm a STABLE set of up to N foes (not the whole lane). A charmed foe stays charmed
   * while alive + in range; freed slots are filled by the lead un-charmed foe. Holding membership by
   * id (instead of re-sorting every frame) stops the slowed set from churning/flickering, and foes
   * outside the set are genuinely unaffected.
   */
  private updateSlowAuras(): void {
    let byId: Map<string, Enemy> | null = null
    for (const tower of this.towers) {
      const aura = TOWER_STATS[tower.god].slowAura
      if (!aura) continue
      if (!byId) {
        byId = new Map()
        for (const e of this.enemies) byId.set(e.id, e)
      }
      const eff = towerEffectiveStats(tower)
      const cap = Math.max(0, Math.floor(eff.slowTargets))
      const r2 = eff.range * eff.range
      const inRange = (e: Enemy): boolean => {
        const ep = this.path.getPointAt(e.pathT)
        return (tower.pos.x - ep.x) ** 2 + (tower.pos.y - ep.y) ** 2 <= r2
      }
      let charmed = this.charmedByTower.get(tower.id)
      if (!charmed) {
        charmed = new Set()
        this.charmedByTower.set(tower.id, charmed)
      }
      // 1. release any charmed foe that died or walked out of range (its slow lifts on its own ≤refreshMs)
      for (const id of [...charmed]) {
        const e = byId.get(id)
        if (!e || !inRange(e)) charmed.delete(id)
      }
      // 2. fill free slots with the lead (furthest-along) in-range foes not already held
      if (charmed.size < cap) {
        const fresh = this.enemies
          .filter((e) => !charmed!.has(e.id) && inRange(e))
          .sort((a, b) => b.pathT - a.pathT)
        for (const e of fresh) {
          if (charmed.size >= cap) break
          charmed.add(e.id)
        }
      }
      // 3. hold the slow on exactly the charmed set (stable → smooth; everyone else stays free)
      for (const id of charmed) {
        const e = byId.get(id)
        if (e) applySlow(e, eff.slowMul, aura.refreshMs)
      }
    }
  }

  // ── Hephaestus spike traps (deployable) ──
  /** Produce/refill a Hephaestus trap at the nearest path point (one trap per tower). */
  private produceSpike(tower: Tower, eff: { damage: number; maxCharges: number }, dep: { hitRadius: number }): void {
    let spike = this.spikes.get(tower.id)
    const dmg = this.run.effectiveDamage(tower.god, eff.damage)
    if (!spike) {
      spike = { pos: this.nearestPathPoint(tower.pos), charges: 0, damage: dmg, hitRadius: dep.hitRadius, hitIds: [] }
      this.spikes.set(tower.id, spike)
    }
    spike.damage = dmg // keep current (boons/upgrades may have changed it)
    spike.charges = Math.min(spike.charges + 1, eff.maxCharges)
    this.drawSpike(tower.id, spike)
  }

  /** Each frame: a charged trap pops every ground enemy that walks over it (once each). */
  private updateSpikes(): void {
    for (const [ownerId, spike] of this.spikes) {
      if (spike.charges <= 0) continue
      // backward over the live array (no slice alloc) — same safety as the projectile loop
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        if (spike.charges <= 0) break
        const e = this.enemies[j]
        if (e.flying || spike.hitIds.includes(e.id)) continue // ground-only, once per enemy
        const ep = this.path.getPointAt(e.pathT)
        const r = spike.hitRadius + damagedRadius(enemyRadius(e), e.hp / e.maxHp)
        if ((spike.pos.x - ep.x) ** 2 + (spike.pos.y - ep.y) ** 2 <= r * r) {
          spike.hitIds.push(e.id)
          spike.charges -= 1
          this.hitEnemy(e, spike.damage)
        }
      }
      this.drawSpike(ownerId, spike)
    }
  }

  /** Closest world point on the path to `pos` (coarse scan; called once per trap). */
  private nearestPathPoint(pos: Vec2): Vec2 {
    let best = this.path.getPointAt(0)
    let bestD = Infinity
    for (let t = 0; t <= 1; t += 0.01) {
      const p = this.path.getPointAt(t)
      const d = (p.x - pos.x) ** 2 + (p.y - pos.y) ** 2
      if (d < bestD) {
        bestD = d
        best = p
      }
    }
    return best
  }

  private drawSpike(ownerId: string, spike: Spike): void {
    let g = this.spikeGfx.get(ownerId)
    if (!g) {
      g = this.add.graphics().setDepth(3)
      this.spikeGfx.set(ownerId, g)
    }
    g.clear()
    if (spike.charges <= 0) return
    const n = Math.min(spike.charges, 8) // a little caltrop pile that grows with charges
    g.lineStyle(2, 0xd6a15a, 0.95)
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2
      const len = spike.hitRadius * 0.8
      g.beginPath()
      g.moveTo(spike.pos.x, spike.pos.y)
      g.lineTo(spike.pos.x + Math.cos(a) * len, spike.pos.y + Math.sin(a) * len)
      g.strokePath()
    }
    g.fillStyle(0x7a4a1e, 0.6)
    g.fillCircle(spike.pos.x, spike.pos.y, 3)
  }

  // ── firing ──
  private fireHitscan(tower: Tower, target: Enemy, damage: number): void {
    const to = this.path.getPointAt(target.pathT)
    if (tower.god === 'hermes') this.drawDart(tower.pos, to)
    else this.drawLightning(tower.pos, to)
    this.hitEnemy(target, damage)
  }

  private fireProjectile(tower: Tower, target: Enemy, damage: number, pierce: number, projectileSpeed: number): void {
    const stats = TOWER_STATS[tower.god]
    const tp = this.path.getPointAt(target.pathT)
    const proj = createProjectile(
      tower.pos,
      { x: tp.x - tower.pos.x, y: tp.y - tower.pos.y },
      projectileSpeed,
      damage,
      pierce,
      stats.canHitAir ?? false,
    )
    this.projectiles.push(proj)
    const sprite = this.add
      .rectangle(proj.pos.x, proj.pos.y, 16, 4, stats.color, 1)
      .setRotation(Math.atan2(proj.vy, proj.vx))
      .setDepth(7)
    this.projSprites.set(proj.id, sprite)
  }

  private updateProjectiles(dtSec: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i]
      advanceProjectile(p, dtSec)
      this.projSprites.get(p.id)?.setPosition(p.pos.x, p.pos.y)
      // collide with enemies — iterate BACKWARD over the live array (no per-frame slice alloc): a hit
      // can only remove the current index or push split-children past the start point, both safe here.
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        if (p.pierceLeft < 0) break
        const e = this.enemies[j]
        if (p.hitIds.includes(e.id)) continue
        if (e.flying && !p.canHitAir) continue // ground-only arrows pass under fliers
        const ep = this.path.getPointAt(e.pathT)
        const hitR = damagedRadius(enemyRadius(e), e.hp / e.maxHp) + 5
        if ((p.pos.x - ep.x) ** 2 + (p.pos.y - ep.y) ** 2 <= hitR * hitR) {
          p.hitIds.push(e.id)
          p.pierceLeft -= 1
          this.hitEnemy(e, p.damage)
        }
      }
      if (projectileDone(p, BOUNDS)) this.removeProjectile(i)
    }
  }

  private removeProjectile(index: number): void {
    const p = this.projectiles[index]
    this.projSprites.get(p.id)?.destroy()
    this.projSprites.delete(p.id)
    this.projectiles.splice(index, 1)
  }

  // ── damage + feedback ──
  private hitEnemy(enemy: Enemy, dmg: number): void {
    const dead = damageEnemy(enemy, dmg)
    const pos = this.path.getPointAt(enemy.pathT)
    if (dead) {
      this.killEnemy(enemy, pos)
      return
    }
    const sprite = this.enemySprites.get(enemy.id)
    if (sprite) {
      const frac = enemy.hp / enemy.maxHp
      sprite.setRadius(damagedRadius(enemyRadius(enemy), frac))
      sprite.setFillStyle(0xffffff) // brief flash
      this.time.delayedCall(70, () => {
        if (sprite.active) sprite.setFillStyle(damagedColor(enemyColor(enemy), frac))
      })
      this.tweens.add({ targets: sprite, scale: 1.15, duration: 55, yoyo: true })
    }
    this.burst(pos.x, pos.y, 4, 0xffffff, 14, 2, 150)
  }

  private killEnemy(enemy: Enemy, at: Vec2): void {
    // Hydra split / Cyclops adds: children MUST enter this.enemies (via spawnEnemy) BEFORE settle()
    // reads .length this frame, or the clear-gate false-triggers between the death and the kids' birth.
    for (const child of onDeath(enemy)) this.spawnEnemy(child)
    const color = enemyColor(enemy)
    const isBoss = enemy.kind === 'boss'
    this.burst(at.x, at.y, isBoss ? 40 : 14, color, isBoss ? 70 : 28, isBoss ? 8 : 3, isBoss ? 520 : 240)
    if (isBoss) this.cameras.main.shake(320, 0.013) // a felled boss rocks the screen
    const poof = this.add.circle(at.x, at.y, isBoss ? 20 : 12, color, 0.7).setDepth(7)
    this.tweens.add({ targets: poof, scale: isBoss ? 4 : 2.4, alpha: 0, duration: isBoss ? 360 : 200, onComplete: () => poof.destroy() })
    this.removeEnemy(enemy)
    this.run.onKill(enemy.bounty, enemy.kind === 'boss')
  }

  /** A cheap particle burst — small circles that fly outward and fade. */
  private burst(x: number, y: number, count: number, color: number, dist: number, size: number, dur: number): void {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2
      const d = dist * (0.5 + Math.random() * 0.5)
      const s = this.add.circle(x, y, size, color, 1).setDepth(7)
      this.tweens.add({
        targets: s,
        x: x + Math.cos(a) * d,
        y: y + Math.sin(a) * d,
        alpha: 0,
        scale: 0.3,
        duration: dur,
        onComplete: () => s.destroy(),
      })
    }
  }

  private drawLightning(from: Vec2, to: Vec2): void {
    const g = this.add.graphics().setDepth(8)
    g.lineStyle(3, 0xbfe3ff, 1)
    g.beginPath()
    g.moveTo(from.x, from.y)
    const segs = 5
    for (let i = 1; i < segs; i++) {
      const t = i / segs
      g.lineTo(
        from.x + (to.x - from.x) * t + (Math.random() - 0.5) * 16,
        from.y + (to.y - from.y) * t + (Math.random() - 0.5) * 16,
      )
    }
    g.lineTo(to.x, to.y)
    g.strokePath()
    this.tweens.add({ targets: g, alpha: 0, duration: 150, onComplete: () => g.destroy() })
  }

  /** Poseidon's tidal slam — damage all GROUND foes in a radius + shove survivors back down the path. */
  private fireSplash(center: Vec2, damage: number, radius: number, knockback: number): void {
    this.drawSplash(center, radius)
    for (let j = this.enemies.length - 1; j >= 0; j--) {
      const e = this.enemies[j]
      if (e.flying) continue // a tidal wave hits the ground, not fliers
      const ep = this.path.getPointAt(e.pathT)
      if ((ep.x - center.x) ** 2 + (ep.y - center.y) ** 2 > radius * radius) continue
      this.hitEnemy(e, damage)
      if (knockback > 0 && e.hp > 0 && !e.knockbackImmune) e.pathT = Math.max(0, e.pathT - knockback) // shove survivors back
    }
  }

  private drawSplash(center: Vec2, radius: number): void {
    const c = this.add
      .circle(center.x, center.y, radius * 0.45, 0x3a8fb5, 0.4)
      .setStrokeStyle(2, 0x9fe0ff, 0.6)
      .setDepth(7)
    this.tweens.add({ targets: c, scale: 2.3, alpha: 0, duration: 280, onComplete: () => c.destroy() })
  }

  /** Hermes' quick dart — a thin straight tracer, distinct from Zeus's jagged bolt. */
  private drawDart(from: Vec2, to: Vec2): void {
    const g = this.add.graphics().setDepth(8)
    g.lineStyle(2, 0xe8e0ff, 0.95)
    g.beginPath()
    g.moveTo(from.x, from.y)
    g.lineTo(to.x, to.y)
    g.strokePath()
    this.tweens.add({ targets: g, alpha: 0, duration: 90, onComplete: () => g.destroy() })
  }

  // ── overlay: range rings, debug target lines, HP rings ──
  private renderOverlay(): void {
    const showDebug = useGameStore.getState().showDebug
    const g = this.overlay
    g.clear()

    for (const tower of this.towers) {
      // Range ring shows ONLY for the selected tower (or every tower in debug) — never always-on,
      // including the support auras (Aphrodite / Athena), which now behave like every other range ring.
      const selected = tower.id === this.selectedTowerId
      const eff = towerEffectiveStats(tower)
      const range = eff.range
      if (selected || showDebug) {
        const slow = TOWER_STATS[tower.god].slowAura
        const buff = TOWER_STATS[tower.god].auraBuff
        if (slow) {
          // Aphrodite's charm field — themed fill so the area reads, but only while selected
          g.fillStyle(0x6fd0e8, 0.1)
          g.fillCircle(tower.pos.x, tower.pos.y, range)
          g.lineStyle(1.5, 0x6fd0e8, selected ? 0.85 : 0.45)
          g.strokeCircle(tower.pos.x, tower.pos.y, range)
        } else if (buff) {
          g.fillStyle(0xd9c879, 0.08)
          g.fillCircle(tower.pos.x, tower.pos.y, range)
          g.lineStyle(1.5, 0xd9c879, selected ? 0.85 : 0.45)
          g.strokeCircle(tower.pos.x, tower.pos.y, range)
        } else {
          g.lineStyle(1.5, selected ? 0xf5d061 : 0x6a7aa8, selected ? 0.85 : 0.5)
          g.strokeCircle(tower.pos.x, tower.pos.y, range)
        }
        // mobile gods: also trace the orbit path so its sweep is legible
        const m = TOWER_STATS[tower.god].mobile
        if (m) {
          g.lineStyle(1, 0xc7b3ff, 0.45)
          g.strokeCircle(tower.center.x, tower.center.y, m.orbitRadius)
        }
      }
      if (showDebug) {
        const target = selectTarget(
          { pos: tower.pos, range, canHitAir: eff.canHitAir },
          this.enemies,
          this.enemyPos,
          tower.targeting,
        )
        if (target) {
          const tp = this.path.getPointAt(target.pathT)
          g.lineStyle(1, 0xf5d061, 0.7)
          g.lineBetween(tower.pos.x, tower.pos.y, tp.x, tp.y)
        }
      }
    }

    // radial HP ring on each damaged enemy (the "shown only while hurt" secondary signal)
    for (const e of this.enemies) {
      if (e.hp >= e.maxHp) continue
      const p = this.path.getPointAt(e.pathT)
      const frac = Math.max(0, e.hp / e.maxHp)
      const r = damagedRadius(enemyRadius(e), frac) + 4
      g.lineStyle(2, 0x000000, 0.4)
      g.strokeCircle(p.x, p.y, r)
      g.lineStyle(2, frac > 0.5 ? 0x6be36b : frac > 0.25 ? 0xe8b04a : 0xd2402f, 0.95)
      g.beginPath()
      g.arc(p.x, p.y, r, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2, false)
      g.strokePath()
    }

    this.renderBossBars(g)
  }

  /** A prominent floating health bar above each live boss (additive to the per-enemy HP ring). */
  private renderBossBars(g: Phaser.GameObjects.Graphics): void {
    for (const e of this.enemies) {
      if (e.kind !== 'boss') continue
      const p = this.path.getPointAt(e.pathT)
      const frac = Math.max(0, Math.min(1, e.hp / e.maxHp))
      const w = enemyRadius(e) * 2 + 24
      const h = 7
      const x = p.x - w / 2
      const y = p.y - enemyRadius(e) - 16
      g.fillStyle(0x000000, 0.55)
      g.fillRect(x - 1, y - 1, w + 2, h + 2)
      g.fillStyle(0x3a1014, 1)
      g.fillRect(x, y, w, h)
      g.fillStyle(frac > 0.5 ? 0xf5d061 : frac > 0.25 ? 0xe8843a : 0xd2402f, 1)
      g.fillRect(x, y, w * frac, h)
    }
  }

  // ── placement ──
  /** Can this god be placed here? Adds water-gating (Poseidon) on top of the pure canPlace. */
  private canPlaceGod(god: GodKind, pos: Vec2): boolean {
    const stats = TOWER_STATS[god]
    const terrain = stats.requiresWater ? 'water' : undefined
    if (!canPlace(pos, stats.footprint, { towers: this.towerFootprints(), terrain }).ok) return false
    if (stats.requiresWater && !this.onWater(pos)) return false
    return true
  }

  private onWater(pos: Vec2): boolean {
    for (const o of OBSTACLES) {
      if (o.terrain !== 'water' || o.shape.kind !== 'circle') continue
      if (Math.hypot(pos.x - o.shape.x, pos.y - o.shape.y) <= o.shape.r) return true
    }
    return false
  }

  private renderGhost(): void {
    const g = this.ghost
    g.clear()
    const placingGod = useGameStore.getState().placingGod
    if (!placingGod) return
    const stats = TOWER_STATS[placingGod]
    const ok = this.canPlaceGod(placingGod, this.pointer) && this.run.canAfford(stats.cost)
    const tint = ok ? 0x6be36b : 0xff5566
    g.fillStyle(tint, 0.45)
    g.fillCircle(this.pointer.x, this.pointer.y, stats.footprint)
    g.lineStyle(1.5, tint, 0.85)
    g.strokeCircle(this.pointer.x, this.pointer.y, stats.range)
  }

  /** Click: place the god being placed, otherwise select/deselect a placed tower. */
  private onPointerDown(p: Phaser.Input.Pointer): void {
    const store = useGameStore.getState()
    const pos = { x: p.worldX, y: p.worldY }
    const placingGod = store.placingGod
    if (placingGod) {
      const stats = TOWER_STATS[placingGod]
      if (!this.canPlaceGod(placingGod, pos)) return // invalid spot: keep placing
      if (!this.run.purchase(stats.cost)) return // too poor: keep placing
      this.placeTower(placingGod, pos)
      store.cancelPlacing()
      return
    }
    this.selectTowerAt(pos)
  }

  private selectTowerAt(pos: Vec2): void {
    let hit: Tower | null = null
    for (const t of this.towers) {
      const stats = TOWER_STATS[t.god]
      // a mobile god is hard to click while moving — select via its fixed HOME BASE at the center
      const c = stats.mobile ? t.center : t.pos
      const r = stats.footprint + 6
      if ((c.x - pos.x) ** 2 + (c.y - pos.y) ** 2 <= r * r) {
        hit = t
        break
      }
    }
    this.selectedTowerId = hit ? hit.id : null
    this.refreshSelected()
  }

  private deselectTower(): void {
    this.selectedTowerId = null
    useGameStore.getState().setSelectedTower(null)
  }

  /** Push the selected tower's upgrade/sell info to the store (after select / upgrade). */
  private refreshSelected(): void {
    const tower = this.selectedTowerId ? this.towers.find((t) => t.id === this.selectedTowerId) : null
    if (!tower) {
      useGameStore.getState().setSelectedTower(null)
      return
    }
    const pathInfo = (path: 'A' | 'B') => {
      const tier = path === 'A' ? tower.pathA : tower.pathB
      const nt = nextTier(tower.god, path, tier)
      return {
        name: UPGRADES[tower.god][path].name,
        tier,
        nextName: nt?.name ?? null,
        nextCost: nt?.cost ?? null,
        nextDesc: nt?.desc ?? null,
        locked: nt !== null && !canUpgradePath(tower, path),
      }
    }
    const stats = TOWER_STATS[tower.god]
    useGameStore.getState().setSelectedTower({
      id: tower.id,
      god: tower.god,
      sellValue: sellValue(tower.god),
      targeting: tower.targeting,
      // only gods that actually acquire a target expose a priority (not farms / auras / spike forges)
      targets: stats.damage > 0 && !stats.deployable,
      pathA: pathInfo('A'),
      pathB: pathInfo('B'),
    })
  }

  private upgradeSelectedTower(path: 'A' | 'B'): void {
    const tower = this.selectedTowerId ? this.towers.find((t) => t.id === this.selectedTowerId) : null
    if (!tower || !canUpgradePath(tower, path)) return
    const nt = nextTier(tower.god, path, path === 'A' ? tower.pathA : tower.pathB)
    if (!nt || !this.run.purchase(nt.cost)) return
    if (path === 'A') tower.pathA++
    else tower.pathB++
    this.refreshSelected()
  }

  /** Set the selected tower's target priority (First / Last / Closest / Strongest). */
  private setSelectedTargeting(mode: TargetingMode): void {
    const tower = this.selectedTowerId ? this.towers.find((t) => t.id === this.selectedTowerId) : null
    if (!tower) return
    tower.targeting = mode
    this.refreshSelected()
  }

  /** Sell the selected tower: refund part of its cost and remove it. */
  private sellSelectedTower(): void {
    const id = this.selectedTowerId
    if (!id) return
    const idx = this.towers.findIndex((t) => t.id === id)
    if (idx < 0) return
    const t = this.towers[idx]
    this.run.grantGold(sellValue(t.god))
    this.towerSprites.get(id)?.destroy()
    this.towerSprites.delete(id)
    this.homeBaseGfx.get(id)?.destroy() // remove a mobile god's home base with it
    this.homeBaseGfx.delete(id)
    this.charmedByTower.delete(id) // drop an Aphrodite's charm set
    this.spikes.delete(id) // remove a Hephaestus trap with its forge
    this.spikeGfx.get(id)?.destroy()
    this.spikeGfx.delete(id)
    this.towers.splice(idx, 1)
    this.deselectTower()
  }

  /** Demeter farms pay out gold when a wave clears (with a floating gold number). */
  private payDemeterIncome(): void {
    for (const t of this.towers) {
      if (t.god !== 'demeter') continue
      const income = demeterIncome(t, this.run.wave)
      if (income <= 0) continue
      this.run.grantGold(income)
      const txt = this.add
        .text(t.pos.x, t.pos.y - 20, `+${income}`, { fontFamily: 'Georgia, serif', fontSize: '15px', color: '#ffe066', fontStyle: 'bold' })
        .setOrigin(0.5)
        .setDepth(9)
      this.tweens.add({ targets: txt, y: t.pos.y - 48, alpha: 0, duration: 1000, onComplete: () => txt.destroy() })
    }
  }

  /** The standard god badge — a colored disc with the god's initial. */
  private makeBadge(god: GodKind, radius = 16): Phaser.GameObjects.Container {
    const stats = TOWER_STATS[god]
    const circle = this.add.circle(0, 0, radius, stats.color, 1).setStrokeStyle(2, 0xffffff)
    const label = this.add
      .text(0, 0, stats.name[0], {
        fontFamily: 'Georgia, serif',
        fontSize: `${Math.round(radius * 1.1)}px`,
        fontStyle: 'bold',
        color: '#1a1407',
      })
      .setOrigin(0.5)
    return this.add.container(0, 0, [circle, label])
  }

  private placeTower(god: GodKind, pos: Vec2): void {
    const tower = createTower(god, pos)
    this.towers.push(tower)
    this.run.onTowerBuilt()
    const stats = TOWER_STATS[god]
    if (stats.mobile) {
      // Mobile god: a fixed HOME BASE badge at the center (identity + click target), and a small
      // marker that actually orbits/strikes. Clicking the base manages a god that won't sit still.
      const base = this.makeBadge(god).setPosition(tower.center.x, tower.center.y).setDepth(5)
      this.homeBaseGfx.set(tower.id, base)
      const flier = this.add
        .container(pos.x, pos.y, [this.add.circle(0, 0, 7, stats.color, 1).setStrokeStyle(2, 0xffffff)])
        .setDepth(6)
      this.towerSprites.set(tower.id, flier)
      return
    }
    const container = this.makeBadge(god).setPosition(pos.x, pos.y).setDepth(6)
    this.towerSprites.set(tower.id, container)
  }
}
