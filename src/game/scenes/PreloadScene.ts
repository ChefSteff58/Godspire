import Phaser from 'phaser'
import { AVAILABLE_SPRITES } from '../assets/manifest'

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
    this.scene.start('Game')
  }
}
