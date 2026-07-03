# Godspire — Background & UI (M8 Stage 4) — SHIPPED 2026-07-02

This plan was executed and superseded by the staged run recorded in
`~/.claude/plans/you-are-a-veteran-dapper-thompson.md` (M8 Stage 4 section). Outcomes:

- **Terrain:** Wang 2-corner tileset ("ashen" — pale stone + ember-rimmed transitions over dark
  violet ash, user-picked from a 3-candidate in-game bake-off). Pure helper in
  `src/game/render/wang.ts`; tiles sliced BY METADATA via `scripts/pixlab_import_tiles.sh` so
  `tile_ashen_<mask>.png` is self-verifying. Ground renders in `GameScene.drawTiledGround()`
  (all-16-or-nothing via `manifest.hasTileset`, drawn-map fallback).
- **Road:** HYBRID (user-picked) — the smooth polyline road re-tuned to the tileset palette.
- **Props:** obj_{rift,gate,columns,boulder,olive,styx}.png via `create_map_object` +
  `scripts/pixlab_import_object.sh`. v2 after art-direction feedback: no text labels, everything
  scaled up, the rift is a readable hellmouth, the Styx is a pocket-filling LAKE (r30→60 — a real
  Poseidon domain).
- **UI kit:** `src/ui/assets/` + `uiKit.ts` (React-side glob) + border-image 9-slice classes in
  `index.css` (.pixel-panel/.pixel-card/.pixel-chip/.pixel-btn[--gold]) + `PixelIcon` with 6
  generated icons. Tailwind styling stays as the per-component fallback.
- **Font:** self-hosted Silkscreen 400/700 (`--font-pixel`), applied to headings/numbers/buttons;
  prose stays system. Phaser text uses the Silkscreen-first stack.
- **Title screen:** `TitleScreen.tsx` + `gamePhase` gate in gameStore; Phaser mounts only after
  Play; Pantheon/Ranks overlays lifted to the App root (open from the title).

Generation playbook + parameters live in the main plan file; provenance sheets in
`docs/design/tilesets/`.
