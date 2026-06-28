import Phaser from 'phaser'
import { useGameStore } from '../../state/gameStore'
import { PathSystem, OLYMPUS_PATH } from '../../core/map/path'
import { OBSTACLES } from '../../core/map/obstacles'
import { canPlace } from '../../core/map/placement'
import {
  createEnemy,
  advanceEnemy,
  damageEnemy,
  ENEMY_BASE_COLOR,
  ENEMY_BASE_RADIUS,
  damagedColor,
  damagedRadius,
  type Enemy,
} from '../../core/entities/enemy'
import { createTower, type Tower } from '../../core/entities/tower'
import {
  createProjectile,
  advanceProjectile,
  projectileDone,
  type Projectile,
} from '../../core/entities/projectile'
import { selectTarget } from '../../core/systems/targeting'
import { TOWER_STATS, type GodKind } from '../../core/data/towers'
import type { Vec2 } from '../../core/types'
import { GAME_WIDTH, GAME_HEIGHT } from '../dimensions'

const MAX_DELTA_MS = 50
const SPAWN_INTERVAL_MS = 2200
const BOUNDS = { w: GAME_WIDTH, h: GAME_HEIGHT }

/**
 * GameScene owns the game loop. M2.5: flat top-down map with dead zones, fast-forward (timeScale),
 * Zeus hitscan + Apollo piercing projectiles, and hit/HP "juice." Logic lives in src/core; this
 * scene renders it, drives the (scaled) clock, and handles placement input.
 */
export class GameScene extends Phaser.Scene {
  private readonly path = new PathSystem(OLYMPUS_PATH)
  private enemies: Enemy[] = []
  private readonly enemySprites = new Map<string, Phaser.GameObjects.Arc>()
  private towers: Tower[] = []
  private readonly towerSprites = new Map<string, Phaser.GameObjects.Container>()
  private projectiles: Projectile[] = []
  private readonly projSprites = new Map<string, Phaser.GameObjects.Rectangle>()
  private overlay!: Phaser.GameObjects.Graphics
  private ghost!: Phaser.GameObjects.Graphics
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
    this.drawObstacles()
    this.drawMarkers()
    this.overlay = this.add.graphics().setDepth(3)
    this.ghost = this.add.graphics().setDepth(10)

    this.enemies = []
    this.enemySprites.clear()
    this.towers = []
    this.towerSprites.clear()
    this.projectiles = []
    this.projSprites.clear()
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
    return this.towers.map((t) => ({ pos: t.pos, footprint: TOWER_STATS[t.god].footprint }))
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

  private drawObstacles(): void {
    const g = this.add.graphics().setDepth(2)
    for (const o of OBSTACLES) {
      g.fillStyle(o.color, o.terrain === 'water' ? 0.7 : 0.92)
      g.lineStyle(2, 0x000000, 0.3)
      if (o.shape.kind === 'circle') {
        g.fillCircle(o.shape.x, o.shape.y, o.shape.r)
        g.strokeCircle(o.shape.x, o.shape.y, o.shape.r)
      } else {
        g.fillRoundedRect(o.shape.x, o.shape.y, o.shape.w, o.shape.h, 6)
        g.strokeRoundedRect(o.shape.x, o.shape.y, o.shape.w, o.shape.h, 6)
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
    const scale = useGameStore.getState().timeScale
    const dt = Math.min(delta, MAX_DELTA_MS) * scale

    if (dt > 0) {
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

      // advance enemies; sync sprites; remove on leak
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
        const target = selectTarget(tower, this.enemies, this.enemyPos, tower.targeting)
        if (!target) continue
        tower.cooldown = 1 / tower.fireRate
        const stats = TOWER_STATS[tower.god]
        if (stats.attack === 'hitscan') this.fireHitscan(tower, target)
        else this.fireProjectile(tower, target)
      }

      this.updateProjectiles(dtSec)
    }

    this.renderOverlay()
    this.renderGhost()
  }

  private spawnEnemy(): void {
    const enemy = createEnemy('shade')
    this.enemies.push(enemy)
    const pos = this.path.getPointAt(0)
    const sprite = this.add
      .circle(pos.x, pos.y, ENEMY_BASE_RADIUS, ENEMY_BASE_COLOR[enemy.kind], 1)
      .setStrokeStyle(2, 0xc9a8ee)
      .setDepth(4)
    this.enemySprites.set(enemy.id, sprite)
  }

  private removeEnemy(enemy: Enemy): void {
    this.enemySprites.get(enemy.id)?.destroy()
    this.enemySprites.delete(enemy.id)
    const idx = this.enemies.indexOf(enemy)
    if (idx >= 0) this.enemies.splice(idx, 1)
  }

  // ── firing ──
  private fireHitscan(tower: Tower, target: Enemy): void {
    this.drawLightning(tower.pos, this.path.getPointAt(target.pathT))
    this.hitEnemy(target, tower.damage)
  }

  private fireProjectile(tower: Tower, target: Enemy): void {
    const stats = TOWER_STATS[tower.god]
    const tp = this.path.getPointAt(target.pathT)
    const proj = createProjectile(
      tower.pos,
      { x: tp.x - tower.pos.x, y: tp.y - tower.pos.y },
      stats.projectileSpeed ?? 500,
      tower.damage,
      stats.pierce ?? 0,
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
      // collide with enemies (snapshot so kills don't disrupt iteration)
      for (const e of this.enemies.slice()) {
        if (p.pierceLeft < 0) break
        if (p.hitIds.includes(e.id)) continue
        const ep = this.path.getPointAt(e.pathT)
        const hitR = damagedRadius(ENEMY_BASE_RADIUS, e.hp / e.maxHp) + 5
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
      sprite.setRadius(damagedRadius(ENEMY_BASE_RADIUS, frac))
      sprite.setFillStyle(0xffffff) // brief flash
      this.time.delayedCall(70, () => {
        if (sprite.active) sprite.setFillStyle(damagedColor(ENEMY_BASE_COLOR[enemy.kind], frac))
      })
      this.tweens.add({ targets: sprite, scale: 1.15, duration: 55, yoyo: true })
    }
    this.burst(pos.x, pos.y, 4, 0xffffff, 14, 2, 150)
  }

  private killEnemy(enemy: Enemy, at: Vec2): void {
    const color = ENEMY_BASE_COLOR[enemy.kind]
    this.burst(at.x, at.y, 14, color, 28, 3, 240)
    const poof = this.add.circle(at.x, at.y, 12, color, 0.7).setDepth(7)
    this.tweens.add({ targets: poof, scale: 2.4, alpha: 0, duration: 200, onComplete: () => poof.destroy() })
    this.removeEnemy(enemy)
    useGameStore.getState().addKill()
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

  // ── overlay: range rings, debug target lines, HP rings ──
  private renderOverlay(): void {
    const showDebug = useGameStore.getState().showDebug
    const g = this.overlay
    g.clear()

    for (const tower of this.towers) {
      g.lineStyle(1, 0x6a7aa8, showDebug ? 0.55 : 0.16)
      g.strokeCircle(tower.pos.x, tower.pos.y, tower.range)
      if (showDebug) {
        const target = selectTarget(tower, this.enemies, this.enemyPos, tower.targeting)
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
      const r = damagedRadius(ENEMY_BASE_RADIUS, frac) + 4
      g.lineStyle(2, 0x000000, 0.4)
      g.strokeCircle(p.x, p.y, r)
      g.lineStyle(2, frac > 0.5 ? 0x6be36b : frac > 0.25 ? 0xe8b04a : 0xd2402f, 0.95)
      g.beginPath()
      g.arc(p.x, p.y, r, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2, false)
      g.strokePath()
    }
  }

  // ── placement ──
  private renderGhost(): void {
    const g = this.ghost
    g.clear()
    const placingGod = useGameStore.getState().placingGod
    if (!placingGod) return
    const stats = TOWER_STATS[placingGod]
    const ok = canPlace(this.pointer, stats.footprint, { towers: this.towerFootprints() }).ok
    const tint = ok ? 0x6be36b : 0xff5566
    g.fillStyle(tint, 0.45)
    g.fillCircle(this.pointer.x, this.pointer.y, stats.footprint)
    g.lineStyle(1.5, tint, 0.85)
    g.strokeCircle(this.pointer.x, this.pointer.y, stats.range)
  }

  private onPointerDown(p: Phaser.Input.Pointer): void {
    const store = useGameStore.getState()
    const placingGod = store.placingGod
    if (!placingGod) return
    const pos = { x: p.worldX, y: p.worldY }
    const stats = TOWER_STATS[placingGod]
    if (!canPlace(pos, stats.footprint, { towers: this.towerFootprints() }).ok) return
    this.placeTower(placingGod, pos)
    store.cancelPlacing()
  }

  private placeTower(god: GodKind, pos: Vec2): void {
    const tower = createTower(god, pos)
    this.towers.push(tower)
    const stats = TOWER_STATS[god]
    const circle = this.add.circle(0, 0, 16, stats.color, 1).setStrokeStyle(2, 0xffffff)
    const label = this.add
      .text(0, 0, stats.name[0], {
        fontFamily: 'Georgia, serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#1a1407',
      })
      .setOrigin(0.5)
    const container = this.add.container(pos.x, pos.y, [circle, label]).setDepth(6)
    this.towerSprites.set(tower.id, container)
  }
}
