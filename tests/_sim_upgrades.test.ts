// TEMP SIM (review fleet) — upgrade value-per-gold audit. Deleted after run.
import { describe, it, expect } from 'vitest'
import { TOWER_STATS, GOD_ORDER, type GodKind } from '../src/core/data/towers'
import { UPGRADES, towerEffectiveStats, foldUpgrades, demeterIncome, auraBuff, type UpgradePathKey } from '../src/core/data/upgrades'
import { createTower } from '../src/core/entities/tower'

// ── ASSUMPTIONS (stated per prompt) ────────────────────────────────────────────
// • ST DPS = damage × fireRate (single lead target, no external skill/site/aura muls).
// • pierce (Apollo): projectile hits 1+pierce foes in a line → crowdFactor = 1 + pierce
//   (dense-wave, full-line assumption; GameScene fireProjectile decrements pierceLeft per hit).
// • splash (Poseidon): foes walk a 1-D path; a blast circle covers ~2r of path length →
//   crowd scales LINEARLY with radius. Anchor: base radius 55 hits ~3 clumped foes →
//   crowdFactor = 3 × (splashRadius / 55). Knockback valued qualitatively.
// • chain (Zeus): NO chain field exists in data and no chain mechanic in GameScene —
//   blurb-only ("builds toward chain lightning"). Zeus = pure single-target hitscan.
// • Hephaestus: sustained trap throughput = damage × fireRate (charges consumed as fast
//   as produced in a leaking lane); maxCharges = burst reserve (utility).
// • Demeter/Aphrodite/Athena: damage 0 — valued via income payback / utility columns.
// • Benchmark for "dead upgrade": marginal crowd-DPS/gold vs buying ANOTHER BASE TOWER
//   of the same god (base crowdDPS / base cost).

const DMG_GODS: GodKind[] = ['zeus', 'apollo', 'hermes', 'hephaestus', 'poseidon']

function tw(god: GodKind, a: number, b: number) {
  const t = createTower(god, { x: 0, y: 0 })
  t.pathA = a
  t.pathB = b
  return t
}

function crowdFactor(god: GodKind, eff: ReturnType<typeof towerEffectiveStats>): number {
  const base = TOWER_STATS[god]
  if (base.splash) return 3 * (eff.splashRadius / base.splash.radius) // linear path-chord model
  if (base.attack === 'projectile') return 1 + eff.pierce
  return 1
}

const f2 = (n: number) => n.toFixed(2)
const f4 = (n: number) => n.toFixed(4)

describe('sim: upgrade value-per-gold', () => {
  it('prints the full table', () => {
    const rows: string[] = []
    rows.push('god | path | tier | name | tierCost | cumUpgCost | totalInvested | dmg | rate | range | ST_DPS | crowdX | crowd_DPS | marg_STDPS/gold | marg_crowdDPS/gold | cum_crowdDPS/totalGold | utility/range delta')

    for (const god of DMG_GODS) {
      const base = TOWER_STATS[god]
      const baseEff = towerEffectiveStats(tw(god, 0, 0))
      const baseST = baseEff.damage * baseEff.fireRate
      const baseCrowd = baseST * crowdFactor(god, baseEff)
      rows.push(`${god} | base | 0 | (buy) | ${base.cost} | 0 | ${base.cost} | ${f2(baseEff.damage)} | ${f2(baseEff.fireRate)} | ${f2(baseEff.range)} | ${f2(baseST)} | ${f2(crowdFactor(god, baseEff))} | ${f2(baseCrowd)} | ${f4(baseST / base.cost)} | ${f4(baseCrowd / base.cost)} | ${f4(baseCrowd / base.cost)} | baseline`)

      for (const path of ['A', 'B'] as UpgradePathKey[]) {
        let cumCost = 0
        let prevST = baseST
        let prevCrowd = baseCrowd
        let prevRange = baseEff.range
        for (let tier = 1; tier <= 3; tier++) {
          const spec = UPGRADES[god][path].tiers[tier - 1]
          cumCost += spec.cost
          const t = tw(god, path === 'A' ? tier : 0, path === 'B' ? tier : 0)
          const eff = towerEffectiveStats(t)
          const st = eff.damage * eff.fireRate
          const cf = crowdFactor(god, eff)
          const crowd = st * cf
          const total = base.cost + cumCost
          const util: string[] = []
          if (eff.range !== prevRange) util.push(`range ${f2(prevRange)}→${f2(eff.range)}`)
          if (spec.effect.grantsAir) util.push('GRANTS AIR')
          if (spec.effect.maxChargesAdd) util.push(`+${spec.effect.maxChargesAdd} charges (→${eff.maxCharges})`)
          if (spec.effect.knockbackMul) util.push(`knockback ×${spec.effect.knockbackMul} (→${f4(eff.knockback)})`)
          if (spec.effect.projectileSpeedMul) util.push(`projSpd →${f2(eff.projectileSpeed)}`)
          rows.push(`${god} | ${path}:${UPGRADES[god][path].name} | ${tier} | ${spec.name} | ${spec.cost} | ${cumCost} | ${total} | ${f2(eff.damage)} | ${f2(eff.fireRate)} | ${f2(eff.range)} | ${f2(st)} | ${f2(cf)} | ${f2(crowd)} | ${f4((st - prevST) / spec.cost)} | ${f4((crowd - prevCrowd) / spec.cost)} | ${f4(crowd / total)} | ${util.join('; ') || '-'}`)
          prevST = st
          prevCrowd = crowd
          prevRange = eff.range
        }
      }
    }
    console.log('\n=== DPS TABLE ===\n' + rows.join('\n'))

    // ── Demeter income payback ──
    const drows: string[] = []
    drows.push('path | tier | tierCost | income@w5 | @w10 | @w20 | @w30 | Δincome@w20 | payback(waves)@w20')
    const dIncome = (a: number, b: number, w: number) => demeterIncome(tw('demeter', a, b), w)
    drows.push(`base | 0 | 300 | ${dIncome(0, 0, 5)} | ${dIncome(0, 0, 10)} | ${dIncome(0, 0, 20)} | ${dIncome(0, 0, 30)} | - | ${f2(300 / dIncome(0, 0, 20))}`)
    for (const path of ['A', 'B'] as UpgradePathKey[]) {
      for (let tier = 1; tier <= 3; tier++) {
        const spec = UPGRADES.demeter[path].tiers[tier - 1]
        const a = path === 'A' ? tier : 0, b = path === 'B' ? tier : 0
        const pa = path === 'A' ? tier - 1 : 0, pb = path === 'B' ? tier - 1 : 0
        const d20 = dIncome(a, b, 20) - dIncome(pa, pb, 20)
        drows.push(`${path}:${UPGRADES.demeter[path].name} | ${tier} | ${spec.cost} | ${dIncome(a, b, 5)} | ${dIncome(a, b, 10)} | ${dIncome(a, b, 20)} | ${dIncome(a, b, 30)} | +${d20} | ${f2(spec.cost / d20)}`)
      }
    }
    console.log('\n=== DEMETER INCOME ===\n' + drows.join('\n'))

    // ── Athena aura scaling (multiplier delivered to towers in range) ──
    const arows: string[] = []
    arows.push('path | tier | tierCost | cum | auraDmgMul | auraRateMul | range | breakeven ST-DPS in aura (marg dmg-mul value vs base zeus/gold)')
    const zeusRef = (TOWER_STATS.zeus.damage * TOWER_STATS.zeus.fireRate) / TOWER_STATS.zeus.cost // DPS/gold of a base zeus
    const ab = (a: number, b: number) => auraBuff(tw('athena', a, b))!
    arows.push(`base | 0 | 320 | 320 | ${f4(ab(0, 0).damageMul)} | ${f4(ab(0, 0).fireRateMul)} | ${TOWER_STATS.athena.range} | detect=true`)
    for (const path of ['A', 'B'] as UpgradePathKey[]) {
      let cum = 320
      for (let tier = 1; tier <= 3; tier++) {
        const spec = UPGRADES.athena[path].tiers[tier - 1]
        cum += spec.cost
        const a = path === 'A' ? tier : 0, b = path === 'B' ? tier : 0
        const cur = ab(a, b)
        const prev = ab(path === 'A' ? tier - 1 : 0, path === 'B' ? tier - 1 : 0)
        const eff = towerEffectiveStats(tw('athena', a, b))
        // DPS a tier adds if X total ST-DPS sits in the aura: X × (curMul/prevMul − 1) [dmg × rate combined]
        const mulGain = (cur.damageMul * cur.fireRateMul) / (prev.damageMul * prev.fireRateMul) - 1
        const breakevenDPS = (zeusRef * spec.cost) / mulGain
        arows.push(`${path}:${UPGRADES.athena[path].name} | ${tier} | ${spec.cost} | ${cum} | ${f4(cur.damageMul)} | ${f4(cur.fireRateMul)} | ${f2(eff.range)} | needs ${f2(breakevenDPS)} DPS in aura to beat base-zeus gold`)
      }
    }
    console.log('\n=== ATHENA AURA ===\n' + arows.join('\n'))

    // ── Aphrodite slow throughput (effective "lane time added" proxy) ──
    const prows: string[] = []
    prows.push('path | tier | tierCost | slowMul | targets | range | slowPower = targets × (1−slowMul) × range (delay proxy)')
    const ap = (a: number, b: number) => towerEffectiveStats(tw('aphrodite', a, b))
    const power = (e: ReturnType<typeof towerEffectiveStats>) => e.slowTargets * (1 - e.slowMul) * e.range
    const apBase = ap(0, 0)
    prows.push(`base | 0 | 220 | ${f2(apBase.slowMul)} | ${apBase.slowTargets} | ${f2(apBase.range)} | ${f2(power(apBase))} (${f4(power(apBase) / 220)}/gold)`)
    for (const path of ['A', 'B'] as UpgradePathKey[]) {
      for (let tier = 1; tier <= 3; tier++) {
        const spec = UPGRADES.aphrodite[path].tiers[tier - 1]
        const e = ap(path === 'A' ? tier : 0, path === 'B' ? tier : 0)
        const pe = ap(path === 'A' ? tier - 1 : 0, path === 'B' ? tier - 1 : 0)
        prows.push(`${path}:${UPGRADES.aphrodite[path].name} | ${tier} | ${spec.cost} | ${f2(e.slowMul)} | ${e.slowTargets} | ${f2(e.range)} | ${f2(power(e))} (marg ${f4((power(e) - power(pe)) / spec.cost)}/gold)`)
      }
    }
    console.log('\n=== APHRODITE SLOW ===\n' + prows.join('\n'))

    // ── Flags: dead upgrades / mispriced tiers / path dominance ──
    const flags: string[] = []
    for (const god of DMG_GODS) {
      const base = TOWER_STATS[god]
      const baseEff = towerEffectiveStats(tw(god, 0, 0))
      const baseCrowdPerGold = (baseEff.damage * baseEff.fireRate * crowdFactor(god, baseEff)) / base.cost
      const perPathMargins: Record<string, number[]> = { A: [], B: [] }
      for (const path of ['A', 'B'] as UpgradePathKey[]) {
        let prev = baseEff.damage * baseEff.fireRate * crowdFactor(god, baseEff)
        for (let tier = 1; tier <= 3; tier++) {
          const spec = UPGRADES[god][path].tiers[tier - 1]
          const eff = towerEffectiveStats(tw(god, path === 'A' ? tier : 0, path === 'B' ? tier : 0))
          const crowd = eff.damage * eff.fireRate * crowdFactor(god, eff)
          const marg = (crowd - prev) / spec.cost
          perPathMargins[path].push(marg)
          const hasUtility = !!(spec.effect.grantsAir || spec.effect.maxChargesAdd || spec.effect.knockbackMul || (spec.effect.rangeMul ?? 1) > 1)
          if (marg < baseCrowdPerGold && !hasUtility) flags.push(`DEAD? ${god} ${path}${tier} ${spec.name}: marginal ${f4(marg)} crowdDPS/g < base ${f4(baseCrowdPerGold)} (no utility rider)`)
          else if (marg < baseCrowdPerGold) flags.push(`WEAK (utility rider) ${god} ${path}${tier} ${spec.name}: marginal ${f4(marg)} < base ${f4(baseCrowdPerGold)}`)
          prev = crowd
        }
      }
      for (const path of ['A', 'B'] as UpgradePathKey[]) {
        const m = perPathMargins[path]
        const mx = Math.max(...m), mn = Math.min(...m)
        if (mn > 0 && mx / mn > 2) flags.push(`SPREAD ${god} ${path}: tier margins [${m.map(f4).join(', ')}] spread ${f2(mx / mn)}x`)
      }
      // dominance: same-tier cumulative crowd DPS per total gold, A vs B
      let dominated: 'A' | 'B' | null = null
      let aBeats = 0, bBeats = 0
      for (let tier = 1; tier <= 3; tier++) {
        const cost = (p: UpgradePathKey) => base.cost + UPGRADES[god][p].tiers.slice(0, tier).reduce((s, t) => s + t.cost, 0)
        const crowd = (p: UpgradePathKey) => {
          const eff = towerEffectiveStats(tw(god, p === 'A' ? tier : 0, p === 'B' ? tier : 0))
          return eff.damage * eff.fireRate * crowdFactor(god, eff)
        }
        if (crowd('A') / cost('A') > crowd('B') / cost('B')) aBeats++
        else bBeats++
      }
      if (aBeats === 3) dominated = 'B'
      if (bBeats === 3) dominated = 'A'
      if (dominated) flags.push(`DOMINANCE ${god}: path ${dominated === 'B' ? 'A' : 'B'} beats ${dominated} on crowdDPS/gold at ALL tiers (check utility offsets)`)
    }
    console.log('\n=== FLAGS ===\n' + (flags.join('\n') || 'none'))

    expect(rows.length).toBeGreaterThan(10)
  })
})
