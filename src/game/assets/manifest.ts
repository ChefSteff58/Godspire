import type { GodKind } from '../../core/data/towers'
import type { EnemyKind } from '../../core/entities/enemy'
import type { BossId } from '../../core/data/bosses'

/**
 * The SINGLE SOURCE OF TRUTH for art assets. Both Phaser's `PreloadScene` and the React shop read it.
 *
 * Art is DROP-IN: generate a transparent PNG, name it exactly `<key>.png`, drop it into
 * `./sprites/` (see that folder's README), and it auto-loads + renders in place of the placeholder
 * shape. Until a key's PNG exists, the game draws its current shape — nothing breaks, so art can land
 * one creature at a time. Keys match the engine's own ids (GodKind / EnemyKind / BossId) so a tower,
 * enemy, or boss "just works" the moment its file appears.
 *
 * Discovery is automatic via Vite's glob — there is no list to keep in sync and no 404s for missing
 * art (only files that actually exist are ever loaded). `EXPECTED_SPRITES` below is documentation: the
 * full set the finished game wants, with the on-screen size each is drawn at.
 */

// Vite bundles whatever PNGs exist at build/HMR time → { './sprites/zeus.png': '/assets/zeus.<hash>.png' }.
const FILES = import.meta.glob('./sprites/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

/** key (filename without `.png`) → resolved URL, for every sprite that actually exists right now. */
export const AVAILABLE_SPRITES: Record<string, string> = Object.fromEntries(
  Object.entries(FILES).map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1, -'.png'.length), url]),
)

/** Is real art present for this key? (false → the caller draws its placeholder shape.) */
export function hasSprite(key: string): boolean {
  return key in AVAILABLE_SPRITES
}

/**
 * Is a COMPLETE 16-tile Wang tileset present (`tile_<set>_0..15.png`)? All-or-nothing on purpose:
 * a partial import must fall back to the drawn map, never render swiss cheese.
 */
export function hasTileset(set: string): boolean {
  for (let i = 0; i < 16; i++) if (!(`tile_${set}_${i}` in AVAILABLE_SPRITES)) return false
  return true
}

/** Resolved URL for a key's art, or undefined if it hasn't been added yet. */
export function spriteUrl(key: string): string | undefined {
  return AVAILABLE_SPRITES[key]
}

/** The on-screen footprint (longest side, px) a sprite is drawn at — chosen to match the shape it replaces. */
export interface SpriteSpec {
  key: string
  size: number
  note: string
}

/**
 * The complete intended asset list. NOT required for the pipeline to work (discovery is automatic) —
 * it's the canonical checklist for art generation + a place to tune each sprite's draw size. Enemy /
 * tower sizes here are advisory; the engine actually derives their size from the live radius so a swap
 * is always pixel-aligned with the disc it replaces. Projectile/UI sizes have no shape to derive from.
 */
export const EXPECTED_SPRITES: readonly SpriteSpec[] = [
  // Gods (towers) — key === GodKind
  { key: 'zeus', size: 32, note: 'god tower — lightning' },
  { key: 'apollo', size: 32, note: 'god tower — sun-bow' },
  { key: 'demeter', size: 32, note: 'god tower — harvest' },
  { key: 'hermes', size: 32, note: 'god tower — winged scout' },
  { key: 'hephaestus', size: 32, note: 'god tower — forge/spikes' },
  { key: 'poseidon', size: 32, note: 'god tower — tides' },
  { key: 'aphrodite', size: 32, note: 'god tower — charm' },
  { key: 'athena', size: 32, note: 'god tower — war-council/owl' },
  // Enemies — key === EnemyKind
  { key: 'shade', size: 18, note: 'swarm wisp' },
  { key: 'skeleton', size: 24, note: 'baseline grunt' },
  { key: 'harpy', size: 22, note: 'flying' },
  { key: 'talos', size: 34, note: 'armored brute' },
  { key: 'hydra', size: 28, note: 'splitter' },
  { key: 'satyr', size: 20, note: 'fast' },
  { key: 'gorgon', size: 26, note: 'stealth' },
  // Bosses — key === BossId
  { key: 'nemean', size: 56, note: 'boss — Nemean Lion' },
  { key: 'minotaur', size: 56, note: 'boss — Minotaur' },
  { key: 'cyclops', size: 64, note: 'boss — Cyclops' },
  // Projectiles (optional — hitscan gods need none) — key === proj_<GodKind>
  { key: 'proj_apollo', size: 16, note: 'sun-arrow' },
  { key: 'proj_hermes', size: 14, note: 'dart' },
]

// Compile-time coverage: every god / enemy / boss id has an entry above. (Unused locals are a guard,
// not runtime — if a new id is added to core without a sprite spec, TS flags it here.)
const _godKeys: Record<GodKind, true> = {
  zeus: true, apollo: true, demeter: true, hermes: true,
  hephaestus: true, poseidon: true, aphrodite: true, athena: true,
}
const _enemyKeys: Record<Exclude<EnemyKind, 'boss'>, true> = {
  shade: true, skeleton: true, harpy: true, talos: true, hydra: true, satyr: true, gorgon: true,
}
const _bossKeys: Record<BossId, true> = { nemean: true, minotaur: true, cyclops: true }
void _godKeys
void _enemyKeys
void _bossKeys
