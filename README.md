# Godspire ⚡🏛️

A witty-heroic **Greek-mythology roguelike tower defense** for the browser. Command the
gods to defend Mount Olympus against the monsters storming up from Tartarus — across
escalating runs, drafting gods and boons from the Fates.

> Status: **Milestones 3–6 done** — a full, playable roguelike with bosses. The run loop (costed
> placement, gold economy, ~100 lives, endless clear-gated waves, the Fate Draft of ~20 boons,
> Play-Again banking Favor); the **7-enemy roster** (swarm/baseline/flying/armor/splits/fast/stealth,
> each with one crisp counter); the **8-god roster** with 2×3 upgrade paths each — Zeus, Apollo,
> Demeter (money farm), Hermes (mobile anti-air), Hephaestus (spike factory), Poseidon (water AoE +
> knockback), Aphrodite (slow field), Athena (buff aura + detection); a **Type-Carried Hybrid**
> difficulty curve (composition drifts toward stronger types, gentle HP, every-10th elite surge); and
> **3 cycling bosses** every 20 waves — Nemean Lion (damage cap), Minotaur (charge + CC-resist),
> Cyclops (bursts into adds), each scaling per recurrence — plus a rich **end-of-run stats screen**.
> Click-to-place + sell + auto-start + target priority. 128 unit tests. Next up: the Pantheon
> skill-tree UI (M6.5) and the Supabase leaderboard (M7).

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
