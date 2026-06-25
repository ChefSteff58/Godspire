import Phaser from 'phaser'
import { createConfig } from './config'

/** Construct a Phaser.Game mounted into the given DOM element. */
export function createGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game(createConfig(parent))
}
