// ── src/core ── framework-agnostic game logic & types.
// HARD RULE: nothing in src/core may import phaser, react, or zustand.
// (Enforced by tests/core-purity.test.ts.)

/** A 2D point. Towers store an absolute position; enemies store progress along the path. */
export interface Vec2 {
  x: number
  y: number
}
