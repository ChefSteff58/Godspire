import Phaser from 'phaser'
import { useGameStore } from '../../state/gameStore'

/**
 * GameScene owns the game loop. For Milestone 0 it renders a title screen and
 * demonstrates the Phaser<->React bridge in both directions:
 *  - every second it pushes an "elapsed" tick into the store (Phaser -> React),
 *  - each frame it drains queued commands and reacts to them (React -> Phaser).
 *
 * In Milestone 1 this gains the map + a walking enemy; the bridge pattern stays.
 */
export class GameScene extends Phaser.Scene {
  private accumMs = 0
  private elapsedSec = 0
  private spire?: Phaser.GameObjects.Arc

  constructor() {
    super('Game')
  }

  create(): void {
    const cx = this.scale.width / 2
    const cy = this.scale.height / 2

    this.add
      .text(cx, cy - 70, 'GODSPIRE', {
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: '68px',
        color: '#f5d061',
      })
      .setOrigin(0.5)

    this.add
      .text(cx, cy - 6, 'Defend Olympus', {
        fontFamily: 'Georgia, serif',
        fontSize: '22px',
        color: '#9aa4bf',
      })
      .setOrigin(0.5)

    this.add
      .text(cx, cy + 26, 'the seal holds…', {
        fontFamily: 'Georgia, serif',
        fontSize: '14px',
        color: '#5b6480',
      })
      .setOrigin(0.5)

    // A pulsing glow — proves rendering + tween animation are alive.
    this.spire = this.add.circle(cx, cy + 120, 10, 0xf5d061, 1)
    this.tweens.add({
      targets: this.spire,
      scale: 1.8,
      alpha: 0.4,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    })
  }

  update(_time: number, delta: number): void {
    const store = useGameStore.getState()

    // Phaser -> React: tick the "seal held" counter once per second.
    this.accumMs += delta
    if (this.accumMs >= 1000) {
      this.accumMs -= 1000
      this.elapsedSec += 1
      store.setElapsed(this.elapsedSec)
    }

    // React -> Phaser: apply any queued player commands.
    for (const cmd of store.drainCommands()) {
      if (cmd.type === 'pulse') {
        this.cameras.main.flash(250, 245, 208, 97)
        if (this.spire) {
          this.tweens.add({ targets: this.spire, scale: 3, duration: 120, yoyo: true })
        }
        store.registerPulse()
      }
    }
  }
}
