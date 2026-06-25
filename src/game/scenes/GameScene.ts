import Phaser from 'phaser'
import { useGameStore } from '../../state/gameStore'
import { PathSystem, OLYMPUS_PATH } from '../../core/map/path'
import { createEnemy, advanceEnemy, damageEnemy, type Enemy } from '../../core/entities/enemy'
import { createTower, type Tower } from '../../core/entities/tower'
import { selectTarget } from '../../core/systems/targeting'
import { TOWER_STATS, type GodKind } from '../../core/data/towers'
import type { Vec2 } from '../../core/types'
import { GAME_WIDTH, GAME_HEIGHT } from '../config'

const MAX_DELTA_MS = 50 // clamp tab-switch spikes so nothing teleports
const SPAWN_INTERVAL_MS = 2200
const MIN_TOWER_GAP = 30

/**
 * GameScene owns the game loop. M2 — THE CORE LOOP: place gods, auto-target the lead enemy in
 * range, fire a hitscan bolt, deal damage, kill. Game LOGIC (path, targeting, damage) lives in
 * src/core; this scene renders it, drives the clock, and handles placement input.
 */
export class GameScene extends Phaser.Scene {
  private readonly path = new PathSystem(OLYMPUS_PATH)
  private enemies: Enemy[] = []
  private readonly enemySprites = new Map<string, Phaser.GameObjects.Arc>()
  private towers: Tower[] = []
  private readonly towerSprites = new Map<string, Phaser.GameObjects.Container>()
  private overlay!: Phaser.GameObjects.Graphics // range rings + debug, redrawn each frame
  private ghost!: Phaser.GameObjects.Graphics // placement preview
  private pointer: Vec2 = { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 }
  private spawnAccumMs = 0
  private elapsedAccumMs = 0
  private elapsedSec = 0

  constructor() {
    super('Game')
  }

  create(): void {
    this.drawBackground()
    this.drawPath()
    this.drawEndpoints()
    this.overlay = this.add.graphics().setDepth(3)
    this.ghost = this.add.graphics().setDepth(10)

    // reset ALL per-run state on (re)create — create() is the single source of run state
    this.enemies = []
    this.enemySprites.clear()
    this.towers = []
    this.towerSprites.clear()
    this.spawnAccumMs = 0
    this.elapsedAccumMs = 0
    this.elapsedSec = 0
    useGameStore.getState().setElapsed(0)

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      this.pointer = { x: p.worldX, y: p.worldY }
    })
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onPointerDown(p))
    this.input.keyboard?.on('keydown-ESC', () => useGameStore.getState().cancelPlacing())

    if (import.meta.env.DEV) {
      ;(window as unknown as Record<string, unknown>).godspireScene = this
    }
  }

  /** Manually advance the simulation — dev/test helper (the headless preview throttles RAF). */
  devStep(frames: number, dtMs = 16): void {
    for (let i = 0; i < frames; i++) this.update(0, dtMs)
  }

  getEnemies(): readonly Enemy[] {
    return this.enemies
  }
  getTowers(): readonly Tower[] {
    return this.towers
  }
  getEnemyPosition(enemy: Enemy): Vec2 {
    return this.path.getPointAt(enemy.pathT)
  }

  // ── static map ──
  private drawBackground(): void {
    const g = this.add.graphics().setDepth(0)
    g.fillGradientStyle(0x0b0e17, 0x0b0e17, 0x300f16, 0x40121b, 1)
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
  }

  private drawPath(): void {
    const g = this.add.graphics().setDepth(1)
    g.lineStyle(34, 0x171c2b, 1)
    this.strokePolyline(g)
    g.lineStyle(20, 0x2b3550, 1)
    this.strokePolyline(g)
  }

  private strokePolyline(g: Phaser.GameObjects.Graphics): void {
    g.beginPath()
    g.moveTo(OLYMPUS_PATH[0].x, OLYMPUS_PATH[0].y)
    for (let i = 1; i < OLYMPUS_PATH.length; i++) g.lineTo(OLYMPUS_PATH[i].x, OLYMPUS_PATH[i].y)
    g.strokePath()
  }

  private drawEndpoints(): void {
    const start = OLYMPUS_PATH[0]
    const end = OLYMPUS_PATH[OLYMPUS_PATH.length - 1]
    this.add.circle(start.x, start.y, 26, 0x6a1020, 0.9).setStrokeStyle(2, 0xc0394a).setDepth(2)
    this.add
      .text(start.x, start.y + 40, 'Tartarus', { fontFamily: 'Georgia, serif', fontSize: '13px', color: '#e08a98' })
      .setOrigin(0.5)
      .setDepth(2)
    this.add.rectangle(end.x, end.y + 8, 96, 28, 0xf5d061, 0.95).setDepth(2)
    this.add
      .text(end.x, end.y + 8, 'OLYMPUS', {
        fontFamily: 'Georgia, serif',
        fontSize: '13px',
        color: '#1a1407',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(2)
  }

  update(_time: number, delta: number): void {
    const dt = Math.min(delta, MAX_DELTA_MS)
    const dtSec = dt / 1000

    this.elapsedAccumMs += dt
    if (this.elapsedAccumMs >= 1000) {
      this.elapsedAccumMs -= 1000
      this.elapsedSec += 1
      useGameStore.getState().setElapsed(this.elapsedSec)
    }

    this.spawnAccumMs += dt
    if (this.spawnAccumMs >= SPAWN_INTERVAL_MS) {
      this.spawnAccumMs -= SPAWN_INTERVAL_MS
      this.spawnEnemy()
    }

    // advance enemies along the path; sync sprites; remove on leak
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i]
      const leaked = advanceEnemy(enemy, dtSec, this.path.length)
      if (leaked) {
        this.removeEnemy(enemy)
        continue
      }
      const pos = this.path.getPointAt(enemy.pathT)
      this.enemySprites.get(enemy.id)?.setPosition(pos.x, pos.y)
    }

    // towers acquire + fire
    for (const tower of this.towers) {
      tower.cooldown -= dtSec
      if (tower.cooldown > 0) continue
      const target = selectTarget(
        tower,
        this.enemies,
        (e) => this.path.getPointAt(e.pathT),
        tower.targeting,
      )
      if (!target) continue
      tower.cooldown = 1 / tower.fireRate
      this.fireBolt(tower, target)
    }

    this.renderOverlay()
    this.renderGhost()
  }

  private spawnEnemy(): void {
    const enemy = createEnemy('shade')
    this.enemies.push(enemy)
    const pos = this.path.getPointAt(0)
    const sprite = this.add.circle(pos.x, pos.y, 9, 0x9d6bd6, 1).setStrokeStyle(2, 0xc9a8ee).setDepth(4)
    this.enemySprites.set(enemy.id, sprite)
  }

  private removeEnemy(enemy: Enemy): void {
    this.enemySprites.get(enemy.id)?.destroy()
    this.enemySprites.delete(enemy.id)
    const idx = this.enemies.indexOf(enemy)
    if (idx >= 0) this.enemies.splice(idx, 1)
  }

  private fireBolt(tower: Tower, target: Enemy): void {
    const tp = this.path.getPointAt(target.pathT)
    this.drawLightning(tower.pos, tp)
    const dead = damageEnemy(target, tower.damage)
    const sprite = this.enemySprites.get(target.id)
    if (sprite) this.tweens.add({ targets: sprite, scale: 1.6, duration: 60, yoyo: true })
    if (dead) this.killEnemy(target, tp)
  }

  private killEnemy(enemy: Enemy, at: Vec2): void {
    const poof = this.add.circle(at.x, at.y, 10, 0x9d6bd6, 0.85).setDepth(5)
    this.tweens.add({ targets: poof, scale: 2.6, alpha: 0, duration: 220, onComplete: () => poof.destroy() })
    this.removeEnemy(enemy)
    useGameStore.getState().addKill()
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

  private renderOverlay(): void {
    const showDebug = useGameStore.getState().showDebug
    const g = this.overlay
    g.clear()
    for (const tower of this.towers) {
      g.lineStyle(1, 0x6a7aa8, showDebug ? 0.55 : 0.18)
      g.strokeCircle(tower.pos.x, tower.pos.y, tower.range)
      if (showDebug) {
        const target = selectTarget(
          tower,
          this.enemies,
          (e) => this.path.getPointAt(e.pathT),
          tower.targeting,
        )
        if (target) {
          const tp = this.path.getPointAt(target.pathT)
          g.lineStyle(1, 0xf5d061, 0.7)
          g.lineBetween(tower.pos.x, tower.pos.y, tp.x, tp.y)
        }
      }
    }
    if (showDebug) {
      for (const e of this.enemies) {
        const p = this.path.getPointAt(e.pathT)
        const frac = Math.max(0, e.hp / e.maxHp)
        g.fillStyle(0x000000, 0.55)
        g.fillRect(p.x - 9, p.y - 16, 18, 3)
        g.fillStyle(0x6be36b, 0.95)
        g.fillRect(p.x - 9, p.y - 16, 18 * frac, 3)
      }
    }
  }

  private renderGhost(): void {
    const g = this.ghost
    g.clear()
    const placingGod = useGameStore.getState().placingGod
    if (!placingGod) return
    const stats = TOWER_STATS[placingGod]
    const ok = this.canPlaceAt(this.pointer)
    g.fillStyle(stats.color, 0.5)
    g.fillCircle(this.pointer.x, this.pointer.y, 14)
    g.lineStyle(1.5, ok ? 0x6be36b : 0xff5566, 0.85)
    g.strokeCircle(this.pointer.x, this.pointer.y, stats.range)
  }

  private onPointerDown(p: Phaser.Input.Pointer): void {
    const store = useGameStore.getState()
    const placingGod = store.placingGod
    if (!placingGod) return
    const pos = { x: p.worldX, y: p.worldY }
    if (!this.canPlaceAt(pos)) return
    this.placeTower(placingGod, pos)
    store.cancelPlacing()
  }

  private canPlaceAt(pos: Vec2): boolean {
    if (pos.x < 14 || pos.x > GAME_WIDTH - 14 || pos.y < 14 || pos.y > GAME_HEIGHT - 14) return false
    for (const t of this.towers) {
      const dx = t.pos.x - pos.x
      const dy = t.pos.y - pos.y
      if (dx * dx + dy * dy < MIN_TOWER_GAP * MIN_TOWER_GAP) return false
    }
    return true
  }

  private placeTower(god: GodKind, pos: Vec2): void {
    const tower = createTower(god, pos)
    this.towers.push(tower)
    const stats = TOWER_STATS[god]
    const circle = this.add.circle(0, 0, 16, stats.color, 1).setStrokeStyle(2, 0xffffff)
    const label = this.add
      .text(0, 0, 'Z', { fontFamily: 'Georgia, serif', fontSize: '18px', fontStyle: 'bold', color: '#1a1407' })
      .setOrigin(0.5)
    const container = this.add.container(pos.x, pos.y, [circle, label]).setDepth(6)
    this.towerSprites.set(tower.id, container)
  }
}
