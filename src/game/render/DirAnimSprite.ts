import Phaser from 'phaser'
import { dirKey, frameKey, type Dir8 } from './facing'

const FRAME_MS = 110 // ~9 fps — reads as a lively pixel walk/cast without strobing

/**
 * A Phaser Sprite that renders a pixel creature with **8-direction facing** + simple **frame
 * animations**, driven by texture-name convention (all auto-discovered by the manifest glob):
 *   - static rotation:   `<base>_<dir>`           e.g. `zeus_south`
 *   - animation frame:    `<base>_<anim>_<dir>_<f>` e.g. `skeleton_walk_south_2`
 *
 * Resolution falls back gracefully: animation frame → static rotation → single `<base>` texture, so a
 * creature with only partial art still renders. Scale is fixed once (frames share a bounding box), so
 * GameScene's own bob / lunge / hit tweens on `.sprite` are never fought by texture swaps.
 */
export class DirAnimSprite {
  readonly sprite: Phaser.GameObjects.Sprite
  private readonly scene: Phaser.Scene
  private readonly base: string
  private dir: Dir8 = 'south'
  private anim = 'idle'
  private frame = 0
  private timerMs = 0
  private readonly counts = new Map<string, number>() // `${anim}_${dir}` → frame count (probed once)

  constructor(scene: Phaser.Scene, base: string, x: number, y: number, displayPx: number, depth = 6) {
    this.scene = scene
    this.base = base
    const start = scene.textures.exists(dirKey(base, 'south')) ? dirKey(base, 'south') : base
    this.sprite = scene.add.sprite(x, y, start).setDepth(depth)
    this.sprite.setScale(displayPx / Math.max(this.sprite.width, this.sprite.height))
    this.apply()
  }

  /** True when 8-direction rotation art exists for this creature (else GameScene should use a fallback). */
  static hasDirectional(scene: Phaser.Scene, base: string): boolean {
    return scene.textures.exists(dirKey(base, 'south'))
  }

  setFacing(dir: Dir8): void {
    if (dir !== this.dir) {
      this.dir = dir
      this.frame = 0
      this.apply()
    }
  }

  play(anim: string): void {
    if (anim !== this.anim) {
      this.anim = anim
      this.frame = 0
      this.timerMs = 0
      this.apply()
    }
  }

  setPosition(x: number, y: number): void {
    this.sprite.setPosition(x, y)
  }

  destroy(): void {
    this.sprite.destroy()
  }

  /** Advance the current animation; no-op for static rotations / single-frame poses. */
  update(dtMs: number): void {
    const n = this.frameCount(this.anim, this.dir)
    if (n <= 1) return
    this.timerMs += dtMs
    while (this.timerMs >= FRAME_MS) {
      this.timerMs -= FRAME_MS
      this.frame = (this.frame + 1) % n
    }
    this.apply()
  }

  private frameCount(anim: string, dir: Dir8): number {
    const k = `${anim}_${dir}`
    let n = this.counts.get(k)
    if (n === undefined) {
      n = 0
      while (this.scene.textures.exists(frameKey(this.base, anim, dir, n))) n++
      this.counts.set(k, n)
    }
    return n
  }

  private apply(): void {
    const n = this.frameCount(this.anim, this.dir)
    let key: string
    if (n > 0) key = frameKey(this.base, this.anim, this.dir, this.frame % n)
    else if (this.scene.textures.exists(dirKey(this.base, this.dir))) key = dirKey(this.base, this.dir)
    else key = this.base
    if (this.sprite.texture.key !== key && this.scene.textures.exists(key)) this.sprite.setTexture(key)
  }
}
