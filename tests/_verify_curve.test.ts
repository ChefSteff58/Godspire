// TEMP verifier sim — delete after run. Re-derives the income-vs-HP race for the endless curve.
import { describe, it } from 'vitest'
import { waveSpec, enemyCount, spawnIntervalMs, enemySpeed } from '../src/core/systems/waveManager'
import { waveIncome } from '../src/core/economy/ledger'

describe('verify: endless race', () => {
  it('prints the table', () => {
    let cumGold = 450 // start gold ballpark (base 400-650 depending on pantheon)
    const rows: string[] = []
    for (let w = 1; w <= 90; w++) {
      const spec = waveSpec(w)
      let hp = 0
      let bounty = 0
      let bodies = 0
      for (const g of spec.groups) {
        if (g.kind === 'boss') continue // judge the chaff race; bosses are separate spikes
        let per = g.hp
        if (g.kind === 'hydra') per = Math.round(per * 2) // split children ~double effective HP
        hp += g.count * per
        bounty += g.count * g.bounty
        bodies += g.count
      }
      const income = waveIncome(w)
      cumGold += income + bounty
      // wave on-screen duration: spawn window + half traversal (~1300px path / avg speed)
      const spawnWin = (bodies * spawnIntervalMs(w)) / 1000
      const traverse = 1300 / enemySpeed(w)
      const dur = spawnWin + traverse * 0.6
      const reqDPS = hp / dur
      const buyDPS = cumGold * 0.04 // conservative base-tower gold->DPS (zeus 0.0375, apollo crowd 0.086)
      if (w % 5 === 0 || w <= 15)
        rows.push(
          `w${w}: bodies=${bodies} count=${enemyCount(w)} waveHP=${hp} reqDPS=${reqDPS.toFixed(0)} cumGold=${cumGold} buyableDPS=${buyDPS.toFixed(0)} headroom=${(buyDPS / reqDPS).toFixed(2)}x income+bounty=${income + bounty}`,
        )
    }
    console.log(rows.join('\n'))
  })
})
