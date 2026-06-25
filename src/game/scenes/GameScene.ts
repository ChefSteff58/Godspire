import Phaser from 'phaser'
import { useGameStore } from '../../state/gameStore'
import { PathSystem, OLYMPUS_PATH } from '../../core/map/path'
import { createEnemy, advanceEnemy, type Enemy } from '../../core/entities/enemy'
import { GAME_WIDTH, GAME_HEIGHT } from '../config'

const MAX_DELTA_MS = 50 // clamp tab-switch spikes so nothing teleports past defenses
const SPAWN_INTERVAL_MS = 2200

/**
 * GameScene owns the game loop. M1: render the Underworld→Olympus map and march a trickle of
 * placeholder enemies up the path. Game LOGIC (path geometry, enemy advance) lives in src/core;
 * this scene only renders it and drives the clock.
 */
export class GameScene extends Phaser.Scene {
  private readonly path = new PathSystem(OLYMPUS_PATH)
  private enemies: Enemy[] = []
  private readonly sprites = new Map<string, Phaser.GameObjects.Arc>()
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
    // reset ALL per-run state on (re)create so a restart starts clean (create() is the
    // single source of truth for run state, not the field initializers)
    this.enemies = []
    this.sprites.clear()
    this.spawnAccumMs = 0
    this.elapsedAccumMs = 0
    this.elapsedSec = 0
    useGameStore.getState().setElapsed(0)

    // Dev handle for debugging / manual stepping (stripped from production builds).
    if (import.meta.env.DEV) {
      ;(window as unknown as Record<string, unknown>).godspireScene = this
    }
  }

  /** Manually advance the simulation by `frames` of `dtMs` each — dev/test helper only. */
  devStep(frames: number, dtMs = 16): void {
    for (let i = 0; i < frames; i++) this.update(0, dtMs)
  }

  /**
   * Read-only access to the live enemies (M2 tower targeting reads this).
   * Resolve an enemy's world position on demand via `getEnemyPosition`.
   */
  getEnemies(): readonly Enemy[] {
    return this.enemies
  }

  getEnemyPosition(enemy: Enemy): { x: number; y: number } {
    return this.path.getPointAt(enemy.pathT)
  }

  private drawBackground(): void {
    const g = this.add.graphics()
    // night-sky dark at the top (Olympus) bleeding into ember red at the bottom (Tartarus)
    g.fillGradientStyle(0x0b0e17, 0x0b0e17, 0x300f16, 0x40121b, 1)
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
  }

  private drawPath(): void {
    const g = this.add.graphics()
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

    this.add.circle(start.x, start.y, 26, 0x6a1020, 0.9).setStrokeStyle(2, 0xc0394a)
    this.add
      .text(start.x, start.y + 40, 'Tartarus', {
        fontFamily: 'Georgia, serif',
        fontSize: '13px',
        color: '#e08a98',
      })
      .setOrigin(0.5)

    this.add.rectangle(end.x, end.y + 8, 96, 28, 0xf5d061, 0.95)
    this.add
      .text(end.x, end.y + 8, 'OLYMPUS', {
        fontFamily: 'Georgia, serif',
        fontSize: '13px',
        color: '#1a1407',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
  }

  update(_time: number, delta: number): void {
    const dt = Math.min(delta, MAX_DELTA_MS)

    // HUD "seal held" timer (Phaser → React mirror)
    this.elapsedAccumMs += dt
    if (this.elapsedAccumMs >= 1000) {
      this.elapsedAccumMs -= 1000
      this.elapsedSec += 1
      useGameStore.getState().setElapsed(this.elapsedSec)
    }

    // spawn a trickle of enemies
    this.spawnAccumMs += dt
    if (this.spawnAccumMs >= SPAWN_INTERVAL_MS) {
      this.spawnAccumMs -= SPAWN_INTERVAL_MS
      this.spawnEnemy()
    }

    // advance enemies along the path; sync sprites; remove on leak
    const dtSec = dt / 1000
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i]
      const leaked = advanceEnemy(enemy, dtSec, this.path.length)
      if (leaked) {
        this.removeEnemy(i) // skip positioning a sprite that's about to be destroyed
        continue
      }
      const pos = this.path.getPointAt(enemy.pathT)
      this.sprites.get(enemy.id)?.setPosition(pos.x, pos.y)
    }
  }

  private spawnEnemy(): void {
    const enemy = createEnemy('shade')
    this.enemies.push(enemy)
    const pos = this.path.getPointAt(0)
    const sprite = this.add.circle(pos.x, pos.y, 9, 0x9d6bd6, 1).setStrokeStyle(2, 0xc9a8ee)
    this.sprites.set(enemy.id, sprite)
  }

  private removeEnemy(index: number): void {
    const enemy = this.enemies[index]
    this.sprites.get(enemy.id)?.destroy()
    this.sprites.delete(enemy.id)
    this.enemies.splice(index, 1)
  }
}
