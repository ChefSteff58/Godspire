import Phaser from 'phaser'
import { createConfig } from './config'

/** Construct a Phaser.Game mounted into the given DOM element. */
export function createGame(parent: HTMLElement): Phaser.Game {
  const game = new Phaser.Game(createConfig(parent))
  if (import.meta.env.DEV) {
    // Dev probe: a hidden/throttled tab starves the RAF loop (the PreloadScene's loader never
    // ticks). Exposing the game lets headless checks drive frames manually via game.loop.step().
    ;(window as unknown as Record<string, unknown>).godspireGame = game
  }
  return game
}
