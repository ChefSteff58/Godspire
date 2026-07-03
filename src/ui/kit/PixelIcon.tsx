import { uiUrl } from '../assets/uiKit'

/**
 * A pixel icon with an emoji fallback — the HUD's version of the sprite-with-fallback rule.
 * Default size tracks the surrounding text (1.1em) so it drops into chips and stat rows without
 * layout changes; pass `sizeClass` to REPLACE that sizing for big card icons (e.g. `h-14 w-14`).
 * Crisp via image-rendering: pixelated.
 */
export function PixelIcon({
  name,
  fallback,
  className,
  sizeClass,
}: {
  name: string
  fallback: string
  className?: string
  sizeClass?: string
}) {
  const url = uiUrl(name)
  const size = sizeClass ?? 'h-[1.1em] w-[1.1em] align-[-0.15em]'
  if (!url) return <span className={`${sizeClass ? 'inline-flex items-center justify-center' : ''} ${sizeClass ?? ''} ${className ?? ''}`}>{fallback}</span>
  return (
    <img
      src={url}
      alt=""
      aria-hidden
      className={`inline-block object-contain [image-rendering:pixelated] ${size} ${className ?? ''}`}
    />
  )
}
