/**
 * The React HUD's pixel-art asset kit — panels, chips, buttons, and resource icons. Deliberately
 * SEPARATE from src/game/assets (that glob feeds Phaser's preloader; UI art would be dead GPU
 * textures there). Same drop-in contract as the game sprites: files that exist are discovered by
 * the glob; missing files mean the component keeps its plain Tailwind look (the built-in fallback).
 *
 *   panels/  panel_stone.png  chip.png  btn.png  btn_gold.png  card.png   (9-slice frames — see
 *            the .pixel-* classes in src/index.css for how they're applied via CSS border-image)
 *   icons/   icon_gold.png  icon_heart.png  icon_shield.png  icon_wave.png  icon_skull.png  icon_favor.png
 */
const FILES = import.meta.glob('./{panels,icons}/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

/** key (filename without `.png`) → resolved URL, for every UI asset that exists right now. */
export const AVAILABLE_UI: Record<string, string> = Object.fromEntries(
  Object.entries(FILES).map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1, -'.png'.length), url]),
)

/** Resolved URL for a UI asset, or undefined until its PNG is dropped in. */
export function uiUrl(key: string): string | undefined {
  return AVAILABLE_UI[key]
}

/** Is real art present for this UI key? (false → the component keeps its Tailwind styling.) */
export function hasUi(key: string): boolean {
  return key in AVAILABLE_UI
}
