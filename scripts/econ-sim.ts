// ── M12 S0 · Economy sim harness ──────────────────────────────────────────────
// A headless, faithful model of a run's GOLD SOURCES, built on the REAL core
// functions (waveIncome, waveSpec bounties, demeterIncome) so its numbers ARE the
// game's numbers. It exists to pin the late-game inflation curve before the M12
// Demeter redesign, and to stay a reusable tuning + regression harness after.
//
// Pure exports only (no side effects) so tests/economy.test.ts can import it.
// Print the human-readable tables with:  npx vite-node scripts/econ-sim-run.ts

import { waveIncome } from '../src/core/economy/ledger'
import { waveSpec } from '../src/core/systems/waveManager'
import { demeterIncome, UPGRADES } from '../src/core/data/upgrades'
import { stackMul } from '../src/core/economy/farms'
import type { Tower } from '../src/core/entities/tower'
import type { GodKind, UpgradePathKey } from '../src/core/data/towers'

// A Demeter farm is fully described (for income) by its two path tiers. demeterIncome
// only reads god/pathA/pathB, so a minimal literal is a faithful stand-in.
export const farm = (pathA: number, pathB: number): Tower => ({ god: 'demeter', pathA, pathB } as Tower)

/** Bounty gold a fully-cleared wave pays — sum of every spawned body's bounty (+ boss).
 *  NOTE: Hydra split-children spawn on death (not in the spec), so this is a LOWER bound;
 *  farms dominate the late curve, so the approximation doesn't move the inflation story. */
export function bountyIncome(wave: number): number {
  return waveSpec(wave).groups.reduce((s, g) => s + g.count * g.bounty, 0)
}

export interface EconConfig {
  farms?: Tower[] // Demeter farms on the field
  demeterIncomeMul?: number // boon layer (Golden Harvest 1.6×; hard-capped 4× in-game)
  incomeMul?: number // Pantheon global wave-income multiplier
}

/** Total farm income for a herd at `wave` (models M12 stacking DR; cluster=1 here since the
 *  archetypes are position-less — cluster is bonus-only and unit-tested separately). */
export function farmIncome(farms: Tower[], wave: number, dMul = 1): number {
  const stack = stackMul(farms.length)
  return farms.reduce((s, f) => s + Math.round(demeterIncome(f, wave) * stack * dMul), 0)
}

/** Gold earned on the wave-`wave` clear for a given board configuration. */
export function waveGold(wave: number, cfg: EconConfig = {}): number {
  const incomeMul = cfg.incomeMul ?? 1
  const wave$ = Math.floor(waveIncome(wave) * incomeMul)
  const bounty$ = bountyIncome(wave)
  const farm$ = farmIncome(cfg.farms ?? [], wave, cfg.demeterIncomeMul ?? 1)
  return wave$ + bounty$ + farm$
}

/** Per-wave + cumulative gold across waves 1..maxWave for a config. */
export function simulate(cfg: EconConfig, maxWave = 60): { wave: number; per: number; cum: number }[] {
  const rows: { wave: number; per: number; cum: number }[] = []
  let cum = 0
  for (let w = 1; w <= maxWave; w++) {
    const per = waveGold(w, cfg)
    cum += per
    rows.push({ wave: w, per, cum })
  }
  return rows
}

/** Total gold to fully buy a god's board: base tower + main path A(1..5) + dip B(1..2). */
export function fullBuildCost(god: GodKind, base: number): number {
  const tier$ = (path: UpgradePathKey, upto: number) =>
    UPGRADES[god][path].tiers.slice(0, upto).reduce((s, t) => s + t.cost, 0)
  return base + tier$('A', 5) + tier$('B', 2)
}

/** Base tower costs by god (mirrors TOWER_STATS costs — used for board-cost totals). */
export const TOWER_BASE_COST: Record<GodKind, number> = {
  zeus: 200, apollo: 250, demeter: 300, hermes: 275, hephaestus: 230, poseidon: 300, aphrodite: 220, athena: 320,
}

export const PRICIEST_T5 = 4200 // Poseidon B5 / Zeus B5 — the single most expensive purchase in the game

/** Cross-path rule: a farm mains ONE path to 5 and dips the other to 2. */
export const ARCHETYPES: { name: string; cfg: EconConfig }[] = [
  { name: 'baseline (no farm)', cfg: {} },
  { name: '1 Cornucopia A5/B2', cfg: { farms: [farm(5, 2)] } },
  { name: '1 Vault B5/A2', cfg: { farms: [farm(2, 5)] } },
  { name: '1 Vault +GoldenHarvest', cfg: { farms: [farm(2, 5)], demeterIncomeMul: 1.6 } },
  { name: '4 Vault B5/A2', cfg: { farms: [farm(2, 5), farm(2, 5), farm(2, 5), farm(2, 5)] } },
]
