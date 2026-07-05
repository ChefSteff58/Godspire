import { useGameStore } from '../../state/gameStore'
import { PixelIcon } from '../kit/PixelIcon'

// Rarity → the tray icon's ring color (matches the FateDraftModal palette).
const RING: Record<string, string> = {
  common: '#9aa4b566',
  rare: '#5aa2e8aa',
  epic: '#d65ae8aa',
  legendary: '#f5d061cc',
}

/**
 * The active-boon tray (fleet playtest fix): drafted power was invisible after the pick, so hesitant
 * players accumulated buffs they never learned about. A compact strip of the run's boons sits at the
 * top-left of the field; hover any icon for its name + effect. Pointer-events only on the icons so it
 * never blocks a canvas click.
 */
export function ActiveBoonBar() {
  const boons = useGameStore((s) => s.activeBoons)
  const phase = useGameStore((s) => s.phase)
  if (phase === 'over' || boons.length === 0) return null

  return (
    <div className="pointer-events-none absolute left-2 top-2 z-10 flex max-w-[70%] flex-wrap gap-1">
      {boons.map((b, i) => (
        <span
          key={`${b.id}-${i}`}
          title={`${b.name} — ${b.desc}`}
          style={{ outline: `1.5px solid ${RING[b.rarity] ?? RING.common}`, outlineOffset: '-1px' }}
          className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded bg-black/55 backdrop-blur-sm"
        >
          <PixelIcon name={`boon_${b.id}`} fallback={b.icon} sizeClass="h-5 w-5 text-base" />
        </span>
      ))}
    </div>
  )
}
