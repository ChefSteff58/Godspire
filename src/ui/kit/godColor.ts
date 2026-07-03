import { TOWER_STATS, type GodKind } from '../../core/data/towers'

/** The god's element color as a CSS hex — one source of truth (TOWER_STATS.color) for both
 *  Phaser tints and React styling. */
export function godHex(god: GodKind): string {
  return `#${TOWER_STATS[god].color.toString(16).padStart(6, '0')}`
}
