import type { TargetingMode } from '../systems/targeting'

// The god roster grows to 6 in M5. M2 ships only Zeus to prove the core loop.
export type GodKind = 'zeus'

export interface TowerStats {
  name: string
  blurb: string
  range: number // px in the 960×540 logical space
  damage: number
  fireRate: number // shots per second
  defaultTargeting: TargetingMode
  color: number // placeholder sprite color
}

export const TOWER_STATS: Record<GodKind, TowerStats> = {
  zeus: {
    name: 'Zeus',
    blurb: 'King of the sky — hurls a bolt at the lead foe.',
    range: 135,
    damage: 5,
    fireRate: 1.5,
    defaultTargeting: 'first',
    color: 0xf5d061,
  },
}

export const GOD_ORDER: readonly GodKind[] = ['zeus']
