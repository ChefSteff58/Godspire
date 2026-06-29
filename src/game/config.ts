import Phaser from 'phaser'
import { PreloadScene } from './scenes/PreloadScene'
import { GameScene } from './scenes/GameScene'
import { GAME_WIDTH, GAME_HEIGHT } from './dimensions'

export { GAME_WIDTH, GAME_HEIGHT } from './dimensions'

export function createConfig(parent: HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#0b0e17',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
    },
    // Preload discovers + loads any dropped-in art, then starts GameScene (which falls back to
    // placeholder shapes for any key whose PNG isn't present yet).
    scene: [PreloadScene, GameScene],
  }
}
