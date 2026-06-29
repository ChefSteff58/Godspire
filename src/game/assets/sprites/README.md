# Sprite drop-zone

Drop transparent **PNG** art here and it appears in the game automatically — no code changes.

## How it works

`../manifest.ts` globs this folder at build/dev-server time. Any `*.png` whose filename matches
a known **key** is loaded by `PreloadScene` and rendered in place of its placeholder shape. Until a
key's PNG exists, the game draws its current shape, so art can land **one creature at a time** and
nothing ever breaks.

## Naming = the key (exact, lowercase, `.png`)

| Group | Keys (filename without `.png`) | Drawn at (px, longest side) |
|---|---|---|
| **Gods** (towers) | `zeus` `apollo` `demeter` `hermes` `hephaestus` `poseidon` `aphrodite` `athena` | ~32 |
| **Enemies** | `shade` `skeleton` `harpy` `talos` `hydra` `satyr` `gorgon` | matches its disc (18–34) |
| **Bosses** | `nemean` `minotaur` `cyclops` | 52–64 |
| **Projectiles** | `proj_apollo` `proj_hermes` (optional) | ~16 |

Examples: `zeus.png`, `harpy.png`, `nemean.png`.

## Art rules (for a cohesive set)

- **Transparent background** (alpha PNG). If your tool exports a flat background, the prep step
  (`rembg` / ImageMagick) removes it — the agent handles that during integration.
- **Square-ish, centered** subject, facing/readable from a top-down view.
- Generate **larger than needed** (512–1024px); the engine scales down crisply.
- Keep one **consistent cartoony style** across the whole set (the "style anchor" workflow in Stage 3).

After dropping files, the dev server hot-reloads; a hard refresh guarantees Phaser re-preloads them.
