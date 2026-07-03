import { uiUrl } from '../assets/uiKit'

/**
 * A pixel resource icon with an emoji fallback — the HUD's version of the sprite-with-fallback
 * rule. Sized relative to the surrounding text (1.1em) so it drops into chips and stat rows
 * without layout changes; crisp via image-rendering: pixelated.
 */
export function PixelIcon({ name, fallback, className }: { name: string; fallback: string; className?: string }) {
  const url = uiUrl(name)
  if (!url) return <span className={className}>{fallback}</span>
  return (
    <img
      src={url}
      alt=""
      aria-hidden
      className={`inline-block h-[1.1em] w-[1.1em] object-contain align-[-0.15em] [image-rendering:pixelated] ${className ?? ''}`}
    />
  )
}
