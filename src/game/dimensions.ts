// Logical resolution the game is designed against; Scale.FIT letterboxes to fit.
// Lives in its own import-free module so both config.ts and GameScene can use it
// without a circular import (config imports GameScene, GameScene needs these).
export const GAME_WIDTH = 960
export const GAME_HEIGHT = 540
