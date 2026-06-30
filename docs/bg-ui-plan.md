# Godspire — Background & UI Animation Plan (M8 Stage 4)

*Written 2026-06-30 during the overnight roster run. **Plan only** — nothing here is built yet. This is the
concrete M8 Stage 4 ("Map, UI & cohesion pass") now that all 18 creatures are pixel art. Goal: make the
**map, background, and HUD** read as one cohesive pixel-art game, matching the creatures' look
(high-top-down, single-black-outline, high-detail PixelLab style). Audio stays a separate later milestone.*

The roster proved the pipeline: PixelLab MCP → `scripts/pixlab_import.sh` → manifest glob → render. This
plan reuses that exact pipeline for tiles/objects/UI, plus pure-Phaser juice for motion. Sequenced
cheap→expensive so each step ships green.

---

## Where things stand (so the plan is grounded)
- **Map today:** `src/core/map/path.ts` is the "Tartarus Switchback" waypoint polyline; `GameScene` draws a
  flat ember→ash terrain + a ~44px road over a darker buffer band, plus drawn rift/gate markers and 4
  obstacle dead-zones (`src/core/map/obstacles.ts`: ruined columns, boulder, Styx pool, olive grove).
- **HUD today:** React/Tailwind — `TopBar` (gold/lives/wave chips, speed cluster), `RightRail` (god shop,
  now pixel sprite icons), `FateDraftModal`, `RunOverModal`, `PantheonTreePanel`, `LeaderboardOverlay`.
  Emoji icons (🪙 ❤️) and slate/amber Tailwind theme.
- **Render seam:** `manifest.ts` globs `sprites/*.png` and the `PreloadScene` loads them; `DirAnimSprite`
  auto-renders any `<key>_<dir>` / `<key>_<anim>_<dir>_<f>`. Background tiles + UI icons can ride the SAME
  glob (drop a PNG, reference its key) — no new loader needed.
- **Juice today (M8 Stage 1, already shipped):** `burst()`, hit flash/scale-punch, `cameras.shake/flash`,
  boss telegraph + zoom, floating damage numbers, spawn squash, idle bob. The backdrop motion below layers
  on top of this existing FX vocabulary.

---

## Stage A — Animated map & background (the biggest visual win)

### A1. Terrain + road as a pixel tileset (PixelLab `create_topdown_tileset`)
- Generate a **Tartarus/Olympus top-down tileset**: cracked volcanic ground, ember cracks, a stone/ash
  road, and edge transitions. Same locked style (high top-down, single black outline) so it matches the
  creatures. One warm "Tartarus" set (bottom of the map) blending to cooler "Olympus" stone near the gate.
- Import tiles as `sprites/tile_<name>.png`; in `GameScene.create`, replace the flat `fillRect` terrain +
  road draw with a **tilemap** (Phaser `add.tileSprite` for the ground fill + a tiled road stamped along
  the polyline). Keep the existing path polyline as the source of truth — only the *rendering* changes.
- **Fallback:** keep the current `fillRect` terrain behind the tiles so a missing tile PNG can't blank the
  map (mirror the creature sprite-with-fallback pattern).

### A2. Greek obstacle objects (PixelLab `create_map_object`)
- One `create_map_object` per dead-zone in `obstacles.ts`: **ruined Doric columns**, a **mossy boulder**, the
  **Styx pool** (dark water with a faint glow), an **olive grove**. Import as `sprites/obj_<name>.png`,
  drawn at each obstacle's center/footprint (swap the current drawn shapes; fallback to them).
- The Styx pool gets a subtle animated shimmer (A3) — it already has a `terrain:'water'` hook for a future
  Poseidon synergy.

### A3. Subtle animated backdrop (pure Phaser — $0, no art)
Layered behind the action so it never competes with readability:
- **Tartarus glow** at the rift (bottom-left): a slow-pulsing radial ember light (`tween` alpha/scale on a
  soft additive sprite) + a few rising ember **particles** drifting up the screen.
- **Drifting mist/clouds**: 2–3 large semi-transparent `tileSprite` layers scrolling slowly at different
  speeds (parallax) — cool near Olympus, smoky near Tartarus.
- **Olympus gate shimmer**: a faint gold god-ray sweep (a rotating/oscillating gradient sprite) at the
  top-right exit, signalling "the goal."
- **Path ember flecks**: occasional sparks rising from the road cracks (low-rate emitter) to make the
  battlefield feel alive without distraction.
All of these are additive layers at low alpha + low particle counts (watch the heavy-wave frame budget;
gate behind a quality flag if needed).

---

## Stage B — HUD / UI pixel restyle (cohesion with the pixel creatures)

### B1. Pixel UI kit (PixelLab `create_ui_asset` + `create_font`)
- Generate a **pixel UI kit**: chunky beveled panel/border frames, button states (idle/hover/disabled),
  chip backgrounds, and **resource icons** (gold coin, heart/life, wave/skull, Favor) to replace the emoji
  in `TopBar`. Import as `sprites/ui_<name>.png` (and a pixel **bitmap font** via `create_font` for
  headers/labels, or a CSS web pixel font like "Press Start 2P"/"Silkscreen" for the React HUD — cheaper,
  no asset gen, good enough).
- Apply to `TopBar` (icon swap + pixel font on the chips), `RightRail` (chunky pixel button frames around
  the god cards — the sprite icons already landed), and the modal panels (`FateDraftModal`,
  `RunOverModal`, `PantheonTreePanel`, `LeaderboardOverlay`) — pixel borders + the kit's panel background,
  keeping the existing slate/amber palette so contrast/readability is preserved.

### B2. Tailwind theme pass (`src/index.css` / `constants/theme.ts` if present)
- Add a pixel font-family + `image-rendering: pixelated` utility (already used on the shop icons) applied
  to all UI sprites. Chunky 2–3px borders, hard shadows (no soft blur) for the "game UI" feel. Define a
  small palette token set (Tartarus ember, Olympus gold, Styx blue) so React + Phaser share colors.
- Keep it **incremental + reversible**: restyle one component at a time, verify each in the preview, so a
  half-done pass never breaks the playable HUD.

### B3. Title / menu screen (the missing front door)
- A real **title screen** before the run: "GODSPIRE" in the pixel font over a Tartarus-glow backdrop (reuse
  A3), a hero sprite or two (Zeus + a boss) flanking the logo, and **Play / Pantheon / Leaderboard**
  buttons. New `src/ui/screens/TitleScreen.tsx` gated by a `gamePhase: 'title' | 'playing'` flag in
  `gameStore` (the canvas/HUD mount only after Play). Optional PixelLab title banner via `create_ui_asset`.
- This is also the natural home for the future **home-base/main-menu** consolidation noted in the M7 plan
  (leaderboard + Pantheon + XP outside the live game).

---

## Stage C — Cohesion & polish sweep
- **Size/scale pass** across the whole set now that everything exists: shop icon size (`RightRail h-12`),
  on-map god size (`TOWER_SPRITE_PX`), per-enemy `artPx`, boss `116`px — tune so relative scales read right
  (a boss should dwarf a shade) and nothing clips its tile.
- **Palette unify:** one final pass so terrain, creatures, projectiles, and UI share a coherent palette
  (the PixelLab outputs drift slightly warm/cool — nudge in post with the Pillow toolchain if needed).
- **Projectile pixelization:** Zeus bolt / Apollo arrow / Poseidon splash as small pixel FX or tinted
  particles to match (currently drawn shapes) — low priority, the drawn FX read fine.
- **Per-tier upgrade art hook** (deferred, big): leave the `(god, path, tier) → spriteBaseKey` seam so
  upgraded towers can swap sprites BTD6-style later (`DirAnimSprite` already keys off a `base` string).

---

## Suggested build order (each ships green, verify in preview)
1. **A3 backdrop juice** (pure Phaser, $0, immediate "alive" win, zero art dependency).
2. **A1 terrain tileset** + **A2 obstacle objects** (PixelLab; biggest static upgrade; fallback-guarded).
3. **B2 Tailwind pixel theme** + **B1 UI icons/font** (HUD cohesion).
4. **B3 title screen.**
5. **C cohesion/scale/palette sweep** + projectile polish.

## Critical files (when built)
- `src/game/scenes/GameScene.ts` (tilemap + object sprites + backdrop layers/particles; reuse `burst()`,
  tween, `cameras.*`), `src/game/scenes/PreloadScene.ts` + `manifest.ts` (already glob `sprites/*` — tiles
  and UI ride along), `src/core/map/{path,obstacles}.ts` (unchanged data; only rendering swaps).
- `src/ui/hud/{TopBar,RightRail}.tsx`, the modals, `src/index.css` / theme tokens, new
  `src/ui/screens/TitleScreen.tsx`, `src/state/gameStore.ts` (`gamePhase`).
- New assets: `sprites/tile_*.png`, `sprites/obj_*.png`, `sprites/ui_*.png` (+ optional pixel font).
- Reuse: `scripts/pixlab_import.sh` (extend or add a tiles/UI variant), the Pillow prep, the
  sprite-with-fallback pattern, `docs/pixel-pipeline.md`.

## Verification (when built)
`npm run build && npm run test && npm run lint` green per step. In-preview: backdrop animates without
tanking the heavy-wave frame budget; terrain/objects render with shape fallbacks intact; HUD reads as
pixel-cohesive; title screen gates the run; a full run "looks like a finished game." Then the human
taste sign-off (the user is art director).
