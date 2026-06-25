# Godspire ⚡🏛️

A witty-heroic **Greek-mythology tower defense** for the browser. Command the gods to
defend Mount Olympus against the monsters storming up from Tartarus.

> Status: **Milestone 0** — project scaffold + a blank Phaser canvas wired to React.

## Tech stack

- **Vite + React + TypeScript + Tailwind** — UI, menus, HUD, shop.
- **Phaser 3** — the game canvas (rendering, animation, particles, input).
- **Zustand** — the bridge between Phaser (simulation) and React (UI).
- **Supabase** — the global leaderboard (added in Milestone 7).
- Deploys on **Vercel**.

## Architecture (one rule)

Game **logic** lives in `src/core` and imports **nothing** from Phaser/React/Zustand,
so it stays unit-testable and portable. A test (`tests/core-purity.test.ts`) fails the
build if that boundary is ever crossed.

```
src/
  core/    pure game logic & types  (no phaser/react/zustand)
  game/    Phaser scenes + config   (renders core)
  state/   Zustand store            (the bridge)
  ui/      React screens + HUD      (shows UI, sends intents)
  lib/     integrations (Supabase)
```

Data flow: Phaser owns the loop and writes mirrored values to the store; React reads
them for the HUD and enqueues commands the GameScene drains each frame.

## Run it locally

```bash
npm install
npm run dev      # http://localhost:5173
```

Other scripts:

```bash
npm run build    # typecheck + production build
npm run preview  # serve the production build locally
npm run test     # run unit tests (incl. the architecture guard)
npm run lint     # oxlint
```

## Environment

Copy `.env.example` to `.env.local` and fill in Supabase values when you reach the
leaderboard milestone. Not needed before then.
