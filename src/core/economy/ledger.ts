// ── src/core/economy ── the run's gold purse. Pure & framework-agnostic.
// One authoritative Ledger lives in the RunController; React only ever reads a mirror of `gold`.

export interface Ledger {
  gold: number
}

export function createLedger(startGold: number): Ledger {
  return { gold: Math.max(0, Math.floor(startGold)) }
}

export function canAfford(ledger: Ledger, cost: number): boolean {
  return ledger.gold >= cost
}

/** Spend `cost` if affordable. Mutates `gold`. Returns true on success, false if too poor. */
export function spend(ledger: Ledger, cost: number): boolean {
  if (ledger.gold < cost) return false
  ledger.gold -= cost
  return true
}

/** Add (non-negative) gold. Mutates `gold`. */
export function earn(ledger: Ledger, amount: number): void {
  ledger.gold += Math.max(0, Math.floor(amount))
}

// ── wave income (flat-only for M3; interest is a deferred hook left at rate 0) ──
export const WAVE_INCOME_FLAT_BASE = 40
export const WAVE_INCOME_PER_WAVE = 8
/** Interest is DEFERRED to M5 — keep the hook but disabled so we tune one economy lever in M3. */
export const INTEREST_RATE = 0
export const INTEREST_CAP = 150

/** Gold paid out when a wave is cleared. `banked` feeds the (currently disabled) interest term. */
export function waveIncome(wave: number, banked = 0): number {
  const flat = WAVE_INCOME_FLAT_BASE + WAVE_INCOME_PER_WAVE * Math.max(0, Math.floor(wave))
  const interest = Math.min(banked * INTEREST_RATE, INTEREST_CAP)
  return Math.floor(flat + interest)
}
