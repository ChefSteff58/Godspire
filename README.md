# Godspire ⚡🏛️

A witty-heroic **Greek-mythology roguelike tower defense** for the browser. Command the
gods to defend Mount Olympus against the monsters storming up from Tartarus — across
escalating runs, drafting gods and boons from the Fates.

> Status: **Milestone 3 done + run-loop polish** — the roguelike run loop (costed placement, gold
> economy, ~100 lives, endless clear-gated waves, the Fate Draft, Play-Again banking Favor), now
> with **drag-and-drop placement**, an **auto-start** toggle, and a **20-boon draft pool** (rarity-
> weighted, with gate shields / second wind / coin-flip gambles and soft-capped stacking). The
> 8-god roster + boon design are locked ([docs/design](docs/design/roster-and-boons.md)). Next up:
> the enemy roster (M4) — then the gods, built in the order that design doc prescribes.

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

## Cloud save (Supabase) — optional, app works without it

The game **boots and saves locally with no setup** (guest mode, localStorage). To enable
cloud save + cross-device accounts + the leaderboard, set up Supabase once:

1. Create a project at [supabase.com](https://supabase.com) → **New project**.
2. **Authentication → Sign In / Providers**: turn ON **Allow anonymous sign-ins**.
3. **Authentication → Settings**: turn ON **Allow manual linking** (needed for guest → account).
4. (Optional) Enable the **Google** provider, and under **URL Configuration → Redirect URLs**
   add `http://localhost:5173` and `https://godspire.vercel.app`.
5. **SQL Editor → New query**: paste and run [`supabase/schema.sql`](supabase/schema.sql).
6. **Project Settings → API**: copy the **Project URL** and **anon/public** key (never the service key).
7. Put them in `.env.local` (copy from `.env.example`) and in Vercel → Settings →
   Environment Variables, then **redeploy**.

```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```
