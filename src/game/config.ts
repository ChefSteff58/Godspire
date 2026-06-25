import Phaser from 'phaser'
import { GameScene } from './scenes/GameScene'

/** Logical resolution the game is designed against; Scale.FIT letterboxes to fit. */
export const GAME_WIDTH = 960
export const GAME_HEIGHT = 540

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
    // Boot/Preload scenes arrive in Milestone 1 once we load real assets.
    scene: [GameScene],
  }
}
