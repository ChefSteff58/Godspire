// ── src/core ── framework-agnostic game logic & types.
// HARD RULE: nothing in src/core may import phaser, react, or zustand.
// (Enforced by tests/core-purity.test.ts.)

/** A 2D point. Towers store an absolute position; enemies store progress along the path. */
export interface Vec2 {
  x: number
  y: number
}

/**
 * Commands flow React -> Phaser through a queue in the store, drained once per
 * frame inside the GameScene. This keeps a single clock (Phaser's) authoritative.
 * For Milestone 0 there is exactly one command; it will grow (PLACE_TOWER, etc.).
 */
export type GameCommand = { type: 'pulse' }
