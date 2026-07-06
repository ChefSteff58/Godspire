// ── M12 S0 · Economy sim — table printer ──────────────────────────────────────
// Human-readable runner for the sim harness. Prints the gold curves + inflation
// flags used to author docs/design/economy-sim-2026-07.md.
//
// Run:  npx vite-node scripts/econ-sim-run.ts

import { ARCHETYPES, PRICIEST_T5, TOWER_BASE_COST, fullBuildCost, simulate } from './econ-sim'
import type { GodKind } from '../src/core/data/towers'

const pad = (s: string | number, n: number): string => String(s).padStart(n)

const checkpoints = [1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60]
console.log('\n=== M12 S0 · ECONOMY SIM — current (pre-redesign) gold curves ===\n')

const sims = ARCHETYPES.map((a) => simulate(a.cfg))

console.log('PER-WAVE GOLD (income earned on each wave clear):')
console.log('wave  ' + ARCHETYPES.map((a) => pad(a.name, 26)).join(''))
for (const w of checkpoints) {
  console.log(pad(w, 4) + '  ' + sims.map((s) => pad(s[w - 1].per.toLocaleString(), 26)).join(''))
}

console.log('\nCUMULATIVE GOLD (total earned through wave N):')
console.log('wave  ' + ARCHETYPES.map((a) => pad(a.name, 26)).join(''))
for (const w of checkpoints) {
  console.log(pad(w, 4) + '  ' + sims.map((s) => pad(s[w - 1].cum.toLocaleString(), 26)).join(''))
}

console.log(`\nINFLATION FLAG — first wave where PER-WAVE income > the priciest T5 (${PRICIEST_T5}):`)
for (let i = 0; i < ARCHETYPES.length; i++) {
  const hit = sims[i].find((r) => r.per > PRICIEST_T5)
  console.log('  ' + pad(ARCHETYPES[i].name, 26) + '  ' + (hit ? `wave ${hit.wave}` : 'never (≤60)'))
}

const boardCost = (Object.keys(TOWER_BASE_COST) as GodKind[]).reduce((s, g) => s + fullBuildCost(g, TOWER_BASE_COST[g]), 0)
console.log(`\nFULL 8-GOD BOARD COST (every god main-maxed A5 + dip B2): ${boardCost.toLocaleString()} gold`)
console.log('  → first wave each archetype has earned enough CUMULATIVE gold to have bought EVERYTHING:')
for (let i = 0; i < ARCHETYPES.length; i++) {
  const hit = sims[i].find((r) => r.cum > boardCost)
  console.log('  ' + pad(ARCHETYPES[i].name, 26) + '  ' + (hit ? `wave ${hit.wave}` : 'never (≤60)'))
}
console.log('')
