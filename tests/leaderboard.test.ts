import { describe, it, expect } from 'vitest'
import { rankScores, type ScoreRow } from '../src/lib/supabase/leaderboard'

const row = (user_id: string | null, highest_wave: number, created_at: string, player_name = 'P'): ScoreRow => ({
  user_id,
  highest_wave,
  created_at,
  player_name,
})

describe('rankScores', () => {
  it('keeps one entry per player — their BEST wave — and ranks desc', () => {
    const ranked = rankScores([
      row('a', 12, '2026-01-01', 'Alice'),
      row('a', 30, '2026-02-01', 'Alice'), // Alice's best
      row('b', 22, '2026-01-15', 'Bob'),
      row('a', 8, '2026-01-10', 'Alice'),
    ])
    expect(ranked.map((r) => [r.player_name, r.highest_wave, r.rank])).toEqual([
      ['Alice', 30, 1],
      ['Bob', 22, 2],
    ])
  })

  it('breaks ties by earliest submission (first to reach the wave ranks higher)', () => {
    const ranked = rankScores([
      row('b', 20, '2026-03-01', 'Bob'),
      row('a', 20, '2026-01-01', 'Alice'), // same wave, earlier → ranks first
    ])
    expect(ranked.map((r) => r.player_name)).toEqual(['Alice', 'Bob'])
    expect(ranked[0].rank).toBe(1)
  })

  it('keeps orphaned rows (no user_id) as their own entries', () => {
    const ranked = rankScores([
      row(null, 40, '2026-01-01', 'Ghost'),
      row('a', 10, '2026-01-01', 'Alice'),
    ])
    expect(ranked[0].player_name).toBe('Ghost')
    expect(ranked).toHaveLength(2)
  })

  it('empty in → empty out', () => {
    expect(rankScores([])).toEqual([])
  })
})
