import Phaser from 'phaser'
import { AVAILABLE_SPRITES } from '../assets/manifest'
import { useSessionStore } from '../../state/sessionStore'
import { GAME_WIDTH, GAME_HEIGHT } from '../dimensions'

/**
 * Loads whatever art currently exists (per the manifest's glob), then hands off to GameScene. Because
 * only discovered files are queued, there are no 404s and an empty drop-zone simply loads nothing — the
 * game then renders its placeholder shapes. As PNGs land in src/game/assets/sprites/, they appear here
 * automatically; GameScene checks `this.textures.exists(key)` per render site and swaps shape → sprite.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload')
  }

  preload(): void {
    for (const [key, url] of Object.entries(AVAILABLE_SPRITES)) {
      this.load.image(key, url)
    }
  }

  create(): void {
    // Wait for the session boot (cloud progress merge) before starting the run — GameScene.create
    // reads getModifiers() ONCE at run start, so starting mid-boot would silently drop every Pantheon
    // bonus on a fresh device. Offline / unconfigured resolves to 'offline' quickly, so this only
    // ever waits on a real cloud round-trip.
    if (useSessionStore.getState().status !== 'booting') {
      this.scene.start('Game')
      return
    }
    const splash = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Consulting the Fates…', {
        fontFamily: 'Georgia, serif',
        fontSize: '18px',
        color: '#d9c879',
      })
      .setOrigin(0.5)
    this.tweens.add({ targets: splash, alpha: 0.4, duration: 600, yoyo: true, repeat: -1 })
    let started = false
    const begin = (): void => {
      if (started) return
      started = true
      unsub()
      this.scene.start('Game')
    }
    const unsub = useSessionStore.subscribe((s) => {
      if (s.status !== 'booting') begin()
    })
    // HARD CAP: a slow/hanging cloud round-trip must never hold the game hostage — after 6s start
    // anyway (worst case this run plays on base modifiers, which beats an infinite splash).
    this.time.delayedCall(6000, begin)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, unsub) // never leak the subscription
  }
}
