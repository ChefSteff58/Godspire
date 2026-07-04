# OPERATION: Full Review Fleet + Clean Sweep (PLANNED 2026-07-03 — execute on approval)

## Context
M0–M10 are shipped (`bb529f3`); the game is feature-complete through the cinematic pass with 216 tests green.
The user ordered: (1) a full multi-agent review fleet — design, taste, functionality, tuning, economy, UI, UX,
plus dedicated fun-testers who actually play; (2) a clean sweep of this plan file (collapse shipped history,
fix factual drift, kill duplication); (3) a codebase tidy; (4) new milestones designed (no new characters —
that's tonight's separate art run). **User grants:** fleet may RE-TUNE BALANCE FREELY (judged in a playtest
after); bugs/copy = fix minor, elevate major. **Interview answers locked:** new roadmap = Fate Draft 2.0 →
Deep Upgrade Economy → Audio → Home-base Hub (no second map for now); fun-testers hunt everywhere; plan
history = collapse + archive verbatim to the repo.

Pre-flight findings (3 explorer surveys, complete):
- **Codebase is already clean**: no dead exports, no TODOs, no orphaned assets; the pointInPoly duplication in
  water.ts is deliberate cycle-breaking. Tidy items: gitignore `.DS_Store`, delete superseded `docs/bg-ui-plan.md`,
  move `docs/overnight-goal.md` → `docs/design/execution-logs/`. GameScene.ts (2,503 LOC) is large but organized —
  do NOT split it this pass.
- **Copy is near-production**: all numeric claims verified against data (zero mismatches). Known drifts: "Gate
  Wards" node vs "gate shields" everywhere else; "Ranks" buttons vs "Leaderboard" heading; skill-tree node copy
  dryer than god/boon voice. Olive lore stays silent about the Athena easter egg ON PURPOSE (it's an easter egg).
- **Plan file**: ~1,193 lines; the v1.0 scope table is badly stale (says 6 gods/2 bosses/20 waves; 8 gods/3
  bosses/endless shipped; Ares/Artemis never built — Hermes/Poseidon were); Satyr/Gorgon/Cyclops listed as
  deferred but SHIPPED; three.js verdict + dev-cheats + purity rule each appear 2-3×. Target ≈350 lines.

## Stage graph

**Stage 0 — Captures (one agent, owns the browser).** Boot the preview once and produce a canonical screenshot
set into the scratchpad: title, early field, mid-run field (~w12 with towers), draft modal, Pantheon, Ranks,
inspector open, run-over, wave-20 boss. Visual reviewers consume FILES — never the live browser (single-server
contention was the M10-S5 lesson).

**Stage 1 — Review fleet (Workflow; parallel).**
- *Reviewers* (one agent each, findings schema below): **design/identity** (composition, readability, cohesion —
  from captures), **taste/copy** (tone-upgrade proposals seeded with the audit's flagged items), **functionality
  ×3** (core sim math; GameScene lifecycle/render; state/persistence/Supabase), **UI** (hierarchy, consistency,
  affordances), **UX flows** (title→run→death→again, draft, Pantheon discoverability, hover/selection affordances).
- *Tuning/economy simulators ×4* (headless, fully parallel — they import PURE CORE modules via scratchpad
  vitest/tsx scripts, no browser): **S1 economy curve** (waveIncome+bounties vs cost-to-survive: required DPS from
  waveSpec HP totals vs purchasable DPS/gold), **S2 upgrade value table** (damage-per-gold per god×path×tier via
  towerEffectiveStats — flag dead/outlier upgrades), **S3 boss fairness** (boss EHP with damageCap clamp vs
  realistic board DPS at w20/40/60/80), **S4 boon+Pantheon EV** (BOON_POOL / PANTHEON_NODES value spread).
  Outlier = >2× value spread between comparable options, or a curve crossover (income can't buy required DPS).
- Findings schema: `{dimension, file, line?, summary, evidence, severity: minor|major|tuning, proposedFix?,
  beforeAfter?}`.

**Stage 2 — Fun-tester fleet (4 archetypes, browser SEQUENTIAL).** Each plays a REAL run — real ledger, no
cheatGold (placement via scene.placeTower + store intents; auto-flow on):
- **A balanced-meta** (mixed comp, obeys telegraphs) — real-time via MessageChannel pump;
- **B single-choke stacker** — fast via devStep batches;
- **C Demeter economy rush** — fast via devStep;
- **D novice/chaos** (ignores counters, spreads thin) — real-time (fairness + feedback read).
Per wave they record lives lost, gold slack, decision made; caps: wave 30 or ~20 min, then devStep to w40 for
longevity. Exit questionnaire: hook moment, tension curve, dead time, agency in drafts, clarity of failure,
one-more-wave pull, 3 unfun moments, 3 delights. Real-time runs judge juice/readability; devStep runs judge
pacing/economy/fairness.

**Stage 3 — Verify + classify (parallel).** Adversarial verification per finding (refute-first, majority kills);
dedupe by file+summary; classify minor-fix / tuning-change / major-elevate. Tuning changes must carry sim-backed
before/after numbers.

**Stage 4 — Fix waves (serialized by file-cluster to avoid conflicts).** Cluster integrators: (a) core data +
tuning numbers, (b) GameScene.ts, (c) UI components + copy, (d) docs/config tidy (.DS_Store, bg-ui-plan.md,
overnight-goal.md move). Gate per cluster: `tsc --noEmit` + `vitest run` + `lint` + a targeted preview probe.
Tuning applied freely per the user's grant; majors NOT applied — written up with recommendations.

**Stage 5 — Plan clean sweep (this file).** Archive the current file verbatim → `docs/design/plan-archive-2026-07.md`
(commit it), then rewrite to ≈350 lines: vision + roguelike pivot (kept), architecture + conventions (single
copy), shipped-roadmap table M0–M10 with real git hashes, corrected live backlog (Satyr/Gorgon/Cyclops = shipped;
heroes/Medusa/T4-T5/Demeter-redesign/audio/hub = open), the NEW ROADMAP below, safeguards + QA protocol (kept,
deduped), references (pixel-pipeline.md, design docs). Kill: stale v1.0 scope table, duplicate verdicts,
step-by-step instructions for shipped work.

**Stage 6 — Digest + ship.** Full verify (build+tests+lint), per-stage commits + push, then the user report:
fixed-minor list, tuning before/after table, elevated-majors with recommendations, fun-tester verdict summary,
and fresh captures for the post-tune playtest gate.

## The new roadmap (locked order; full designs drafted during Stage 5)
- **M11 — Fate Draft 2.0:** "Tempt the Fates" reroll (1/run), per-god boons for all 8 gods (pool 6 → ~20),
  rarity weighting, and the Fate Bargain set-piece (curse-for-reward gamble at milestone waves) — the original
  gambling vision, buildable on the existing rarity-card modal.
- **M12 — Deep Upgrade Economy:** T4/T5 ultimates with real NEW BEHAVIORS per path (Zeus true storm, Apollo
  burn lance, Poseidon whirlpool, Hephaestus turret forest…), exponential cost re-curve, Demeter farm redesign
  (bank/cluster synergy, capped), money-sink audit. Pairs with per-tier art (ascension pipeline from tonight).
- **M13 — Audio:** WebAudio manager honoring timeScale/pause; per-god cast SFX, hits/deaths/leaks/UI/draft/boss
  roars; title + run music with intensity layers; mute/volume; sourcing decided at milestone planning (<$100 rule).
- **M14 — Home-base Hub:** the title grows into a BTD6-style hub — Play, Pantheon, Ranks, lifetime-stats
  Chronicle, Settings (speed default, reduced motion, colorblind, volume) — extensible for heroes/maps/daily later.

## Verification
Per-stage gates as above; finals: full suite green, Vercel deploy check, fresh field captures for the user's
playtest verdict on the fleet's tuning. NOTE: the session usage cap resets ~9:50pm tonight — if fleet agents
stall on the cap, resume after reset (state survives in per-stage commits + the workflow journal).

---

# Godspire — Greek Mythology Tower Defense (v1 Build Plan)

*Name locked with the user: **Godspire** = "gods" + "spire" (a spire is a tower — the genre is baked into the name). Optional subtitle for clarity: "Godspire — A Greek Tower Defense."*

## Context

This is the user's **first browser game**. The user is an experienced-enough web dev (ships React/Vite/TS/Tailwind on Vercel + Supabase in production) but a game-dev beginner. For *this* project their role is **orchestrator / game designer**; an AI coding agent (Claude) does the heavy-lifting coding across many sessions. The goal is a **fun, finished, shareable** tower-defense game heavily inspired by Bloons TD 6 — and to learn how everything fits together along the way.

The vision was locked through interview: a **Greek-mythology** TD with a **witty-heroic (Percy Jackson) tone**, where you command the **gods** to defend **Mount Olympus** against monsters storming up the path from **Tartarus**, with a **boss every 10 waves** and a **Supabase leaderboard**. The enemy design solves the user's original concern ("intuitive like Bloons, not just different humans"): a tight monster roster where each enemy has **one crisp property** mapping to an **obvious counter** (flying→anti-air, armored→Ares, stealth→detection, splits→AoE).

A multi-agent design pass produced a full GDD, technical architecture, build roadmap, and AI-art pipeline. A pre-mortem then flagged the central risk: the docs are *too complete*, and "it's all data-driven" hides that authoring 8 enemies × 8 towers × 16 upgrade paths × 30 waves × 3 bespoke bosses is most of the actual work — the part a solo orchestrator+agent is worst at *finishing*. **Intended outcome of this plan:** ship a lean, complete, shareable v1.0 first, treat the full GDD as a backlog, and bake in the safeguards (dev tooling, a "is it fun?" gate, an enforced architecture boundary) that keep a first game from stalling.

---

## Locked vision (decided with the user)

- **Genre/inspo:** Tower defense, Bloons TD 6 lineage, browser-based.
- **Theme/tone:** Greek mythology; witty & heroic (Percy Jackson) — epic stakes, gods with personality, monsters get a wink.
- **Frame:** Tartarus's seal breaks; monsters march one winding path from the Underworld (bottom) up to the gates of Mount Olympus (top = the player's lives). Verticality reads as "storming the gods."
- **Towers = gods (+ heroes later).** **Enemies = a tight, glanceable monster roster.** **Boss every 10 waves.**
- **Upgrades:** simplified BTD6 — two specialization paths per tower.
- **Leaderboard:** Supabase, ranked by **highest wave survived**.
- **Art:** AI-generated sprites (Midjourney), **placeholder-first** so code is never blocked.

---

## ⚡ Core-loop pivot — ROGUELIKE (locked 2026-06-28)

After M2.5 playtests, the core pivoted from a fixed campaign to a **roguelike** (the BTD6-style fixed campaign is demoted to a later add-on). Reorients M3+ but **reuses everything built** (gods, placement, map, core loop, and the M0.5 skill tree as the meta).

- **A run:** escalating, partly-procedural waves.
- **Between waves — the Fate Draft:** pick 1-of-N to draft **Gods** (which deities you can field this run = your "deck") + **Boons/upgrades** (run buffs + god upgrade choices).
- **At milestones — a Fate Bargain:** a dramatic risk/reward set-piece (take a curse/harder challenge for a big reward) = the gambling.
- **Persistent meta:** the Pantheon skill tree (Favor) across runs (built in M0.5).
- **Power fantasy** via tasteful spectacle (a restrained "Hand of God" active layer is a candidate, TBD).
- **Shelved-but-loved future candidates:** Pantheon Constellations (adjacency synergies), Threat-choice drafting, Relics, Patrons, full Loom-of-Fate, the fixed campaign as an add-on.

**Roadmap impact (detailed re-sequence pending when M3 is planned):** the systems the milestone table below describes (economy, lives, enemy roster, god roster, 2×2 upgrades, leaderboard) all still apply — but the *framing* shifts from "campaign" to "run," and M3 builds the roguelike **run loop** (economy/lives/waves + win-lose + the Fate Draft scaffold) rather than a fixed campaign.

---

## Tech stack & architecture

**Stack:** Vite + React + TypeScript + Tailwind (UI/menus/HUD/shop — the user's existing stack) · **Phaser 3** (the game canvas: rendering, animation, particles, input) · **Zustand** (the bridge) · **Supabase** (leaderboard) · deploy on **Vercel**.

**The one rule everything rests on:** game **logic** is framework-agnostic TypeScript that imports *nothing* from Phaser/React/Zustand. Phaser only renders + reads input. React only shows UI. Zustand only mirrors state and queues player intent. This keeps logic unit-testable and lets the agent build one system per session without cross-contamination.

**Project structure (to be created in a fresh `godspire/` app):**
```
src/
  core/            # ── pure TS game logic; ZERO phaser/react/zustand imports ──
    types.ts  GameEngine.ts  EventBus.ts
    systems/       PathSystem  WaveManager  TowerManager  targeting  ProjectileSystem  EconomySystem  StatusSystem
    data/          towers.ts  enemies.ts  waves.ts  balance.ts   # the "design spreadsheet" as code
  game/            # ── Phaser: renders core, no game logic ──
    PhaserGame.ts  config.ts  scenes/{Boot,Preload,Game}Scene.ts  entities/*Sprite.ts  render/{SpriteRegistry,effects}.ts
  state/           gameStore.ts (Zustand)  commands.ts  selectors.ts
  ui/              screens/*  GameCanvas.tsx  hud/{Hud,ResourceBar,Shop,TowerInspector,WaveControls,GameOverModal}.tsx
  lib/supabase/    client.ts  leaderboard.ts
public/assets/     sprites/{gods,heroes,enemies,bosses,projectiles,fx}  maps  audio  ui
```
Dependency flow is one-directional: `core` ← `game`/`state`; `state` ← `ui`. **Critical files:** `src/core/GameEngine.ts` (owns systems), `src/core/systems/targeting.ts` (the counter matrix — pure + tested), `src/game/scenes/GameScene.ts` (the *single* owner of the game loop), `src/ui/GameCanvas.tsx` (the Phaser↔React mount).

**Known integration gotchas (handle on day one, not at the end):**
- **React StrictMode double-mounts Phaser** → **disable StrictMode around the game canvas** (lower-risk default than relying on a guard every session) + always `game.destroy(true)` on unmount.
- **One clock only:** Phaser's `update` drives the sim; React never runs simulation. React→Phaser = a **command queue** drained at frame start; Phaser→React = **mirrored reads** via store setters. Engine holds authoritative gold/lives; Zustand mirrors.
- **Clamp/fixed-accumulate the timestep** so a tab-switch delta spike can't teleport an enemy past three towers.
- Never store Phaser objects in Zustand (keep them in a plain `SpriteRegistry` map keyed by entity id).
- HUD overlay = `pointer-events:none` root, `auto` only on real buttons, so clicks fall through to the canvas.

---

## Scope decision: ship a lean v1.0 first (recommended)

The user picked "Standard" scope. **Recommendation: keep the Standard vision as the destination, but ship a trimmed v1.0 first** — same architecture, ~half the content surface, none of the riskiest mechanics. Every cut item has a clean v1.1 slot, so this is *sequencing, not cutting*.

| Area | **v1.0 (first shippable)** | **Deferred → v1.1+ backlog** |
|---|---|---|
| Gods | All **6** (Zeus, Apollo, Ares, Artemis, Demeter, Athena) | — |
| Upgrade trees | **2 paths × 2 tiers**, one signature mechanic per god, rest are stat-tweaks | Tier-3 "win-condition" effects (storm, execute, refund auras, petrify-immunity) |
| Heroes | **none** | **Perseus** then **Kratos** (kits locked below; v1.1); **no hero leveling in v1** |
| Enemies | **6**: Shade (swarm), Skeleton (baseline), Harpy (flying), Talos (armor), Gorgon-kin (stealth), Hydra (splits) | Satyr (fast) + Cyclops (tanky) — mostly stat knobs, least new counter-thinking |
| Bosses | **2**: Nemean Lion (W10), Minotaur (W20) | **Medusa deferred** — her rotating tower-disable cone is the hardest-to-make-fair mechanic and is coupled to Athena Path B |
| Campaign | **~20 waves** + a simple endless multiplier loop | 30 waves, endless minibosses, multi-variable scaling |
| Economy | Demeter **Path A only** (flat gold/wave) | Demeter Path B (per-kill/synergy auras) |
| Keep regardless | Economy, lives, shop, **upgrade panel**, win/lose, **Supabase leaderboard**, one map | — |

This trimmed v1.0 is still a **complete, strategic, shareable TD**. The full GDD/roster/30-wave script become the content backlog, not the ship gate.

### Heroes (designs locked — scheduled for v1.1)

Both are **single-instance** premium units with a clickable **ultimate**; **no leveling in v1**. Kept distinct/original designs (Kratos = the Greek personification of Strength, not anyone else's character).

- **Kratos — The Wrath** (tanky melee rage-bruiser; the frontline "wall + cleaver"). Plant at the front: blocks/holds enemies and cleaves with twin chained blades, building a **Rage** meter as he deals/takes damage (full Rage spikes attack speed + damage). **Paths:** *A — Spartan Fury* (faster Rage, higher cleave DPS, lifesteal-style ramp) · *B — Aegis of Wrath* (holds more enemies, taunts, damage reduction, shorter ult cooldown). **Ultimate "Rage of Sparta":** brief frenzy — whirling chained-blade AoE spin with knockback/stun + a burn; built to interrupt the Minotaur charge and clear swarm spikes.
- **Perseus — The Slayer** (single-target deleter / boss-killer; petrify). Medium range, heavy single-target; attacks build **petrify** stacks (slow → freeze on non-bosses). **Paths:** *A — Gorgoneion* (faster petrify, can fully freeze non-bosses) · *B — Demigod* (raw single-target, +% vs bosses/elites, ignores armor). **Ultimate "Gaze of the Gorgon":** aimed cone — non-bosses petrify (frozen, take 2× damage); bosses slowed + big burst + a "+damage-taken" window. Stacking Apollo/Ares into that window is the intended **boss-melt combo**.

---

## Build roadmap (milestones — each ends in something you can open in a browser)

- **M0 — Scaffold & "Hello, Olympus" deploy.** Vite+React+TS+Tailwind+Phaser+Zustand; the folder architecture above; a blank Phaser canvas in a React shell, wired to Vercel auto-deploy. *Playtest: load the live URL on your phone; `npm run dev` works for you unaided.* **✅ DONE (live at godspire.vercel.app).**
- **M0.5 — Persistence Foundation (guest save + meta-progression model).** Supabase **guest-first** auth (anonymous; optional one-tap link to email/Google, same account kept), the reconciled schema live, a save/load service, a minimal account UI, and the leveling + skill-tree **data model** wired so save data "just works." The full skill-tree UI/content is deferred to M6.5 (detailed section below). *Playtest: play as guest → progress survives a refresh; link an account → syncs across devices; with no env vars set → still boots and saves locally.*
- **M1 — One enemy walks the path.** Map background + waypoint polyline (path is **data**, not baked into art); a placeholder blob marches Underworld→Olympus. *Playtest: does the path read well and the pace feel like a marching threat?*
- **M2 — One god kills one enemy (THE CORE LOOP).** Place Zeus, range circle, auto-target, projectile, damage, death. **Ship the targeting-debug overlay here** (target id, range, can/can't-hit + why). *Playtest: 2–3 dedicated rounds — if shoot→hit→die isn't satisfying, fix it before anything else.*
- **M2.5 — Map & Feel Pass.** Research-backed flat top-down map (the "Tartarus Switchback" — 5 bends incl. a hairpin + a doubleback; enters bottom-left → Olympus top-right); **dead zones** (no building on the track — fixes the current bug — + 4 Greek obstacles); a **right-side tower rail** (off the map) + **fast-forward (3× = BTD6 baseline)**; **Apollo** (pierce god + the reusable traveling-projectile system); and **hit/HP juice** (damage-state color + shrink, pop on hit, burst on death). Detailed section below. (Pulls M3's speed controls + placement rules forward.) *Playtest the projectile feel (Apollo) + placement.*
- **M3 — The Roguelike Run Loop.** Costed placement (gold from kills + flat wave income), ~100 lives (leak → lives, with mandatory leak juice), **endless escalating waves** via a clear-gated phase machine, and the first **Fate Draft** (boons, every 3–5 waves) → run-over + Play Again, banking Favor by highest wave. Ships the *framework*; god-draft / interest / per-god boons defer to M5. **2 dev cheats** (+1000 gold, Invincible). Speed controls + placement rules already landed in M2.5. **Detailed section below.** *Playtest: is the economy tense, does losing feel fair, is the draft fun?*
- **🚦 M3 KILL-GATE (hard yes/no):** With 3 gods, 4 enemies, 5 waves — *do you personally want to play it again right now, unprompted?* If no: fix the loop or stop. Do **not** proceed to add content on an unproven loop.
- **M4 — Enemy roster & properties (RISKIEST).** Ship the **5 enemies whose counters are built** (Shade swarm · Skeleton baseline · Harpy flying · Talos armor · Hydra splits) as **data-driven traits**, **one at a time** on a teaching-wave schedule, Hydra **last**. **Defer** Gorgon-kin (stealth — no detector built), Satyr (fast — no slow built), Cyclops (tanky — redundant with Talos) until their counter-gods land. Flying = `canHitAir` gate (Apollo only); **flat armor** = `max(1, dmg−armor)`; splits = pure `onDeath→SpawnDesc[]` (depth-capped) spawned **before the clear-gate**. Generalize the spawn pipeline to multi-kind wave **groups**. Detailed section below. *Playtest: can you read each enemy's threat at a glance, and does each counter feel obvious?*
- **M5 — The full god roster (5 new gods + their engine primitives) (2nd-riskiest).** The upgrade engine + 3 gods already shipped (M5-start). Build the remaining **5 gods one at a time**, each introducing ONE new engine primitive and (where applicable) landing with the deferred enemy it unlocks: **Hermes** (mobile/anti-air) → **Hephaestus** (deployables) → **Poseidon** (AoE + knockback) → **Aphrodite** (slow/freeze, unlocks Satyr) → **Athena** (aura buff + detection, unlocks Gorgon-kin); plus **chain** for Zeus Path A and a Zeus anti-air upgrade tier. Detailed section below. *Playtest after each god: is it distinct, are the two paths a real choice?*
- **M6 — Campaign: ~20 waves + 2 bosses + win/lose.** Wave script as data with teach-by-wave pacing; boss framework (Nemean Lion damage-type resist @10; Minotaur charge+speed-up @20); inter-wave build phase; victory screen; **end-of-run stats dump** (where you lost lives, what you never bought) for tuning. *Playtest: beatable-but-hard, fair boss spikes?*
- **M6.5 — The Pantheon Tree (skill-tree content + UI).** Now that runs award Favor, build the full node content (war/harvest/wisdom branches + prereqs/tiers), the interactive tree UI, and `canUnlock`/`unlockNode`; balance node costs/effects against real runs. (The data model + `deriveModifiers` shipped in M0.5, so this is additive data + a React component.) *Playtest: leveling feels rewarding; a node visibly changes a run.*
- **M7 — Endless + Supabase leaderboard.** Simple post-campaign HP/count multiplier loop; track highest wave; submit to the `scores` table (created in M0.5) with name entry on death; leaderboard view; guests prompted to link before posting; graceful offline/failed-submit. *Playtest live with a friend to confirm it's truly global.*
- **M8 — Juice, AI-art pass, ship.** Swap placeholders → real sprites (pure asset overwrite, no code change); particles/screen-shake/SFX/music + mute; title screen + basic how-to-play tooltips; mobile touch + perf pass; final deploy. *Final taste sign-off.*

**Phasing intent:** M0–M3 = *prove it's fun* (fast, willing to rework the loop). M4–M6 = *make it a game* (heavy balancing). M7–M8 = *make it shippable* (hook + polish).

---

## Milestone 0.5 — Persistence Foundation (detailed)

**Why now:** the user wants save data, account leveling, and a BTD6-style skill tree. Persistence is plumbing that's painful to retrofit and Supabase is already in the stack, so we lay it now — but only the *foundation + data model*; the skill-tree content/UI is deferred to M6.5 (a buff tree is meaningless before the core loop is fun). Sign-in is **guest-first**: instant cloud save via Supabase anonymous auth, optional upgrade to a real account, no sign-in wall. A multi-agent design pass + security pre-mortem produced and then reconciled/trimmed this design.

**Architecture (respects the `src/core` purity rule — `core` imports no supabase/react/zustand):**
- `src/core/progress/` — PURE: `types.ts` (`PlayerProgress`, `RunResult`, `SkillNode`, `NodeEffect`, `Modifiers`), `rules.ts` (`xpForLevel`, `levelForFavor`, `applyRunRewards`, `deriveModifiers`, `mergeProgress`, `migrateProgress`), `skillTree.ts` (2–3 placeholder nodes).
- `src/lib/supabase/` — `client.ts` (+ `isSupabaseConfigured`), `auth.ts` (`ensureSession`, `linkEmail`, `linkGoogle`, `updateDisplayName`, `signOut`, `subscribeAuth`).
- `src/lib/persistence/` — `localCache.ts` (write-through localStorage), `progressRepo.ts` (`loadProgress`/`saveProgress` — **dumb upsert on key events with an `updated_at`-not-going-backwards guard; NO debounce/queue engine**).
- `src/state/sessionStore.ts` — Zustand slice mirroring `{ user, isGuest, displayName, progress, syncState }`; intents `boot`, `applyRun`, `getModifiers`, `setDisplayName`, `linkEmail/linkGoogle`, `signOut`.
- `src/ui/account/` — `AccountBadge.tsx` (guest chip + "save your progress" CTA) + `AccountPanel.tsx` (display name, email magic-link, Google). Mounts top-right of the HUD; `pointer-events` handled.
- `tests/progress-rules.test.ts` — densest coverage on `mergeProgress` + `migrateProgress`.

**Reconciled Supabase schema (one canonical `supabase/schema.sql`):**
- `profiles` — `id uuid pk → auth.users`, `display_name`, `is_anonymous`, timestamps. **Name + guest flag live here only** (single source of truth).
- `player_progress` — `user_id uuid pk → auth.users`, `favor bigint`, `unlocked_nodes jsonb`, `settings jsonb`, `stats jsonb`, `updated_at`. **Do NOT store derived values** (level, available points) — derive from favor + unlocked_nodes.
- `scores` — leaderboard (created now, wired in M7): `id`, `user_id → auth.users ON DELETE SET NULL` (scores outlive deleted accounts), denormalized `player_name`, `highest_wave` (`check between 0 and 1000`), `mode`, `created_at`.
- **RLS:** profiles/player_progress owner-only (`auth.uid() = id/user_id`); scores public-read + insert-own. **Trigger** `handle_new_user` (security definer, `search_path=public`) auto-creates the profiles + player_progress rows on signup; a second trigger keeps `profiles.is_anonymous` synced on link. **The DB trigger is the SOLE writer of the guest flag** (client never writes it).

**Auth flow:** on boot `getSession()`; if none → `signInAnonymously()` (guest). `onAuthStateChange` is the source of truth (never `await` supabase calls inside it). Upgrade keeps the same `user.id` so all rows carry over: email via `updateUser({email})`, Google via `linkIdentity({provider:'google'})`. Offer `signOut` only to linked accounts.

**Meta-progression model (built now, tree deferred):** runs award **Favor** (lifetime meta-XP) → **account level** (`xpForLevel`, mild quadratic) → **Knowledge Points** (= `level − 1 − spent`, *derived, not stored*). Points buy permanent account-wide buffs in the **Pantheon Tree** (branches war/harvest/wisdom + unlock-a-god). `deriveModifiers(unlockedNodes)` is a generic fold → run-start `Modifiers` (startingGold, startingLives, towerDamage×, …) the engine reads at run start. **Ship now:** types, the 6 pure functions above, ~2–3 prereq-free placeholder nodes, and 3 observable modifier kinds — enough to round-trip a save end-to-end. **Defer to M6.5:** full node content, prereq/tier graph, `canUnlock`/`unlockNode`, the tree UI, `unlockGod` wiring, balancing.

**Must-fix correctness rules (from the pre-mortem):**
- `mergeProgress` = last-writer-wins by a **single-clock** `updated_at` (client sets it; DB stores verbatim — no auto-overwrite); take the whole `unlocked_nodes` set from the newer side; monotonic-max ONLY on independent lifetime counters (`favor`, stats); recompute `level` from merged favor. **Never union `unlocked_nodes`** (it resurrects spent points). Densest tests here.
- `migrateProgress` must **never throw** — coerce any partial/corrupt/hand-edited row to a valid `PlayerProgress`, else fall back to empty.
- Lean `RunResult = { waveReached, victory, kills }` (boss/god-variety favor terms deferred — those systems don't exist yet).
- **No sync engine** (no mid-run writes exist yet): upsert on run-end / link / name-change with the `updated_at` guard (also covers multi-tab + clock skew cheaply).
- Inherent + accepted: guest saves die on cache-clear, and client saves are editable (self-harm only) — mitigation is the "link your account" CTA, surfaced after the first run; real anti-cheat is an M7+ concern.

**Supabase setup handoff (user does it, guided):** create a Supabase project → enable anonymous sign-ins + manual linking + Google provider → set redirect URLs (`localhost:5173` + `godspire.vercel.app`) → run `schema.sql` → copy Project URL + anon key into `.env.local` and Vercel env vars (redeploy). The app **boots and saves locally with no env vars set** (`isSupabaseConfigured=false`), so coding is never blocked on this handoff.

**Verification:** unit tests green (esp. merge/migrate edge cases + `deriveModifiers([]) === BASE_MODIFIERS` + unknown-node-id ignored); guest → refresh → progress persists (local); with Supabase configured → a second browser after linking shows the same progress; a placeholder run increments Favor/level; the no-env-vars path boots with zero console errors.

---

## Milestone 2.5 — Map & Feel Pass (detailed)

**Why:** M2's core loop "feels clean," but the playtest flagged: enemies need a satisfying hit "pop" + intuitive HP; the bottom shop intrudes on the map (move right); the placeholder zig-zag feels tacky/"climbing a hill" (want flat top-down) and should be intentionally redesigned; start/end markers are weak; **you can currently build on the track** (a bug — `GameScene.canPlaceAt` has no path test); a clearer **pierce god (Apollo)** would make feel easier to judge than lightning; and we want **fast-forward**. A research pass (BTD6 difficulty tiers, TD path/turn theory, dead-zone schemes, hit/HP "juice") backs this. **Locked with the user:** right rail · damage-state HP + pop · Apollo. Polish/foundation milestone before M3 (economy/waves).

**1. New flat map — "Tartarus Switchback"** (`src/core/map/path.ts`; GameScene draw methods). Replace `OLYMPUS_PATH` with a researched single path that enters bottom-left, exits top-right, with **5 meaningful bends** including one **hairpin** and one **doubleback** (parallel top legs ~90px apart) — every bend curls *toward* open ground so the high-coverage build pockets sit on the concave inside of turns (opposite of the old zig-zag). Waypoints (logical px): `(-20,470) (230,470) (230,250) (470,250) (470,410) (700,410) (700,150) (430,150) (430,60) (980,60)`. **Flat top-down look** (no elevation gradient/iso): dim ember→ash flat terrain; road ~44px walkable over a ~56px darker buffer band. **Rethought markers** (bleed off-canvas as real gate art): **Tartarus rift** = layered concentric ellipses (maroon→crimson→hot) off bottom-left; **Olympus gate** = a gold pillared slab off top-right.

**2. Dead zones + the build-on-track fix** (`src/core/map/placement.ts` [new, pure+tested], `src/core/map/obstacles.ts` [new, data]). Pure `distToPolyline(p, path)` (reuse `PathSystem`'s clamped point-to-segment idea) + `canPlace(pos, footprint, towers, obstacles) → ok | {reason}`. Build is blocked inside the **path corridor** (`PATH_HALF_WIDTH(28) + footprint + buffer`), inside any **obstacle**, out of bounds, or too close to another tower (footprints). **4 Greek obstacle dead-zones** as data (ruined columns, boulder, **Styx pool** with a `terrain:'water'` hook for future Poseidon, olive grove) placed to force real decisions on the open Beginner map. Add `footprint` to `TowerStats`. Replace `canPlaceAt` with `canPlace`; **tint the whole ghost body red/green** (today only the ring is colored). Tests mirror `m1-path.test.ts`.

**3. Right rail + fast-forward** (`GameScreen.tsx`, `TowerShop.tsx`, `Hud.tsx`, `gameStore`, `GameScene.update`). Restructure `GameScreen` from an absolute overlay into **flex**: full-width **top bar** + a row **[ canvas 960×540 | right rail ~160px ]** so the rail can never cover the field. Move the shop into the vertical right rail. **Fast-forward**: `gameStore.timeScale` + a speed cluster **‖ / 1× / 2× / 3×** (3× = confirmed BTD6 baseline); apply `timeScale` to `dt` at the **top of `GameScene.update`** so spawn cadence, enemy advance, and cooldowns scale together deterministically (pause = 0).

**4. Apollo — pierce god + the projectile system** (`src/core/entities/projectile.ts` [new], `data/towers.ts`, GameScene, `TowerShop`, tests). Add **Apollo** (`GodKind 'apollo'`: long range, slower fire, higher damage, **pierces N**). Zeus stays hitscan lightning; Apollo introduces **traveling projectiles**: pure `Projectile` + `advanceProjectile` (move toward target each frame; on contact deal damage and continue through up to N enemies, then expire). GameScene gains a projectile list + small arrow sprites updated each frame. This is the reusable projectile foundation for the roster. Tests for advance + pierce.

**5. Hit feedback + intuitive HP** (GameScene fire/hit/`killEnemy`; a pure `hpTier`/color helper). **Damage-state circle-enemies:** fill color on a **heat ramp** (white-hot→gold→orange→crimson→ember) across ~5 HP tiers **+ slight radius shrink per tier** (redundant color+size+lightness = swarm-readable, colorblind-safe; the color-flip doubles as the hit cue); a thin **radial HP ring shown only while damaged**. **On hit:** white flash ~70ms + micro scale-punch ×1.1 (dial down today's 1.6) + 3–5 sparks. **On death:** 10–16 particle burst tinted the last HP color + scale ×1.35 + fade (build on the existing poof); optional ~50ms local hitstop. **No** per-hit screenshake/global hitstop (reserve shake for boss death / Olympus leaks).

**Deferred (research-flagged; hooks left in):** line-of-sight range occlusion (the real Advanced/Expert difficulty knob), multi-lane maps, the upgrade panel, water-typed gods (Styx `terrain` hook ready for Poseidon).

**Verification:** unit tests (`distToPolyline`/`canPlace` reasons; `advanceProjectile` + pierce; `hpTier` color/radius). In-browser: towers refuse the track (red ghost) + obstacles; the right rail never covers the map; Apollo arrows fly and pierce a line; enemies visibly degrade in color/size + pop on hit and burst on death; ‖/1×/2×/3× scales the whole sim; the rift + gate read as gates. Then a directed playtest round on projectile feel + placement.

---

## Milestone 3 — The Roguelike Run Loop (detailed)

**Why now:** M2.5 left a *sandbox* — you place gods and kill an endless trickle, but there are no stakes and nothing to come back for. M3 turns it into a **game you can lose and replay**: the roguelike run loop. **Locked with the user:** endless escalation (Olympus's lives hit 0 → run over → bank Favor by highest wave), **~100 lives** (generous/BTD6 feel), a **Fate Draft every 3–5 waves**. A multi-agent design pass (economy · waves · draft · wiring) + a pre-mortem produced this; the four sub-designs *disagreed* on ownership, costs, and HP-scaling — the resolutions below are the single source of truth. **Reuses what's built:** `sessionStore.getModifiers()` (skill-tree → run-start gold/lives/towerDmg) feeds run start; `sessionStore.applyRun({waveReached,victory,kills})` (already banks Favor + persists) feeds run end. No save-format or core-purity changes.

### Scope — ship the FRAMEWORK, defer the content (the pre-mortem's cuts)

- **Draft is boons-only; the run starts with BOTH gods unlocked.** With only Zeus + Apollo, a "god slot" is one binary toggle and the riskiest UI change (reactively hiding/disabling shop buttons). Cut it: keep the `{type:'god'}` arm in the `DraftOption` union (so M5 just flips it on) but **never emit it** in M3. Deletes the RightRail gating, the locked-shop UX, and the `unlockedGods` mirror from the critical path — and the draft still teaches the loop (pause → pick 1 of 3 → buff stacks).
- **6 boons, not 9** — only effects with one real wiring site: `+startGold`, `+startLives`, `+goldPerKill`, `×towerDamage` (global), `×godDamage` (zeus/apollo), `×fireRate`. **Defer** `buildCostMul` (3 wiring sites), `apolloPierceAdd`, and `zeusChainAdd` to M5 (the last is a *lie* today — `fireHitscan` hits exactly one target; there is no chain to add jumps to). Keep all effect kinds in the union; just don't author the deferred boons yet.
- **Flat wave income only — no interest in M3.** Interest rewards hoarding, which fights the "spend to survive" pressure we need to validate, and couples with the gold-per-kill number. Ship `waveIncome = FLAT_BASE + PER_WAVE·wave`; keep the interest constants in the file at rate `0` so the hook exists.
- **2 dev cheats:** **+1000 gold** and **Invincible toggle** (test economy + the late wall without dying). Defer jump-to-wave / spawn-enemy — `window.godspireScene` + `devStep()` already cover manual poking.
- **Leaderboard `scores` writes defer to M7** (decision, not oversight): `applyRun` writes `player_progress` only, and RLS blocks guest inserts to `scores` anyway. The run-over screen reads best-wave from `player_progress.stats`.
- **Run-in-progress persistence is OUT** — closing the tab abandons the current run; only meta-progress (`player_progress`) persists. (Resuming mid-wave would mean serializing enemy positions — correctly out of scope.)

### Architecture — ONE source of truth per system (resolved)

- **Ownership = a scene-side `RunController`** (`src/game/run/RunController.ts`), matching how `GameScene` already owns `enemies`/`towers` and only mirrors `kills`/`elapsed`. It holds the **authoritative** run state: `{ ledger.gold, lives, wave, phase, runStatus, activeBoons, runModifiers, draft }`. **React only sets intent flags**; the scene drives one `run.tick(dtSec)` **inside `update()` after the dt gate** (single clock — no `setTimeout`/`delayedCall`), and pushes **one batched** `mirrorRun({gold,lives,wave,phase,runStatus,…})` to `gameStore` per frame. **Never let two systems write gold/lives.**
- **Pure core (testable; no phaser/react/zustand):**
  - `src/core/economy/ledger.ts` — `createLedger(startGold)`, `canAfford`, `spend`, `earn`, `waveIncome(wave)` (flat: `WAVE_INCOME_FLAT_BASE=40 + PER_WAVE=8 · wave`).
  - `src/core/systems/waveManager.ts` — `waveSpec(n)` → a spawn script (kinds/counts/intervals). **Endless scaling (Wave doc wins — HP carries difficulty so the frame budget stays flat):** enemy **HP ×1.12^(n−1)** (compounding), **count ≈ 8 + 0.5·(n−1)** (linear), **speed ×(1+0.01·n) capped ~2×**. Shade-only for M3 (roster = M4). Consider bending HP `1.12 → 1.14` after ~wave 30 so inevitability beats tedium.
  - `src/core/run/boons.ts` — `BOON_POOL` (the 6 boons as data, shaped like the skill-tree `NodeEffect`) + `foldRunModifiers(metaMods, activeBoons) → RunModifiers` (seeds from the skill-tree `Modifiers`, then stacks boons; **does NOT mutate** the persisted `Modifiers`/`deriveModifiers`).
  - `src/core/run/draft.ts` — `generateDraft(wave, rng) → DraftOption[3]` (boons-only now; `{type:'god'}` defined-but-unused) + `scheduleNextDraft(wave)` (jittered 3–5).
  - Enemy data: add `bounty` (Shade **4**) + `leakWeight` (Shade **1**) to `Enemy`. **Do NOT parameterize `createEnemy`** (its fixed `hp:10`/`speed:60` are asserted in tests) — the scene **mutates `e.hp`/`e.speed` after `createEnemy`** per the wave spec.
- **Phase machine (in RunController):** `building` (place towers; the Fate Draft fires here on draft waves; **wave 1 waits for a Start click**) → `spawning` (emit the wave) → `clearing` (spawns done, enemies still alive) → `cleared` → `payout` (gold + `wave++`) → back to `building`. **Clear-gate (the most important single decision in M3): a wave is over only when `emitComplete && enemies.length === 0`** — kills the leftover-enemy desync. **Write the invariant as a code comment:** any death-spawned enemy (future Hydra split, M4) MUST be pushed to `this.enemies` *before* the clear-check runs that frame, or the gate can false-trigger between parent-death and child-spawn.

### Resolved numbers (write these in ONE place)

| Lever | Value | Source |
|---|---|---|
| Zeus / Apollo cost | **200 / 250** | Economy doc |
| Gold per kill (Shade bounty) | **4** | Economy doc — early kills should feel rewarding since interest is cut |
| Flat wave income | **40 + 8·wave** | Economy doc (interest deferred) |
| HP scaling | **×1.12^(n−1)** compounding | Wave doc (count growth would lag-die first) |
| Wave count | **≈ 8 + 0.5·(n−1)** linear | Wave doc |
| Speed scaling | **×(1+0.01·n), cap ~2×** | Wave doc |
| Starting gold / lives | **`getModifiers().startingGold/startingLives`** (base 650 / 100) | reuse — skill tree feeds run start |
| Draft cadence | **every 3–5 waves**, none before wave 1 | locked w/ user |

### Run start / end / reset

- **Start (in `create()`):** `const mods = useSessionStore.getState().getModifiers()` → `ledger = createLedger(mods.startingGold)`, `lives = mods.startingLives`, `runModifiers = foldRunModifiers(mods, [])`, mirror down. This one block is how the skill-tree meta feeds the run.
- **`towerDamageMul` applies at FIRE-TIME from `runModifiers`, never at placement.** `createTower` bakes damage at placement; if a boon re-folds modifiers mid-run, placement-baked towers wouldn't update and two same-god towers would diverge. Read `runModifiers.towerDamageMul` when the tower fires → all towers stay current and re-fold is live.
- **End (`lives <= 0`, evaluated per-leak so one catastrophic wave can end it):** freeze the sim → `runStatus='over'` → **fire-and-forget `void session.applyRun({waveReached,victory:false,kills})`** (do **NOT** `await` — `cloudSave` can hang and would freeze the screen) → render `RunOverModal` immediately from the synchronous local `favorFromRun` number (wave reached + Favor earned + best wave from `player_progress.stats`).
- **Play Again (ordered — `scene.restart()` alone leaves store mirrors + the overlay stuck):** `resetRun()` (clear store mirrors + `runStatus`) → `setSpeed(1)` → `scene.restart()`.

### Fate Draft flow (pause correctly)

Between waves on a draft wave (in `building`): set `timeScale = 0` (the existing `if (dt>0)` guard freezes the sim for free) — but **stash the player's prior speed (`preDraftScale`) and restore THAT, not `1`** (or a 3× FF player gets dropped to 1×). Show `FateDraftModal` (3 boon cards, pick 1) as a **`pointer-events-auto` overlay** so a paused canvas's live `placingGod` can't queue a click that fires on unpause. Pick → push to `activeBoons` → `runModifiers = foldRunModifiers(mods, activeBoons)` (live).

### React / UI changes

- `gameStore`: add mirrors `{ gold, lives, wave, phase, runStatus, draftOptions, preDraftScale }` + intent setters (`requestStartWave`, `pickDraft`, `playAgain`, `cheatGold`, `cheatInvincible`) and the batched `mirrorRun(...)`.
- `TopBar`: add 🪙 gold, ❤️ lives, and a wave counter chip.
- `RightRail` shop: show each god's **cost**; **disable** a god when unaffordable; spend on place.
- New `WaveControls` — "**Begin the siege**" (first state) / "**Start Wave N**", **disabled during `spawning`/`clearing`** (and idempotent via a `startRequested` flag so it can't double-fire).
- New `FateDraftModal` (3 boon cards) + `RunOverModal` (wave reached + Favor + **Play Again**).
- DEV-only panel: **+1000 gold**, **Invincible** toggle.
- **Leak juice is MANDATORY, not optional** (it's the game's only negative feedback and today the leak is silent): flash the Olympus gate + red-flash the ❤️ lives chip on **every** leak (reuse the existing `burst()`/tween infra).

**Critical files:** new `src/core/economy/ledger.ts`, `src/core/systems/waveManager.ts`, `src/core/run/{boons,draft}.ts`, `src/game/run/RunController.ts`; edits to `src/game/scenes/GameScene.ts` (consume RunController; spend on place; earn on kill; leak → lives + juice; draft pause; fire-time damage mul), `src/state/gameStore.ts`, `src/core/data/towers.ts` (+`cost`), `src/core/entities/enemy.ts` (+`bounty`/`leakWeight`); new UI (`WaveControls`, `FateDraftModal`, `RunOverModal`, dev panel) + edits to `TopBar`/`RightRail`. **Reuse:** `sessionStore.getModifiers()`/`applyRun()`, `core/progress/rules.ts` (`favorFromRun`, `BASE_MODIFIERS`), `canPlace`, `selectTarget`.

### Verification

- **Unit tests:** `ledger` (afford/spend/earn/`waveIncome`), `waveManager` (HP/count monotonic ↑, speed cap holds), `foldRunModifiers` (skill-tree + boons stack; persisted `Modifiers` untouched), `generateDraft` (3 distinct boons, none before wave 1). Existing 40 tests stay green (don't touch `createEnemy`'s signature).
- **In a real browser** (headless preview throttles RAF — drive with `devStep()` for the deterministic checks): start gold/lives match `getModifiers()`; placing spends gold; the shop disables when broke; "Begin the siege" starts wave 1 (no draft before it); a leak drops a life + flashes; clearing a wave pays income + advances; the draft fires every 3–5 waves (sim pauses, pick a boon, the buff visibly stacks); lives → 0 shows run-over with wave + Favor; **Play Again** resets cleanly (no stuck overlay); both dev cheats work.
- `npm run build` + `npm run test` green → commit + push (auto-deploys). Then the **🚦 M3 KILL-GATE**: *do you want to play it again, unprompted?*

---

## Milestone 4 — The Enemy Roster (detailed)

**Why now:** M3/M5-start gave a losable run + upgrades, but every wave is the same Shade trickle, so there's no *threat-reading* — the Bloons-intuitive heart of the game (one crisp enemy property → one obvious counter). M4 adds the enemy roster. **Hard constraint:** only **Zeus, Apollo, Demeter** are built, so we ship only enemies whose counter EXISTS, and defer the rest (locked w/ user). A multi-agent design pass + pre-mortem produced this; it caught a real self-contradiction (armor model) and the must-fixes below. **Decisions (user):** armor = **flat reduction** (the real counter-puzzle), and **Hydra is included, built last**.

### The roster — 5 ship, 3 defer

| Enemy | Trait | hpMul ×`enemyHp(n)` | speedMul | armor | bounty | leakWt | Intro | Counter (built gods) | Look |
|---|---|---|---|---|---|---|---|---|---|
| **Shade** | swarm | 0.6 | 1.0 | 0 | 3 | 1 | w1 | Apollo pierce rakes the line; Zeus Stormcaller width | small purple circle (r7) |
| **Skeleton** | baseline | 1.0 | 1.0 | 0 | 5 | 1 | w3 | anyone (the yardstick) | bone-white circle (r10) |
| **Harpy** | **flying** | 0.8 | 1.15 | 0 | 7 | 1 | w6 | **Apollo only** (canHitAir) — Zeus *whiffs* | cyan triangle, airborne ring (r9) |
| **Talos** | **armor** | 1.5 | 0.75 | **6** | 12 | 2 | w9 | Zeus Tyrant / Apollo Plague (big single hits) | steel hexagon, plate ring (r15) |
| **Hydra** | **splits** | 1.4 (child 0.45×) | 0.9 (child ×1.15) | 0 | 9 (child ×0.4) | 1 | w12 | Apollo pierce (parent+children in a line) | green diamond (r12) |

**Deferred (no counter built):** **Gorgon-kin** (stealth → needs detection: Athena/Hephaestus) · **Satyr** (fast → needs slow: Aphrodite/Poseidon) · **Cyclops** (tanky → redundant with Talos; reuse for boss spectacle). Each lands with its counter-god.

### Engine changes (concrete; land each trait atomically)

- **Widen the kind** (`enemy.ts`, `run/types.ts`, `RunController.ts` in lockstep): `EnemyKind` = `'shade'|'skeleton'|'harpy'|'talos'|'hydra'`; `ENEMY_BASE_COLOR` + a per-kind **radius** lookup; `Enemy` gains `flying:boolean`, `armor:number`, `splitDepth:number` (defaults via a per-kind `ENEMY_BASE` table in `createEnemy`). `SpawnDesc.kind → EnemyKind` + `armor`/`flying`/`splitDepth`/`spawnAtT?`.
- **Flying = ONE atomic change across 5 touch-points** (partial landing silently kills the only anti-air): `TowerStats.canHitAir` (`towers.ts`: Apollo `true`, Zeus/Demeter `false`); widen `selectTarget`'s `Targeter` to `{pos,range,canHitAir?}` + guard `if (e.flying && tower.canHitAir === false) continue` (use `=== false` so the debug-overlay caller's ad-hoc `{pos,range}` still works); `Projectile.canHitAir` (`projectile.ts` + `createProjectile`) set in `fireProjectile` from `TOWER_STATS`, + collision guard `if (e.flying && !p.canHitAir) continue`. **Net:** a Zeus-only board literally can't acquire a Harpy; buying an Apollo is the answer. *Apollo is always purchasable (traditional access, both gods unlocked from start) — verified, so the wall is fair.* Add a one-time telegraph hint on the first Harpy.
- **Flat armor** (`damageEnemy` in `enemy.ts`, centralized so both fire paths inherit it): `const dealt = Math.max(1, amount - enemy.armor); enemy.hp -= dealt`. The **min-1 floor** guarantees never-unkillable. Talos armor 6 + moderate hpMul 1.5 (NOT ×2.2 — avoids double-walling): Zeus base 5→1 (craters), Zeus Tyrant 15→9 (punches through). Display post-armor `dealt` if a damage number is ever shown.
- **Splits** (pure `onDeath(enemy): SpawnDesc[]` in `enemy.ts`): Hydra → 2 children at `0.45×maxHp`, `splitDepth+1`, `spawnAtT = parent.pathT`, `SPLIT_DEPTH_CAP=2` (1 root → ≤7 bodies, terminates). In `GameScene.killEnemy`, spawn children **inline BEFORE `removeEnemy`** so they're in `this.enemies` when `settle()` reads `.length` the same frame (the M3 clear-gate invariant — already satisfied by the current `update()` ordering). `spawnEnemy` must **honor `desc.spawnAtT`** (`enemy.pathT = desc.spawnAtT ?? 0`) or children teleport to the start.
- **Spawn pipeline → multi-kind groups** (the most invasive change): `WaveSpec` becomes `{ wave, groups: SpawnGroup[] }`; `waveSpec(n)` composes groups by wave **band** (per-kind helpers wrap the existing `enemyHp`/`enemyCount`/`enemySpeed` scalers × the kind multipliers above). `RunController.tick`/`beginWave` replace the single `spawnedCount` with a **group cursor** (`groupIdx`/`spawnedInGroup`); phase flips to `'clearing'` only after the **LAST** group fully emits (the clear-gate depends on this).
- **Per-kind radius** must replace the single `ENEMY_BASE_RADIUS` in **all three** spots (projectile hit-radius, damaged-radius, HP ring) or hitboxes desync from visuals. **Object pooling: DEFER** — counts stay linear/bounded (≤~63 bodies worst-case at w40), well under the ~250–300 tripwire; pool only if a profiler shows GC sawtooth.

### Wave schedule (teach one trait at a time)

`enemyCount(n)` stays the **count budget**; per-kind **shares partition** it (they pick *which sprite* each spawn is — they never add bodies; only Hydra's on-death fan-out adds bodies, capped ~15% share). A kind's **debut wave is single-kind** (≥1 guaranteed) just **after** a Fate Draft (every 5) so the player has freshly spent gold/boons on the counter. Intros: **Shade w1 · Skeleton w3 · Harpy w6 · Talos w9 · Hydra w12**, each ~3 waves apart and reachable in a playtest. HP carries escalation (compounding), count stays linear, speed stays capped — threat climbs, frame budget doesn't.

### Staged build order (de-risk the pipeline rewrite — ship/verify each before the next)

1. **Pipeline → groups + the tick group-cursor, with Skeleton only** — prove the clear-gate still flips on the LAST group (highest soft-lock risk; validate in isolation).
2. **Flying (atomic 5-point) + Harpy** — test: a `canHitAir:false` Zeus can't select a flying enemy; Apollo can.
3. **Flat armor + Talos** — test: `damageEnemy` floor; big-hit vs chip-fire DPS gap.
4. **Splits + Hydra (last)** — test: 1 root → exactly 7 bodies then stops; children spawn at the death point; the wave still clears.

### Must-fixes (from the pre-mortem — bake in, don't rediscover)

- `spawnEnemy` currently hardcodes `getPointAt(0)` — **honor `desc.spawnAtT`** for split children.
- `killEnemy` calls `removeEnemy` first — **insert child-spawn before it** (and thus before `settle`).
- `selectTarget` guard uses **`=== false`**, not `!canHitAir` (the debug-overlay caller passes no `canHitAir`).
- `Projectile.canHitAir` **set in the same change** as its collision gate, or Apollo silently stops hitting air.
- Keep the armor formula **only** in `damageEnemy` (both hitscan + projectile paths call it → inherit the floor for free).
- Guarantee **≥1** of a debuting kind on its teaching wave (integer-share rounding can drop a small share to 0).
- Note: a `goldPerKill` boon + a Hydra line is a mild gold piñata (child ×0.4 bounty mitigates); watch in tuning.

### Verification

- **Unit tests** (`tests/`): `selectTarget` flying gate (Zeus `canHitAir:false` skips a flying enemy; Apollo hits it); `damageEnemy` armor floor (8 vs armor 6 → 2; 5 vs 6 → 1, never 0); `onDeath` split (1 Hydra → 2 children, depth-capped to exactly 7 total, terminates); `waveSpec(n)` emits the right groups/shares with ≥1 of a debuting kind; per-kind base stats. Existing 69 tests stay green (widening `createEnemy`/`SpawnDesc` must not break M3 assertions).
- **In a real browser** (drive with `devStep()`): each enemy reads distinctly at a glance; a **Zeus-only board leaks every Harpy** while **Apollo kills them**; Talos **shrugs off chip-fire but falls to Zeus Tyrant**; a Hydra **splits at its death point** and the wave **still clears** (no soft-lock); difficulty feels survivable-then-inevitable (re-tune income/count if the new mix is too swingy). Build + tests + lint green; commit + push per stage (auto-deploys).

---

## Milestone 5 — The Full God Roster (detailed)

**Why now:** M4 gave 5 enemies with crisp counters, but only 3 gods exist (Zeus, Apollo, Demeter) — so the roster can't *express* the answers (no dedicated anti-air, no AoE, no slow, no detection), and 2 enemies stay deferred for lack of a counter. M5 builds the remaining **5 gods**. Each god is a chunk that introduces **ONE new engine primitive** (the riskiest work in the project), so M5 is **staged — one god per increment, verified + committed before the next** (like M4). The upgrade engine (`core/data/upgrades.ts`, 2 paths × 3 tiers, main+secondary cross-path rule, `towerEffectiveStats` read at fire-time) and the Fate-Draft/boon/run loop are all reused as-is. Each god's kit was designed in the god-kit pass; this milestone implements them.

### Build order (locked — follow it; each lands with the enemy/counter it needs)

1. **Hermes — mobile / anti-air** (this increment, detailed below). Primitive: **moving tower** (orbit). A second anti-air (with the Apollo base clause + a new Zeus anti-air tier, this retires the "Apollo is the only answer" risk).
2. **Hephaestus — deployables** (spike factory / turrets). Primitive: **persistent on-path actors** with their own lifetime/damage; armor-pierce flavor. Last-line leak insurance.
3. **Poseidon — AoE + knockback** (water-gated on the Styx pool). Primitive: **splash damage** (hit all in a radius) + **knockback** (push `enemy.pathT` back). The swarm/splits hard-counter.
4. **Aphrodite — slow / freeze** → also **ships the Satyr (FAST) enemy** it counters. Primitive: **status effects** (a per-enemy `speedMul`/freeze the engine applies in `advanceEnemy`). Also unlocks Apollo Path B's burn DoT.
5. **Athena — aura buff + detection** → also **ships the Gorgon-kin (STEALTH) enemy** it counters. Primitives: **positional aura** (a tower buffs nearby towers' fire-time stats) + **detection** (an `Enemy.stealth` flag that `selectTarget` skips unless a detector is in range).
6. **Zeus Path A chain** (the marquee chain primitive) + tidy-up. Can slot after the AoE primitive lands.

Each new god: add to `GodKind`/`TOWER_STATS`/`GOD_ORDER` (the RightRail + `baseRunModifiers.godDamageMul` pick it up automatically); add its `UPGRADES[god]` 2×3 entry; wire its primitive in `GameScene`; per-god fire visual; unit + browser tests. **Re-plan each god's specifics when reached** (numbers/visuals/edge-cases), as with M4.

---

### Increment 1 — Hermes, the mobile anti-air (decisions locked w/ user)

**Identity:** a fast, low-damage flying gunner that **orbits the spot you place him**, his range bubble sweeping the area like a patrolling aircraft, and **can strike flying enemies** (the dedicated anti-air specialist). Base: cost **275**, range **120**, damage **3**, fireRate **3**, hitscan darts (a quick yellow line, distinct from Zeus's lightning), `canHitAir: true`.

**The new primitive — a moving tower (orbit):**
- `Tower` (`core/entities/tower.ts`) gains `center: Vec2` + `orbitPhase: number`; `createTower` sets `center = pos`, `orbitPhase = 0`.
- `TowerStats` (`core/data/towers.ts`) gains an optional `mobile?: { orbitRadius: number; angularSpeed: number }` (Hermes only — e.g. radius ~50px, ~1.6 rad/s ≈ a 4s loop).
- `GameScene.update()` (inside the `dt>0` block, **before** the fire loop): for each mobile tower, advance `orbitPhase += angularSpeed·dtSec`, set `tower.pos = center + (cos,sin)·orbitRadius`, and move its sprite container (`towerSprites.get(id)?.setPosition(...)`). Everything downstream (targeting, range ring, fire origin) already reads `tower.pos`, so it "just works."
- Placement is unchanged (`canPlace` checks the orbit **center** like any tower — off-path/obstacle-free); the orbit then sweeps over the path (he's airborne — fine). Show the orbit circle when Hermes is selected (in `renderOverlay`).

**Upgrade-grantable anti-air (so Zeus can get it too):** today `canHitAir` is a static `TowerStats` flag. Make it **effective**: add `grantsAir?: boolean` to `UpgradeEffect` (`upgrades.ts`); `foldUpgrades` ORs it; `towerEffectiveStats` returns `canHitAir = base.canHitAir || folded.grantsAir`. Then the fire loop + debug overlay pass `eff.canHitAir` to `selectTarget` (replacing `TOWER_STATS[god].canHitAir`). Add the `grantsAir` flag to a **Zeus Stormcaller tier** (the storm-mage path — "the storm reaches the sky"), giving Zeus an upgrade-path anti-air option per the user's direction. (Base Zeus still whiffs — the Harpy lesson stays crisp until you invest.)

**Hermes upgrade paths (2×3, stat-based, reuse the engine):**
- *Path A — Strafing Ace* (wide, hard-hitting plane): +range, +damage across tiers (covers more ground, bigger strafes).
- *Path B — Hermes' Escort* (rapid hovering heli): +fireRate, +damage, +anti-air bite (a tighter, faster gunner).
- (Orbit-shape divergence — A widens, B tightens toward a hover — is a flagged later polish via `orbitRadiusMul`; v1 keeps the orbit fixed and differentiates via stats.)

**Critical files:** `core/data/towers.ts` (+hermes, +`mobile`, +`canHitAir` already on Apollo/Zeus), `core/entities/tower.ts` (+center/orbitPhase), `core/data/upgrades.ts` (+`UPGRADES.hermes`, +`grantsAir`, +Zeus tier flag, +`towerEffectiveStats.canHitAir`), `game/scenes/GameScene.ts` (orbit update + sprite move, `eff.canHitAir` into `selectTarget`, Hermes dart visual, orbit ring when selected), `game/run/RunController.ts` (placeholder `godDamageMul` literal += hermes). Reuse: `selectTarget` canHitAir gate, `towerEffectiveStats`/`foldUpgrades`, the upgrade panel (auto-renders Hermes's paths).

**Verification:** unit tests — `towerEffectiveStats(hermes).canHitAir === true`; a Zeus with the Stormcaller anti-air tier reports `canHitAir === true` while a base Zeus is `false`; `foldUpgrades` ORs `grantsAir`. In-browser (`devStep`): place Hermes → his sprite **orbits** the placed point and the range ring follows; he **kills a Harpy** (anti-air) and ground foes; a Zeus with the anti-air tier now hits Harpies while a base Zeus still whiffs; upgrades apply; no console errors. Build + lint + tests green; commit + push.

---

## Milestone 6 — Bosses + End-of-Run Stats (detailed)

**Context / why now:** M3–M5 gave a complete, losable, endless roguelike (8 gods, 7 enemies, the Type-Carried Hybrid difficulty curve where every 10th wave is an `isEliteWave` heavy-composition spike). What it lacks is a *peak* — a recurring spectacle that headlines the escalation and gives the run memorable milestones, plus an end-of-run screen that closes the loop with something to chew on (and feeds tuning). M6 adds a **boss framework + 3 cycling boss archetypes** (riding on the wave cadence) and a **rich end-of-run stats dump**. The core stays endless: there is no "victory" — the run-over screen *is* the payoff screen. (Bespoke leaderboard submission is still M7; the skill-tree UI still M6.5.)

**Decisions locked with the user (2026-06-28):**
- **3 bosses**, each a distinct BTD6-style mechanic but *"not quite as overpowered"* (tune to beatable).
- **Cadence = every 20 waves**, first boss at **wave 20**, then **40, 60, …**; the 3 bosses **cycle** and **get stronger each recurrence**. (So w20 = boss #1, w40 = #2, w60 = #3, w80 = #1 scaled up, …)
- Boss waves keep the **full elite surge** — the boss arrives *on top of* the every-10th heavy composition (w20/40/60 are already `isEliteWave`), the hardest/most chaotic option. Tuning stage makes it fair.

### Architecture — one `boss` EnemyKind + a `bossId` discriminator (NOT a kind per boss)

A single new `EnemyKind: 'boss'` plus an optional `bossId` on `Enemy`/`SpawnDesc`, with a pure **`BOSS_ROSTER`** table in a **new `src/core/data/bosses.ts`**. Every future boss is then *pure data* — adding one never touches the four exhaustive `Record<EnemyKind,…>` tables again. (Per-boss EnemyKinds were rejected: each new boss would force edits to 4 records + `KIND` + `WEIGHT_CURVE` + the `enemyCounts` counts-literal, and the flat trait tables can't express boss mechanics anyway.)

- **`bosses.ts` (pure):** `type BossId = 'nemean' | 'minotaur' | 'cyclops'`; `BossArchetype { id, name, color, stroke, radius, hpMul, speedMul, bounty, leakWeight, telegraph, mechanic }`; `BOSS_ROSTER: BossArchetype[]`; `bossForWave(n)` → a boss **only when `n>0 && n % 20 === 0`**, cycling `BOSS_ROSTER[(n/20 - 1) % 3]`; `bossStatsForWave(boss, n)` → scales hp/damageCap/etc. by a **per-occurrence multiplier** `(1 + 0.6·occurrence)`, `occurrence = n/20 - 1`, *on top of* the gentle ×1.05 curve (so a w80 Nemean ≫ a w20 Nemean — "get stronger each cycle").
- **Centralize visuals** with three pure helpers in `enemy.ts` — `enemyRadius(e)`/`enemyColor(e)`/`enemyStroke(e)` — returning `BOSS_ROSTER[e.bossId]` values for bosses else the existing `ENEMY_*[e.kind]` record. Refactor the ~5 render sites that read those records directly (`spawnEnemy`, `hitEnemy`, `renderOverlay` HP-ring, `updateSpikes`, `updateProjectiles`) to use the helpers (Stage-0 first commit; keeps the four records untouched).
- **Inject the boss as the LAST group** in `waveSpec(n)` when `bossForWave(n)` returns one — emitted last by the existing group cursor, so the `phase='clearing'` flip and the clear-gate (`settle(enemies.length + pendingSpawns.length)`) count it correctly. **Clear-gate safe, cap-safe** (boss is `count:1`).

### The 3 bosses (each teaches a counter, each maps to an engine primitive)

| Boss | Debut | Mechanic | Counter it teaches | Engine hook |
|---|---|---|---|---|
| **Nemean Lion** | w20 | Impervious hide: a **per-hit damage cap** + bonus armor — one giant bolt can't exceed the cap | sustained DPS > single burst (counters relying only on Zeus Tyrant) | `Enemy.damageCap`, applied in `damageEnemy` **before** the `max(1, …)` armor floor |
| **Minotaur** | w40 | **Charge** (periodic speed burst) + **CC-resist** (slow weakened, knockback immune) | can't just lock it down — need kill speed / chip damage | `slowResist` blended in `applySlow` (pure); `knockbackImmune` honored in `fireSplash`; charge timer ticked in `advanceEnemy` (pure) |
| **Cyclops** | w60 | Massive-HP brute that **bursts into adds** on death | kill it before the gate + bring AoE for the adds | `onDeath` extended (reuses the Hydra `SpawnDesc[]` pipeline exactly — children enter `this.enemies` before `settle`) |

All three: `flying:false, stealth:false` (targetable by everything), large radius (big hitbox), high `leakWeight` (a leak is a disaster — but *"not as overpowered as BTD6"*: tune so a competent board survives), big `bounty` (killing it funds the next push).

### Staged build order (one archetype per stage, each shippable + browser-verified, mirrors M4/M5)

- **Stage 0 — Framework + Nemean Lion.** The helper refactor; `bosses.ts`; `EnemyKind 'boss'` + the four record `boss:` entries (+ inert `KIND.boss`/`WEIGHT_CURVE.boss` + `enemyCounts` counts-literal `boss:0`); `Enemy`/`SpawnDesc` `bossId?`/`damageCap?`/`armor?`; `damageEnemy` cap; `SpawnGroup` boss fields + `makeGroup` passthrough + `waveSpec` injection at `%20`; `RunController.tick` forwards the boss fields; `GameScene.spawnEnemy` (boss visuals + `telegraphBoss()` banner), new `renderBossBar()` (a prominent bar, additive to the HP ring), `killEnemy` boss spectacle (bigger burst + `cameras.main.shake`). *Verify: a Nemean appears at w20, a huge single hit deals only `cap − armor`, the wave still clears, telegraph + health bar + death shake render.*
- **Stage 1 — Minotaur** (charge + CC-resist): `slowResist`/`knockbackImmune`/charge fields derived in `spawnEnemy` from the roster; `applySlow` slow-resist blend; `advanceEnemy` charge tick; `fireSplash` `!knockbackImmune`. *Verify: Aphrodite slows it only partially (slowMul ≥ ~0.75), Poseidon knockback doesn't move its `pathT`, the speed burst is visible.*
- **Stage 2 — Cyclops** (brute + adds): `onDeath` returns N≤4 adds at the boss's `pathT` (bounded overrun vs the 60-cap, same as Hydra). *Verify: killing it spawns the adds and the wave doesn't clear until they die.*
- **Stage 3 — End-of-run stats dump.** Per-run counters in `RunController` (`goldSpent` in `purchase`, `goldEarned`, `towersBuilt` via a new `onTowerBuilt()` from `placeTower`, `bossesKilled` via `onKill` boss-flag, and `worstWave`/`worstWaveLives` rolled in `onLeak`/`settle` — **finalize the worst-wave compare inside `onLeak` right before `phase='over'`**), exposed via `runStats()`. Extend `RunResult` + `favorFromRun` (a `FAVOR_PER_BOSS` term) + `PlayerStats` (`bossesKilled`/`totalGoldSpent`/`totalTowersBuilt`) in **full lockstep** (`emptyProgress`, `applyRunRewards`, `mergeProgress` monotonic-max, `migrateProgress` `num(...,0)`) + `RunSummary` + `RunOverModal` (new stat rows incl. "Bosses slain" and "Bloodiest wave: W{n} (−{lives})"). *Verify: run to death, read `useGameStore.getState().runSummary`, confirm rows render + lifetime stats persist across a refresh.*
- **Stage 4 — Tuning pass** (data-only, no new mechanics): make the bosses *"not quite as overpowered"* — damage-cap vs Zeus Tyrant's `damageMul` chain, Minotaur `slowResist` vs Aphrodite's 0.55, Cyclops add-count/HP, the per-occurrence scaling, and confirm the boss-wave (boss + full elite surge) is hard-but-fair. Use the headless harness + `worstWave`/`bossesKilled` readouts.

Add a small **DEV-only `devJumpToWave(n)`** helper (calls `RunController.beginWave`) to make boss testing/tuning fast.

### Critical files

- **New:** `src/core/data/bosses.ts` (the roster + `bossForWave`/`bossStatsForWave`).
- **`src/core/entities/enemy.ts`** — `EnemyKind`, the four `Record<EnemyKind>` (+`boss`), `Enemy`/`SpawnDesc` boss fields, `createEnemy`, the `enemyRadius/Color/Stroke` helpers, `damageEnemy` (cap), `applySlow` (slow-resist), `advanceEnemy` (charge), `onDeath` (Cyclops adds).
- **`src/core/systems/waveManager.ts`** — `SpawnGroup` boss fields, inert `KIND.boss`/`WEIGHT_CURVE.boss` + `enemyCounts` counts-literal, `makeGroup`, `waveSpec` (boss injection at `%20`). Reuse `isEliteWave`/`enemyHp`/`spawnIntervalMs`.
- **`src/game/run/RunController.ts`** — `tick` (forward boss fields), `start`/`purchase`/`onKill`/`onLeak`/`settle`/`beginWave` (per-run counters), new `runStats()`, `onTowerBuilt()`, DEV `devJumpToWave`.
- **`src/game/scenes/GameScene.ts`** — boss spawn/visuals, `telegraphBoss`, `renderBossBar`, `killEnemy` spectacle + boss-kill counter, `fireSplash` knockback-immune, `placeTower` `onTowerBuilt`, `endRun` extended result, the helper-refactor at the render sites.
- **`src/core/progress/{types,rules}.ts`** — `RunResult` + `PlayerStats` + `favorFromRun` + the 4-function stats lockstep. **`src/state/gameStore.ts`** `RunSummary`; **`src/ui/hud/RunOverModal.tsx`** new rows.
- **Tests:** new `tests/m6-bosses.test.ts` (roster cadence at `%20`, cycling, per-occurrence scaling, `waveSpec` injects the boss last, `damageEnemy` cap never-unkillable, `applySlow` slow-resist, charge tick, Cyclops `onDeath` adds, clear-gate). Update `tests/progress-rules.test.ts` (the hard-coded stats `toEqual`s + `favorFromRun` literals) and `tests/run-controller.test.ts` (counter assertions). Keep `tests/m4-enemies.test.ts` Hydra/`onDeath` regressions green.

### Verification (end-to-end)

`npm run build && npm run test && npm run lint` green per stage. Headless browser via `window.godspireScene` + `devStep` (+ the new `devJumpToWave`): a boss appears at w20/40/60 with the right archetype, the Nemean shrugs off a single huge hit (cap), the Minotaur resists slow/knockback and charges, the Cyclops bursts into adds, every boss wave still **clears** (no soft-lock) and never exceeds the 60-body cap, the boss health bar + telegraph + death spectacle read, and a run-to-death populates the new stats screen + persists lifetime stats. Commit + push per stage (auto-deploys). Then a directed **playtest** of boss-wave fairness ("not as overpowered as BTD6").

## Milestone 6.5 — The Pantheon Tree (skill-tree content + UI) (detailed)

**Context / why now:** Runs award Favor (M6 added boss-kill Favor + a stats screen), but Favor does NOTHING yet — there's no way to spend it. M6.5 turns Favor into the persistent meta-progression hook: a **Pantheon skill tree** the player invests in BETWEEN runs to permanently buff future runs. The data model + persistence already shipped in M0.5 (`PlayerProgress.unlockedNodes`, `deriveModifiers`, the points math `levelForFavor`/`totalPoints`/`spentPoints`/`availablePoints`, local+cloud save), so M6.5 is **ADDITIVE**: real node content, prereq/unlock logic, a few new meta-buffs wired into runs, and the interactive tree UI. **Decisions (user, 2026-06-29):** medium + richer (~18 nodes, 3 branches, tiered with prereqs, several NEW buffs wired so the tree shapes a build); include the spicy lines **anti-boss damage, Fate Draft luck, extra gate-shields / second wind** (NOT per-god mastery).

### The tree — ~18 nodes, 3 branches × 6, prereq chains (costs are a first pass, tuned in Stage 3)

- **War (offense):** `war_dmg_1` Ares' Edge (+5% tower dmg, c1) → `war_dmg_2` Spartan Discipline (+8% dmg, c2) → `war_dmg_3` Wrath of Olympus (+12% dmg, c3); `war_rate_1` Battle Fury (+6% fire rate, c1) → `war_rate_2` Relentless Assault (+10% rate, c2); **capstone** `war_boss` Titan-Slayer (**+30% damage vs BOSSES**, c4, prereq war_dmg_3).
- **Harvest (economy):** `harvest_gold_1` Demeter's Bounty (+150 start gold, c1) → `harvest_gold_2` Fertile Start (+250 gold, c2); `harvest_income_1` Cornucopia (+10% wave income, c1) → `harvest_income_2` Horn of Plenty (+18% income, c2); `harvest_kill_1` Spoils of War (+1 gold/kill, c2) → `harvest_kill_2` Golden Tribute (+2 gold/kill, c3).
- **Wisdom (survival + utility):** `wisdom_life_1` Aegis of Athena (+10 start lives, c1) → `wisdom_life_2` Olympian Resolve (+20 lives, c2); `wisdom_shield_1` Gate Wards (**+3 starting gate-shields**, c2) → `wisdom_shield_2` Bulwark of Styx (+5 shields, c3); `wisdom_draft` Favor of the Fates (**Fate Draft shows +1 option**, c3); **capstone** `wisdom_secondwind` Breath of Nike (**start each run with a Second Wind**, c4, prereq wisdom_life_2).

Keeps the 3 existing M0.5 node IDs (`war_dmg_1`/`harvest_gold_1`/`wisdom_life_1`) so existing tests stay green (only `wisdom_life_1`'s value bumps 1→10 — no test asserts its value).

### Effect + Modifiers expansion (the meta→run bridge) — the only real plumbing

Extend `NodeEffect` (src/core/progress/types.ts) with the new kinds and `Modifiers` with the matching fields, then route each through ONE of the two existing consumers:
- **Run-START state** (read in `RunController.start()` from `getModifiers()`): `startingGold`/`startingLives` (exist) + new `startingShield` (→ `this.shieldCharges`), `secondWindStart` (→ `this.secondWindArmed = true`), `draftBonusOptions` (stored, used when generating drafts).
- **Run-TIME modifiers** (seeded by `foldRunModifiers(meta, boons)` in src/core/run/boons.ts → `RunModifiers`): `towerDamageMul` (exists) + `fireRateMul` (→ `RunModifiers.fireRateMul`, already consumed by `effectiveFireRate`), `goldPerKillAdd` (→ `RunModifiers.goldPerKillBonus`, already consumed by `onKill`), and TWO new `RunModifiers` fields: `bossDamageMul` + `incomeMul`.

New effect kinds → wiring sites:
- `fireRateMul`, `goldPerKillAdd` → just add to `deriveModifiers` + `foldRunModifiers` (consumers exist). Trivial.
- `bossDamageMul` (anti-boss) → new `RunModifiers.bossDamageMul`; apply at **HIT time** in `GameScene.hitEnemy` (`enemy.kind === 'boss' ? amount * this.run.bossDamageMul : amount`, via a new `RunController.bossDamageMul` getter) so it works for hitscan/projectile/splash/spike uniformly. (Interacts cleanly with the Nemean damage cap — the cap still clamps after.)
- `incomeMul` → new `RunModifiers.incomeMul`; multiply `waveIncome(...)` by it in `RunController.settle`.
- `startingShield`, `secondWindStart` → `RunController.start` reads them from meta (alongside startingGold/lives).
- `draftBonusOptions` → `generateDraft(wave, rng, count)` (src/core/run/draft.ts) gains a count param (default 3); `RunController` passes `3 + meta.draftBonusOptions`.

### canUnlock / unlockNode

- `SkillNode` (types.ts) gains `prerequisites?: string[]` (+ optional `tier?: number` for UI layout). Add `prerequisites` to the expanded nodes.
- New pure `canUnlock(nodeId, progress, nodes?)` in src/core/progress/rules.ts: node exists, NOT already in `unlockedNodes`, every prerequisite IS unlocked, and `availablePoints(progress) >= node.cost`. (Reuse `availablePoints`/`spentPoints`.)
- New `sessionStore.unlockNode(nodeId)` intent: guard on `canUnlock`; append to `unlockedNodes`; set `updatedAt`; `writeLocalProgress` + (if signed-in) `cloudSave` — mirrors the existing `applyRun` persist path.

### The UI — `PantheonTreePanel.tsx` (a full-screen overlay, reuses the modal pattern)

- New `src/ui/hud/PantheonTreePanel.tsx`: an `absolute inset-0 z-20` overlay (same pattern as `FateDraftModal`/`RunOverModal`) with `bg-slate-950/85 backdrop-blur`. Header shows **account level + available points + Favor-to-next-level** (from `levelForFavor`/`xpForLevel`/`availablePoints` via `sessionStore.progress`). Body = 3 branch columns; each node a card (name · effect · cost) with state from `canUnlock` + `unlockedNodes`: **owned** (✓, gold), **available** (highlighted, clickable → `unlockNode`), **locked** (prereq not met, dim), **unaffordable** (greyed). Simple vertical prereq chains per branch (not a free-form graph) keyed off `tier`/`prerequisites`.
- **Entry points:** a `🏛️ Pantheon` button in `TopBar.tsx`, and a secondary button on `RunOverModal` (next to Play Again) — the natural between-runs moment. Open/close state + run-pause in `gameStore` (`pantheonOpen`, `openPantheon`/`closePantheon` that stash + zero `timeScale` and restore it, like the draft pause). Note in the panel: **buffs apply on your NEXT run** (getModifiers is read at `RunController.start`), so unlocking mid-run is fine but affects the next run.

### Staging

- **Stage 1 — Core + wiring + tests.** NodeEffect/Modifiers/SkillNode expansion; the ~18-node `PANTHEON_NODES`; `deriveModifiers` + `foldRunModifiers` + `RunController` (start reads shield/secondwind/draft-count, settle incomeMul, bossDamageMul getter) + `GameScene.hitEnemy` boss-damage + `generateDraft` count; `canUnlock`; `sessionStore.unlockNode`. Unit tests (canUnlock prereq/affordability, deriveModifiers for every new kind, foldRunModifiers seeds the new RunModifiers, generateDraft count). Headless-verify a buffed run start. Commit.
- **Stage 2 — The tree UI + entry + pause.** `PantheonTreePanel`, `TopBar`/`RunOverModal` buttons, `gameStore` open/close+pause. Browser-verify: open the panel, unlock a node, confirm points decrement + it persists across reload, and the buff shows up next run. Commit.
- **Stage 3 — Balance pass.** Tune node costs vs. the Favor/level curve (a full tree ≈ many runs; early nodes should land in a few). Data-only. Commit.

### Critical files

- **Core (pure):** src/core/progress/types.ts (NodeEffect/Modifiers/SkillNode), src/core/progress/rules.ts (deriveModifiers + new `canUnlock`), src/core/progress/skillTree.ts (the ~18 nodes), src/core/run/boons.ts (`foldRunModifiers`), src/core/run/types.ts (`RunModifiers` +bossDamageMul/incomeMul), src/core/run/draft.ts (`generateDraft` count).
- **Game/state:** src/game/run/RunController.ts (start reads new meta, settle incomeMul, bossDamageMul getter, draft count), src/game/scenes/GameScene.ts (hitEnemy boss-damage), src/state/sessionStore.ts (`unlockNode`), src/state/gameStore.ts (`pantheonOpen` + pause).
- **UI:** new src/ui/hud/PantheonTreePanel.tsx; edits to src/ui/hud/TopBar.tsx, src/ui/hud/RunOverModal.tsx, src/ui/screens/GameScreen.tsx (mount the panel).
- **Tests:** extend tests/progress-rules.test.ts (canUnlock + new deriveModifiers kinds), tests/run-controller.test.ts (start-state from meta + incomeMul), a small draft test for the count param.

### Verification

`npm run build && npm run test && npm run lint` green per stage. Headless (`window.godspireScene`): with nodes unlocked in `useSessionStore`, a fresh run's `RunController` shows the buffed startingGold/lives/shields/second-wind/draft-size, tower fire-rate/damage up, boss takes extra damage, wave income scaled. Browser: open the Pantheon panel from the TopBar + run-over screen, unlock a node (points decrement, prereqs gate, owned persists across a reload), and confirm the buff applies on the next run. Then a directed playtest of the meta loop (does spending Favor feel rewarding?).

## Milestone 7 — Supabase Global Leaderboard (detailed)

**Context / why now:** The core loop is complete (runs, bosses, the Pantheon meta), and runs already track a career `bestWave`. M7 makes the game *competitive + shareable*: submit your highest wave to a global leaderboard and see where you rank. The `scores` table + RLS shipped in M0.5 (never wired); the auth/persistence bridge (`sessionStore`, `client.ts`/`isSupabaseConfigured`, the `progressRepo` query+error pattern) is all reusable, so M7 is mostly a thin repo + a view + run-end wiring. **Decisions (user, 2026-06-29):** **account-required** posting (guests read the board but must link an email/Google account to post) and the **Supabase backend is LIVE** (env + schema run), so verify end-to-end. **Future direction (noted, tabled):** the leaderboard, skill tree, XP, social, and events should eventually consolidate into a **home-base / main-menu screen OUTSIDE the live game** (BTD6-style). So build the leaderboard as a **self-contained, portable component** that can later drop into that home base — don't couple it to the in-game HUD beyond the entry button.

**Key schema facts (from supabase/schema.sql):** `scores(id, user_id→auth.users ON DELETE SET NULL, player_name 1-32, highest_wave 0-1000, score, mode in standard|hard|endless, created_at)`, index on `(mode, highest_wave desc, score desc)`. RLS: `scores_select_public` (anyone reads), `scores_insert_own` (`auth.uid() = user_id`) — and **anonymous users DO have a uid, so they could insert**; "account-required" is therefore enforced CLIENT-side (don't submit when `isGuest`). The board is **insert-only** (no update/delete policy) ⇒ append-only ⇒ submit only on a NEW personal best + dedupe per player on read ⇒ **no schema change required**.

### What M7 adds

- **`src/lib/supabase/leaderboard.ts` (new)** — mirrors the `progressRepo.ts` pattern (uses `supabase`/`isSupabaseConfigured`; returns a value on failure, never throws):
  - `submitScore(userId, playerName, highestWave, mode='endless'): Promise<{ ok: boolean }>` — one INSERT; no-op `{ok:false}` if `!supabase`/error.
  - `fetchLeaderboard(mode='endless', limit=200): Promise<ScoreRow[]>` — `select player_name, highest_wave, user_id, created_at` where mode, `order by highest_wave desc, created_at asc`, limit; `[]` on error/offline.
  - **pure `rankScores(rows): RankedRow[]`** — dedupe by `user_id` keeping each player's max wave, sort desc, assign rank. Extracted so it's UNIT-TESTABLE (the only testable piece; the I/O is verified in-browser).
- **`sessionStore.submitScore()` intent** — sibling to `applyRun`; gate `if (!isSupabaseConfigured || !userId || isGuest) return` (account-required), else `await submitScore(userId, displayName, bestWave, 'endless')`. Fire-and-forget from the caller.
- **`GameScene.endRun()` wiring** — compute `newBest = this.run.wave > session.progress.stats.bestWave` BEFORE `applyRun` (which bumps bestWave); after applyRun, `if (newBest) void session.submitScore()`. (applyRun's synchronous `set` updates bestWave first, so submitScore reads the fresh value.)
- **`LeaderboardOverlay.tsx` (new, portable)** — a full-screen overlay (reuse the Pantheon/RunOver modal pattern). On open: `fetchLeaderboard` → `rankScores` → render top ~25 (rank · name · wave), **highlight the signed-in player's row** (match `user_id`). States: loading / list / empty ("Be the first!") / **offline** (`!isSupabaseConfigured` → "Leaderboard needs the backend"). If `isGuest`: a banner "🔗 Link an account to post your score" (reuse `linkEmail`/`linkGoogle` from the account layer, or point to the AccountPanel).
- **Entry points + pause:** a `🏆 Leaderboard` button in `TopBar` + one on `RunOverModal` (next to Pantheon/Play Again); `gameStore.leaderboardOpen` + `openLeaderboard`/`closeLeaderboard` that pause/restore `timeScale` (same pattern as `openPantheon`).
- **Run-over affordances:** the existing "🏆 New high score!" badge stays; add a line — signed-in + newBest → "Posted to the leaderboard"; guest + newBest → "Link an account to post this score." If the display name is still the default `Mortal`, a gentle nudge to set one (the AccountPanel already does name editing).
- **Optional DB hardening (handoff, not required):** to enforce account-required at the DB too, the user can `alter policy scores_insert_own ... with check (auth.uid() = user_id and (auth.jwt()->>'is_anonymous')::boolean is not true)`. The client gate is the v1 mechanism; this is defense-in-depth.

### Staging

- **Stage 1 — Repo + submit wiring + test.** `leaderboard.ts` (submit/fetch/`rankScores`), `sessionStore.submitScore`, `endRun` newBest wiring, `gameStore.leaderboardOpen`+open/close. Unit-test `rankScores` (dedupe/sort/rank). Headless: confirm a guest run does NOT submit (account-required) and `fetchLeaderboard` returns from the live DB (read is public). Commit.
- **Stage 2 — The view UI + entry + guest nudge.** `LeaderboardOverlay`, TopBar + RunOver buttons, offline/empty/guest states, name nudge. Browser-verify the board renders against the live DB, the player row highlights, guests see the link prompt, and the offline path degrades gracefully. Commit.

### Critical files

- **New:** `src/lib/supabase/leaderboard.ts`, `src/ui/hud/LeaderboardOverlay.tsx`.
- **Edits:** `src/state/sessionStore.ts` (`submitScore` intent), `src/game/scenes/GameScene.ts` (`endRun` newBest submit), `src/state/gameStore.ts` (`leaderboardOpen` + pause), `src/ui/hud/TopBar.tsx` + `src/ui/hud/RunOverModal.tsx` (buttons + affordances), `src/ui/screens/GameScreen.tsx` (mount the overlay). **Reuse:** `client.ts`/`isSupabaseConfigured`, `auth.ts` `linkEmail`/`linkGoogle`, the `progressRepo` query+catch pattern, the Pantheon overlay/pause pattern.
- **Tests:** new `tests/leaderboard.test.ts` for `rankScores`.

### Verification

`npm run build && npm run test && npm run lint` green per stage. **Live (backend is on):** in-browser, open the Leaderboard from the TopBar + run-over screen → it fetches the real `scores` board (public read works even for the headless guest session); confirm `rankScores` dedupes to one row per player, ordered by wave, with the player's row highlighted when signed in. Confirm a **guest** run does NOT post (account-required) and shows the link prompt; confirm the **offline** path (temporarily unconfigured) shows the graceful message. The actual signed-in submit-on-new-best is the user's to confirm by playing while linked (the agent can't sign in / enter credentials) — provide the exact check (beat your best while signed in → your row appears/updates). If the LOCAL dev env lacks the Supabase keys, verify the offline-safe path locally + the user confirms live on the Vercel deploy.

## Milestone 8 — The Glow-Up: Art + Juice (detailed)

**Context / why now:** Godspire is feature-complete + competitive (full roguelike loop, bosses, Pantheon meta, global leaderboard) but still renders as placeholder shapes (circles, colored letter-badges, emoji icons). M8 makes it *look* like the polished game it already plays like — the user has called this "half the battle." This is a multi-session creative milestone run as a research → strategy → logistics → execution effort, with the user as art director (and learning game-art for the first time).

**Decisions (user, 2026-06-29, via a 3-round interview + 5 research passes):**
- **Style:** cartoony / vector, BTD6-/Clash-Royale-like (bold outlines, bright friendly color, exaggerated faces). NOT pixel art, NOT painterly.
- **Budget:** free-first; a one-time/cancellable **<$100** spend OK; no annual commitments.
- **Scope:** **full bespoke VISUALS** — all 8 god towers, 7 enemies, 3 bosses, projectiles, UI icons, map. **Audio is a SEPARATE later milestone.**
- **Sequencing:** **JUICE FIRST** (game-feel layer the agent builds entirely itself, $0, no art, immediate visible win) while art is generated in parallel.
- **Division of labor (a hard constraint):** the agent CANNOT generate images (no image model in its toolset). So **the USER generates the ~30 sprites** with an AI tool using the agent's exact prompts + a consistency recipe; the **agent does everything else** — prompt engineering, the prep toolchain, code integration, and the entire juice/animation pass.
- **Animation strategy:** **single static frame per creature + Phaser "tween life"** (squash-on-spawn, idle-bob, scale-punch on hit). Looks animated, $0, no per-frame art. Spritesheet/Spine = $1,000+ / overkill → skip (revisit post-launch).

**Art-tool decision (resolved as a cheap hands-on BAKE-OFF, not a blind pick):** 3D tools (Meshy 6, Tripo) are excluded — wrong format for a 2D game. For smooth cartoony + monthly/cancellable + cheap, the real contenders are **Leonardo.ai ($12/mo, Character Reference, native transparent — best smooth-cartoony fit)**, **Scenario ($15/mo TRUE MONTHLY exists, custom-trained model, transparent partial)**, **Sprixen ($10/mo, Style Lock — but leans pixel-art)**, and **free Gemini/Nano-Banana (backup; weak style-lock, agent removes bg)**. Volume is a non-issue for 30 static sprites. **The pick is made in Stage 3 via a free-tier bake-off** (the agent gives one "hero Zeus" prompt; the user runs it on 2–3 free tiers; compare actual output; commit a dime only to the winner). The tool is interchangeable to the pipeline (any transparent cartoony PNG works), so it never blocks. **Licensing/shipping:** all paid tools + Gemini grant commercial rights; keep prompt/edit records (copyright hygiene). The anti-AI-art backlash + Steam disclosure rules apply to Steam/itch asset-flips — **largely moot for a free, hand-built web game on Vercel**; note only if a future store launch happens.

### Staged execution

- **Stage 1 — JUICE (agent does it all, $0, NOW; tool-independent).** Build the game-feel layer on top of the existing FX (`burst()`, hit tweens, `cameras.shake`, telegraphs). Prioritized punch-list (cheap → high-impact, all in `src/game/scenes/GameScene.ts`): projectile **glow** via `sprite.preFX.addGlow`; enemy **spawn squash-stretch** (`scale 0.7→1`, `Back.easeOut`); gentle **idle bob** (looped y-tween); **boss-entrance zoom** (`cameras.zoomTo`); **screen flash** (`cameras.flash` red on leak / gold on income); **floating damage numbers**; **color-coded hit feedback** (red damage / blue slow); **slow/charm glow** on affected enemies; **projectile trails**; optionally refactor `burst()` → a `ParticleEmitter`. Verify in browser (every effect visibly fires), build/test/lint green, commit. (Several sub-commits OK.)
- **Stage 2 — ART PIPELINE SCAFFOLD (agent does it, $0; tool-independent).** Make "drop a PNG → it appears" real, with graceful fallback so the game keeps working as art arrives piecemeal. Create `src/game/assets/manifest.ts` (the SINGLE SOURCE OF TRUTH: key → file/frame + size, read by both Phaser preload and the React shop), a `src/game/scenes/PreloadScene.ts` (loads whatever sprites exist; `config.ts` runs it before `GameScene`), and swap the drawn shapes (`spawnEnemy` circle, `makeBadge` tower, projectile rect, boss) to `this.add.sprite(...)` **with a fallback to the current `enemyColor/enemyRadius/enemyStroke` shapes when a sprite key is missing**. Individual PNGs (no atlas needed at ~30 sprites). Shop (`src/ui/hud/RightRail.tsx`): emoji `TOWER_STATS.icon` → sprite icon (with emoji fallback). Verify the fallback path keeps the game identical until real art lands. Commit.
- **Stage 3 — BESPOKE ART (user generates with agent's guidance; agent preps + integrates).** (a) **Tool bake-off**: agent writes one "hero Zeus" prompt; user runs it on 2–3 free tiers; pick the winner. (b) **Style-anchor consistency workflow**: nail ONE hero sprite, then use it as the style/character reference for all the rest. (c) **Prompt pack** + a naming/size spec for all 8 gods, 7 enemies, 3 bosses, projectiles, UI icons. (d) Agent runs the **prep toolchain** — background removal (`rembg`, or use AI-native transparent output to skip it) + trim/resize (`ImageMagick`) — and drops each into the manifest, creature-by-creature, verifying each in browser. Iterate to cohesion. Commit per batch.
- **Stage 4 — MAP, UI & COHESION PASS.** Map/background + obstacle sprites (Styx/columns/olive), HUD/panel polish, and a final palette/consistency sweep so everything reads as one game. Commit.
- **(Audio — a separate later milestone, per the user's choice.)**

### Critical files

- `src/game/scenes/GameScene.ts` — the juice (Stage 1) AND the shape→sprite swaps (Stage 2). Reuse existing `burst()`, tween, `cameras.shake/flash/zoomTo`, and keep `enemyColor/enemyRadius/enemyStroke` as the sprite-missing fallback.
- **New:** `src/game/assets/manifest.ts`, `src/game/scenes/PreloadScene.ts`, `public/assets/**` (the sprite PNGs), optional `src/game/helpers/particles.ts`.
- `src/game/config.ts` (add PreloadScene before GameScene), `src/ui/hud/RightRail.tsx` (sprite icons + emoji fallback). Reuse `TOWER_STATS.icon`/`color`, `src/game/dimensions.ts`.
- Toolchain (agent runs locally, verify/install during execution): `rembg` (Python) + `ImageMagick`; OR rely on AI-native transparent output to skip background removal entirely.

### Verification

`npm run build && npm run test && npm run lint` green per stage. **Stage 1:** browser — each juice effect visibly fires (glow, spawn pop, idle bob, boss zoom, flashes, damage numbers, slow-glow, trails); no perf regression at a heavy wave. **Stage 2:** the manifest/Preload/fallback path keeps the game pixel-identical until sprites exist, then a single dropped PNG renders in place of its shape. **Stage 3/4:** each creature's sprite renders at the right size/anchor, the set reads as ONE cohesive cartoony style, the shop icons match, and a full run looks like a finished game. Plus the human **taste sign-off** (the user is the art director). Commit + push per stage (auto-deploys); confirm on the live Vercel URL.

## Deep-systems backlog (from the 2026-06-28 playtest feedback) — PLANNED, not yet built

The user gave a feedback batch. The quick fixes shipped (commit 540537c): Hermes home base, auto-flow
rounds (auto-start default ON, first wave manual, no between-round prompt), leakWeight compounding
×1.6/10 waves, per-tower target priority (First/Last/Close/Strong), Aphrodite charm cap (lead 5; path A
widens the cap, B deep-freezes), and all 48 upgrade descriptions rewritten BTD6-style. The following are
bigger and were explicitly deferred — **bake them into future milestones; do NOT start until core
mechanics are locked and real tuning begins.**

- **A — Exponential / big-ticket upgrade economy (the marquee long-game hook).** The user is emphatic:
  BTD6's late-game thrill is saving toward something hard (epic range 500 → plasma 3400 → tier-5 →
  paragons). Want a cost curve that's *cheap T1 → very expensive top tiers* plus **tier-4/5 "ultimate"**
  upgrades that are a *tangible new behavior*, not a stat bump (Zeus's real chain, Apollo's burn DoT,
  Poseidon whirlpool). Demeter farming guarantees a money sink is always needed. Proposed **M6.5 "Deep
  Upgrade Economy"**: extend paths to T4/T5, add ultimate-mechanic hooks, re-curve all costs
  exponentially. Pairs with the art-per-tier item.

- **B — Tower art + shot animations change per upgrade tier.** Each purchased tier should visibly change
  the god's sprite + projectile/FX (BTD6 reads upgrade state at a glance). Belongs in **M8 (art pass)**;
  leave a per-(god,path,tier) sprite/FX-key hook now so the swap is data, not code.

- **C — Demeter economy redesign + farm-cluster synergy (needs research).** Today N farms = N× linear
  income → unlimited gold when stacked late (the user *will* stack them, as in BTD6 banana farms).
  Rethink completely: buyback/"bank" mode (gold compounds inside the farm, withdraw to collect — BTD6
  Monkey Bank), adjacency synergy that rewards a 2×2 cluster but caps total, soft per-farm diminishing
  returns, and a visual flourish for a group of 4. **Run a design+research workflow before building** —
  it's the system most likely to break run balance. Schedule with the deep-economy milestone.

- **D — General difficulty/tuning is an ongoing M6 concern.** leak-scaling + the −20% income / +20%
  count pass are a start; final balance waits for the end-of-run stats dump (M6) and real playtests.

- **Art / soundtrack / front-end polish = M8 (Juice, AI-art pass, ship).** The dedicated look-and-feel
  milestone: sprite swap behind the `ASSETS` manifest (no code change), particles/screen-shake/SFX/music
  + mute, title screen, mobile/perf pass. The user wants to *learn this together* — M8 is where we do the
  Midjourney `--sref` pipeline, audio sourcing, and juice tuning. The per-tier art hook + a real title
  screen can pull earlier; the heavy pass is M8.

---

## Non-negotiable safeguards (from the pre-mortem — these are what make it *finish*)

1. **Dev cheats + targeting-debug overlay from M2–M3** (not M8): jump-to-wave, gold, invincibility, spawn-enemy, game-speed. This is the difference between 3 and 30 tuning iterations.
2. **Machine-enforce the architecture boundary:** a CI/pre-commit check that **fails the build if `src/core` imports `phaser`, `react`, or `zustand`.** The orchestrator can't police drift by reading code; a check can.
3. **The M3 fun kill-gate** is a real exit, not a formality.
4. **Pure, unit-tested functions** for the three bug magnets: the targeting/flag matrix, Hydra split recursion (assert 1 Greater → 6 total deaths + correct gold), and economy math.
5. **Decide-now defaults:** disable StrictMode around canvas; clamp the timestep; **desktop-first, mobile-tolerant**; v1 runs are non-resumable (persist only settings/last-name to localStorage); leaderboard anti-cheat is acknowledged-but-out-of-scope.

---

## Art pipeline (summary)

**Placeholder-first, stable asset interface:** code references final filenames/sizes (`towers/zeus.png`, 64px) from day one; placeholders progress shapes → solid PNGs → emoji, all swapped later by **overwriting files** behind a central `ASSETS` manifest that both Phaser Preload and the React shop read. **Acceptance test:** you can beat the campaign + submit a score with *zero* real art. Real art = **Midjourney with one locked `--sref`** for set consistency (one style preamble + a fill-in template), then `remove.bg`/`rembg` → ImageMagick `mogrify -trim -resize`. Sizes: towers 64, enemies 48, swarm 32, bosses 128, projectiles 16; **single static frames** for v1 (juice via Phaser tweens). Note: animated FX (chain-lightning, petrify, gold-burst) are Phaser particles, *not* sprites — design them in M8.

---

## v1.1+ backlog (your full Standard vision, preserved)

Heroes — **Perseus** (boss-melt/petrify) then **Kratos** (rage bruiser/frontline); kits locked below, no leveling · Satyr + Cyclops enemies · Medusa boss (build the generic `tower.disabled` state + Athena Path B immunity + heavy telegraph *together*) · Tier-3 upgrade effects · Demeter Path B · waves 21–30 · richer endless (minibosses, multi-variable scaling) · expansion gods (Poseidon knockback, Hades DoT, Dionysus charm, Hephaestus turrets) · Cerberus/Typhon bosses · audio/onboarding polish · leaderboard anti-cheat via edge function.

---

## Verification

- **Per-milestone, in the browser:** every milestone ends with a concrete "what works" the orchestrator opens at `npm run dev` *and* on the live Vercel URL (M0 proves the full pipeline before any gameplay).
- **Automated:** unit tests (no Phaser/DOM) for `targeting` (each enemy hit/skipped for the right reason), `Hydra.onDeath` recursion + gold, and `EconomySystem` (buy/sell/upgrade/income). CI runs the **core-purity import check**.
- **Tuning:** use dev cheats (jump-to-wave/speed/gold) + the end-of-run stats dump to iterate fast; the four heavy playtest checkpoints are M2, M3, M5, M6.
- **The fun gate:** explicit yes/no after M3 before committing to content.
- **Leaderboard:** submit from two devices/a friend to confirm global read/write and ordering by `highest_wave desc`.
- **Ship criteria (M8):** smooth on the user's phone under a heavy wave, consistent art, tone landing (funny + epic), shareable Vercel URL.

---

## M8 Stage 3 — REVISED: Pixel-Art Roster via PixelLab (locked 2026-06-29)

**Context / why this supersedes the HD plan:** We did an HD-vs-pixel bake-off in-game. The HD cartoon (Gemini/Scenario) looked premium *standing still*, but a single sprite can only **flip left/right** — true "turn and face" (up/down/diagonals) would need ~8 hand-made frames per god, which AI image tools can't keep consistent. The user wants real movement, so we pivoted to **pixel art via PixelLab**, which natively produces **8-direction rotations + frame animations** per creature. The PixelLab **MCP is now connected** (Tier 2 Pixel Artisan, 5,000 generations, $0 used). Critical constraint discovered: `create_character` has **no style-reference input** — you cannot anchor new creatures to the Zeus the user loves. So **consistency = identical generation settings + matched description phrasing**, *validated by a gating test* before we commit credits. User decisions: **gating trio + animations first**; **lean** animation depth. The HD path (`towerArt`, flipX) is to be ripped and replaced. Full research + playbook live in `godspire/docs/pixel-pipeline.md`.

### Generation strategy (locked settings ARE the consistency mechanism)
- **Tools:** `mcp__pixellab__create_character` (8 rotations come free) + `mcp__pixellab__animate_character`; `get_character` to poll/preview; `get_balance` to watch credits.
- **Mode: `v3`** (highest quality, always 8-dir, ~2–9 gens each, keeps outline+detail as soft guidance). Fallback to `pro`/`standard` only if the gating Zeus's look disappoints the user.
- **Lock on EVERY creature** (vary only the description): `view: "high top-down"` (matches the Zeus the user already liked), 8 directions, `size ≈ 64` (→ ~88px canvas, matching the existing Zeus; or 84 if that's the 8-dir cap), `outline: "single color black outline"`, plus a fixed style-description preamble. **Two body templates:** `humanoid` (gods + humanoid enemies) and `quadruped` (`template: "lion"`, etc. for beasts).
- **No base:** end each description with "…standing on the ground, no pedestal / no base / no platform." Crop any residual base in post with the already-installed Pillow toolchain; verify transparency; proof at 32/64px.
- **Animation set (LEAN):** gods → idle + attack(cast); enemies → walk; bosses → walk + one signature. Generate via `animate_character` for the facing directions that matter, mirror L/R.

### Step A — Gating trio + animations (the user-approved first batch; ~hundreds of gens)
1. **Zeus** (no pillar) — 8-dir idle + attack(cast). The golden master (for *our* judgment; the tool can't ingest it).
2. **Poseidon** (humanoid god) — 8-dir + attack.
3. **Skeleton** (humanoid enemy) — 8-dir + walk.
4. **Nemean Lion** (`quadruped`, lion template) — 8-dir + walk.
   - Identical locked settings; download all frames (MCP `download` URL / per-frame URLs via curl/WebFetch), prep with Pillow (crop base, confirm alpha, proof small).
5. **🚦 CONSISTENCY + TASTE GATE:** line up all four. Pass requires (a) they read as "one artist made these," AND (b) the user loves the no-pillar Zeus. If it fails → tune mode/description and re-roll, or trial Sprixen's Style Lock (per the doc). Do not generate the rest until this passes.

### Step B — Integration in GameScene (after the gate passes; reuses the existing glob pipeline)
- **Naming convention (auto-discovered by the existing `manifest.ts` glob — no manifest/Preload change):** idle rotations `<key>_<dir>.png`; animation frames `<key>_<anim>_<dir>_<f>.png`. `dir` ∈ PixelLab's 8 names (south, south-east, east, north-east, north, north-west, west, south-west).
- **New pure helper** `src/game/render/facing.ts`: `dir8(angleRad) → DirName` and `dirToTarget(from, to) → DirName` (quantize `Math.atan2` to nearest of 8). Unit-test it.
- **Towers** (replace the HD `towerArt` path at GameScene `placeTower` ~1185-1213 + `towerAttackTell` ~1152-1164): each frame, face the current/nearest in-range target → `setTexture(<god>_<dir>)`; on fire, play `<god>_attack_<dir>_*` frames if present, else the existing lunge + projectile FX. Keep the idle-bob. **Rip `setFlipX`.**
- **Enemies** (replace the single-sprite branch in `spawnEnemy` ~502-507 + the per-frame sync loop ~327-336): compute heading via `this.path.getAngleAt(enemy.pathT)` → `dir8` → walk-cycle texture `<kind>_walk_<dir>_<f>` (advance a per-enemy frame counter; fall back to static `<kind>_<dir>`, then to the existing colored `Arc`). Keep hit-tint, death burst, stealth alpha.
- **Pixel-crisp:** a setup pass sets `FilterMode.NEAREST` on all pixel textures (like the removed `setupPixelArt`). Keep every animation frame the same bounding box so the cached `baseScale` doesn't squash on swap.
- A tiny per-entity `AnimController` (current dir, current anim, frame index, frame timer) keeps the manual frame timing tidy. **Fallback shapes must keep working** so art lands one creature at a time.

### Step C — Full roster (after Step B is verified on the trio)
- Gods: apollo, demeter, hermes, hephaestus, aphrodite, athena (8-dir idle + attack).
- Enemies: shade, harpy, talos, hydra (+ satyr, gorgon when built) (8-dir + walk).
- Bosses: minotaur, cyclops (8-dir + walk + signature).
- Same locked settings; download → Pillow prep → drop → renders. Proof at game size; Aseprite touch-up for intra-frame drift. Commit per batch.

### Step D — Map, UI & cohesion (folds into M8 Stage 4)
- Pixel map/background tiles + obstacles (PixelLab `create_topdown_tileset` / `create_map_object`); restyle the HUD toward pixel for cohesion; pixel projectiles; title art.

### Critical files
- **`src/game/scenes/GameScene.ts`** — rip the HD `towerArt`/flipX path; add directional + frame-animated rendering at `placeTower`, the fire loop, `spawnEnemy`, the ~327-336 sync loop; a NEAREST setup pass. **New:** `src/game/render/facing.ts` (pure `dir8`) + optional `src/game/render/AnimController.ts`; the `sprites/` frames. **Reuse:** `manifest.ts` glob + `hasSprite`, `PreloadScene`, `path.getAngleAt`/`getPointAt`, the Pillow prep, `docs/pixel-pipeline.md`.
- The current HD `zeus.png` + the `docs/art-guide.md` HD guide become stale once pixel lands (leave or remove during Step B).

### Verification
- **Generation:** `get_balance` before/after each batch; `get_character` previews; the 4 stills lined up for the consistency + taste gate (human sign-off — the user is art director).
- **Integration:** `npm run build && npm run test && npm run lint` green; new `facing.ts` unit tests. Browser via `devStep`: towers turn to face their target across all 8 directions + lunge/cast; enemies face their movement heading and leg-cycle while walking; art-less creatures still render their fallback shapes; pixel-crisp (NEAREST); no perf regression at a heavy wave. Commit + push per batch.

### Deferred from the pixel review (2026-06-29 user feedback)
- **Per-tier upgrade art (the big one — explicitly requested): towers should visibly change as you buy upgrades, BTD6-style.** Each god needs ADDITIONAL PixelLab characters/animations per upgrade tier (or per path), and the engine picks the sprite base-key from the tower's current upgrade state. Leave a `(god, path, tier) → spriteBaseKey` hook so the swap is data, not code (`DirAnimSprite` already keys off a `base` string, so the renderer is ready). This multiplies the art roster — schedule as its own milestone alongside the deep-upgrade-economy work, after the base roster lands.
- **Improve the cast FX itself** (the drawn lightning / arrow / splash + particles), separate from the body animation. Later.
- **Fine-tune display sizes** once the whole roster exists: shop icon (RightRail `h-12`), on-map god size (`TOWER_SPRITE_PX`), per-enemy `artPx`. Easy data tweaks in the cohesion pass.
- **Boss HP** bumped ~3× (hpMul 20/18/20, recurrence ×0.6) after "too easy" — revisit with real playtest data.

---

## M8 Stage 3 — Overnight autonomous run (the rest of the pixel roster + bg/UI plan)

**Context:** The pixel pipeline is proven on the gating quartet (Zeus, Poseidon, skeleton, Nemean Lion) and the integration is built + drop-in (manifest glob + `DirAnimSprite` auto-render any `<key>_<dir>` / `<key>_<anim>_<dir>_<f>` PNGs; the `scripts/pixlab_import.sh` makes each creature one command). The user is going to bed and wants an unattended run that finishes the remaining roster, writes a bg/UI animation plan for tomorrow, cleans the codebase, and ships. **Decisions (2026-06-29):** generate **everything remaining**, **test each creature** before moving on, **bg/UI = plan only**, and at the end **commit + push to GitHub + deploy (Vercel auto-deploys on push) + remove dead/unused code**. Loop mechanism = **in-session self-paced `/loop`** (full MCP + in-game verification; honest caveat — it PAUSES at the 5-hour usage cap and does not auto-resume, so if it stops overnight the user restarts it in the morning; keep the laptop awake + this session open).

### The goal spec (persisted to `docs/overnight-goal.md` so it survives context resets)
Loop, ≤3 creatures per iteration, until the DONE condition. Each creature: generate (PixelLab MCP) → animate → `pixlab_import.sh <key> <id>` → **verify** → commit. Lock the proven settings: **v3 / high-top-down / size 84 / single black outline / high detail** for humanoids; **pro + quadruped template** for animal-bodied ones. Animations: gods → `attack` (fireball/throw template); enemies + bosses → `walk` (walk / running-6-frames).

**Remaining roster (14):**
- Gods (v3 humanoid, attack): `apollo` `demeter` `hermes` `hephaestus` `aphrodite` `athena`
- Enemies (v3 humanoid, walk): `shade` `harpy` `talos` `satyr` `gorgon`; **`hydra` = non-humanoid** (multi-headed serpent — no humanoid/quadruped template fits; use pro mode + a creative description, accept a best-effort, flag for review)
- Bosses (v3 humanoid — both bipedal, walk + later a signature): `minotaur` `cyclops`

**Special cases (user-flagged):**
- **Hermes** — mobile orbiting tower (`placeTower` `stats.mobile` branch: fixed home-base badge + small orbiting flier). Needs a small integration tweak so the **home base uses the Hermes pixel sprite** (and ideally a small Hermes/dart flier). May be **two sprites** (a base/identity sprite + the animated flier). Touch `placeTower` mobile branch + `updateMobileTowers`.
- **Demeter** — farm/income tower (no attack; pays out in `payDemeterIncome`). Her animation should read as **"making money"** (a harvest / coin-toss), played **on payout**, NOT a cast-on-fire. Generate a `harvest`-type animation and trigger it from `payDemeterIncome` (add Demeter to `enemyArt`/`towerArt`-style handling; she's a non-firing tower so `updateTowerAnims`'s target-based cast won't apply — drive her anim off income events).
- Other gods drop in body-only (their FX — arrows/spikes/charm/aura — already exist as drawn effects). Enemies' traits (flying depth, stealth alpha) already handled in `spawnEnemy`.

### Per-creature verification gate ("test each character")
Before committing a creature: `npm run build && npm run test && npm run lint` green, AND an in-game check via the dev hooks (`godspireScene` + `devStep`) — place/spawn it, step, assert its `DirAnimSprite` texture **cycles the right `<key>_<dir>` / `<key>_<anim>_<dir>_<f>`** keys and there are **no console errors**. (Objective texture-key checks over flaky screenshots; occasional screenshots for the morning review.) If a creature fails or looks wrong, fix or re-roll before proceeding — never commit a broken build.

### Guardrails (from the loop-engineering research — keep the run safe + terminating)
- **State in git, not context:** each iteration re-derives "what's left" from `ls sprites/` + the roster list; commit per batch so a fresh turn can resume.
- **Verification gate before every commit** (above). Never commit red.
- **Phase-size:** ≤3 creatures per iteration; mark a chapter per batch.
- **No-progress / stuck detection:** if a creature can't be made to pass after a couple of re-rolls, **skip + log it** in `docs/overnight-goal.md` and move on (don't loop forever on one).
- **DONE condition (self-terminate — stop scheduling wakeups):** all 14 creatures have art + pass the gate (or are explicitly logged as skipped) **AND** `docs/bg-ui-plan.md` is written **AND** the dead-code cleanup is done **AND** everything is committed + pushed. 
- **5-hour cap:** if hit, stop cleanly (state is in git) — the user resumes in the morning.

### Final steps when the roster is done
1. **bg/UI plan (plan only):** write `docs/bg-ui-plan.md` — animating the map/background (PixelLab `create_topdown_tileset` for terrain/path; `create_map_object` for the Greek obstacles; subtle animated backdrop via Phaser tweens/particles — Tartarus glow, drifting clouds) and the HUD/UI (pixel-styled React HUD: pixel font, chunky borders, `create_ui_asset` icons for the resource/wave chips + shop, a title/menu screen). This is the concrete M8 Stage 4.
2. **Codebase cleanup:** remove dead/unused code surfaced by the pixel pivot — the superseded HD bits (`docs/art-guide.md` is now stale; the single-sprite `addSpriteScaled`/`makeBadge` sprite branch + `proj_*` paths if unused), unused imports, any orphaned helpers. Run `npx oxlint` + `tsc` to catch unused; verify build/test still green.
3. **Ship:** commit, `git push origin main`, confirm Vercel picks it up.

### Critical files
- **New:** `docs/overnight-goal.md` (the spec + a running progress/skip log), `docs/bg-ui-plan.md` (the deliverable). Reuse `scripts/`… (move `pixlab_import.sh` from scratchpad into the repo as `scripts/pixlab_import.sh` so the loop + future runs have it under version control).
- **Touched per special case:** `src/game/scenes/GameScene.ts` (`placeTower` mobile branch for Hermes; `payDemeterIncome` → Demeter harvest anim). Most creatures need **no code** — just the dropped PNGs.

### Setup the user does (before bed)
1. Keep the laptop **awake + plugged in**, leave **this Claude Code session open**.
2. Run the one command (provided after this plan is approved + I've created `docs/overnight-goal.md` + moved the importer into `scripts/`):
   `/loop work through docs/overnight-goal.md until its DONE condition is met; ≤3 creatures per iteration, verify each before committing; if you hit the 5-hour usage cap, stop cleanly (I'll resume in the morning).`
3. In the morning: pull, play, review the roster's cohesion + the bg/UI plan; we tune from there.

---

## M8.5 — Fable 5 full-codebase review + feel/visual pass (DONE 2026-06-30) → PLAYTEST GATE

**What happened:** After the overnight roster run, a 29-agent review workflow (5 dimension reviewers →
adversarial verification per finding → 2 design agents) swept the whole codebase. **21 bugs confirmed
(1 refuted, 0 uncertain) — all fixed**, plus 12 game-feel and 12 visual-polish proposals implemented.
Commit `d210273`. Build + lint + **158 tests** green; verified live in the preview (walk/attack keys,
shadows, kill cleanup, wave chaining through a natural draft, stacked-overlay pause, no console errors).

**Highlights of what changed (playtest against these):**
- **Fast-forward is fixed**: fixed-timestep substepping — arrows no longer tunnel through enemies at 3×.
- **Animation truth**: casts restart exactly ON each shot (playOnce); walk cadence follows real speed
  (charmed foes crawl, satyrs sprint); Hermes faces his flight direction; Demeter's harvest can't crash a sold farm.
- **Pause integrity**: Pantheon/Ranks/Draft force-pause the sim every frame; stacked overlays can't
  unpause combat behind each other; speed buttons disable during forced pauses.
- **Cloud-save safety**: a flaky boot can no longer wipe the real save; fresh-device rows lose merges;
  two tabs converge; signOut forgets the name; the leaderboard dev exploit is DEV-gated; the run-over
  screen reports submit status honestly.
- **Economy feel**: selling refunds 70% of TOTAL investment (base + upgrades) — repositioning is a real move.
- **Fairness**: debut/boss/elite waves are telegraphed BEFORE they start with a longer build grace.
- **Readability + juice**: shadows, layered road, per-god hit sparks, death beats + bounty floats,
  glowing trails, chunky HP bars + boss damage-ghost, placement thunk, denied-click feedback, ambient
  embers, hotkeys 1–8 + shift-chain placement, charm tint + Minotaur charge tell.

**Deferred to post-playtest (deliberately NOT built yet — decide after playing):**
1. **Fate Draft reroll + per-god boons for the full roster** (design agent's pick, medium effort): the
   boon pool still only names Zeus/Apollo; a "Tempt the Fates again (1)" reroll adds agency on dead drafts.
   Wants playtest data on which gods feel draft-starved first.
2. **Tower hover/selection affordances** (cursor pointer, hover ring, selected base plate) — UI-adjacent,
   fits naturally into M8 Stage 4.
3. **Leaderboard server-side validation** (client-trusted writes remain) — post-launch hardening.
4. **applySlow duration semantics** if Aphrodite tuning changes (current fix is strongest-active-wins).

**The gate:** the user playtests the current build (local or Vercel), files feedback, we fix/tune, and
only then start **M8 Stage 4 (Map, UI & cohesion)** per `docs/bg-ui-plan.md`.

### Playtest feedback round 1 (2026-07-02) — SHIPPED (`3469cdc`)
Fixed: shop rail fits with no scrollbar (compact rows, w-52, names unclipped) · Hermes home base is now a
PixelLab **herm shrine** marker (`hermes_base.png`), not a mini-Hermes · towers no longer bob ("floating")
and shadows are PARKED behind `ENABLE_SHADOWS=false` until the Stage-4 terrain lands · range rings back to
simple solid circles · Nemean Lion hpMul 20→32 + cap 60→45 (full boss tune after art) · Hephaestus faces
his trap + swings only on a real charge (spazz fixed) · per-kind **silhouette ladder** (shade 36 → talos 68)
so the roster stops reading same-sized · PreloadScene boot-wait hard-capped at 6s.

**Identifiability (the "too similar in style" item) — layered plan:**
1. ✅ NOW: the silhouette ladder (size = the fastest read).
2. Stage 4 (terrain/UI): re-evaluate shadows + a subtle per-god color cue once the ground exists.
3. Art follow-up (needs user direction): PixelLab regeneration pass on the most confusable creatures with
   FORCED palette separation per creature (e.g. "dominantly bone-white" skeleton vs "dark purple" shade),
   and/or per-god accent glow matched to TOWER_STATS.color. One creature costs ~2 gens to re-roll — cheap.

### Playtest feedback round 2 (2026-07-02) — SHIPPED
Fate Draft decision timer: 20s wall-clock; freezes while Pantheon/Ranks are open; hidden-tab-safe
(clock resumes, never insta-expires); at 0 the Fates pick a random card and the run continues.
Modal shows a countdown pill + shrinking bar, red-pulsing under 6s. Tune the 20s constant
(GameScene DRAFT_TIMER_MS + the modal's DRAFT_TIMER_FULL_SEC) with playtest feel.

---

## M8 Stage 4 — Background & UI via PixelLab (PLANNED 2026-07-02; supersedes docs/bg-ui-plan.md)

### Context
The 18-creature pixel roster is done and playtested; the map is still flat drawn shapes and the HUD is
plain Tailwind. This stage makes the game LOOK finished: PixelLab terrain + obstacles, a full pixel UI
kit, and a title screen. Deep research (web fan-out + PixelLab's own knowledge agent, 2026-07-02) locked
the generation playbook below. **User decisions:** terrain = "ashen highlands" (muted stone/ash + road,
near the current dark palette) · UI = FULL pixel kit · title screen IN scope · agent drives generation
with the user as taste gate on prototypes.

### Research-locked generation playbook (the WHY lives in the research report)
- **Ground tileset:** `create_topdown_tileset` **standard** mode (pro = no ROI for square grids),
  tile_size **32×32**, view "high top-down", transition_size **0.25**, outline **"lineless"**,
  detail **"medium detail"**, shading "basic shading", text_guidance_scale ~**7**. The ground must NOT
  be outlined — our black-outlined 84px characters own the outline (the #1 cohesion rule; muted, less
  detailed, less saturated ground makes the roster pop).
- **Road:** value/brightness contrast, not outlines; flat/basic shading; transition_size 0.5 if tiled.
  (Chained-vs-hybrid decision in the staged plan below.)
- **Chaining:** multi-terrain consistency via base tile IDs (gen 1's upper_base_tile_id feeds gen 2's
  lower_base_tile_id). Palette drift across chained sets is a known failure — reuse palette hints.
- **Obstacles / markers:** `create_map_object` (transparent PNG, ~15–30s each) — proven with the
  hermes_base herm shrine.
- **UI panels:** `create_ui_asset` (~256px, palette hint, `elements` scaffold); UI SHOULD be outlined
  (opposite of terrain). Applied to React via 9-slice (CSS border-image) — mechanism in the design.
- **Font: do NOT use PixelLab's TTF generator.** Verdict: **Silkscreen** (Google Fonts; the indie pixel
  standard, readable at 12px+) for the HUD, Pixelify Sans if weight hierarchy is needed; keep long body
  text (boon descriptions, tooltips) on the system stack for readability.
- **Known failure modes to guard:** grid misalignment (post-snap/inspect tiles), mushy transitions
  (guidance ≤8, transition ≤0.5), palette drift across chained sets, outline mismatch (lineless ground!),
  detail competition (ground ≤ medium detail). ~100s per tileset generation; tilesets are 16–23 tiles.

### Architecture (designed 2026-07-02; core untouched, everything falls back to the drawn map)
- **Wang rendering:** NEW pure helper `src/game/render/wang.ts` (Phaser-free, tested like `facing.ts`):
  `cornerMask` / `layoutWangTiles(30, 17, 32, isUpper)` (~510 cells over 960×540, bottom row clipped by
  Scale.FIT) / `roadPredicate(OLYMPUS_PATH, PATH_HALF_WIDTH)` / `groundPatchPredicate(seed, riftBias)`
  (deterministic ash-patch variety from ONE 16-tile set) / remappable `WANG_TILE_FOR_MASK` (PixelLab's
  index↔corner convention confirmed at import against the example-map render; corner bits NW8/NE4/SE2/SW1).
  NEW `tests/wang.test.ts`: mask truth table, 510-placement layout, road/corner spot checks, remap is a
  16-permutation, determinism.
- **Renderer:** static `add.image` per cell in `create()` (rides the manifest glob + PreloadScene with
  zero loader changes; WebGL batches ≤16 textures; seeded flipX/flipY on solid tiles breaks repetition) —
  NOT a Phaser Tilemap. New `GameScene.drawTiledGround()` gated on `manifest.hasTileset('ashen')`
  (all 16 keys or nothing — no swiss cheese); `drawTerrain()` plots skipped when tiles render;
  `ENABLE_SHADOWS` flips on with the tileset. Integration nit: raise the two atmosphere glows above the
  tile depth (or let the obj_rift/obj_gate art carry the anchors) — opaque tiles would hide depth-0 glows.
- **Road = HYBRID first (recommended):** keep the smooth polyline road stroked at depth 1 OVER the tiles,
  its 5 colors re-sampled from the imported tileset palette; the chained road tileset (ashen upper base
  tile ID → lower, transition 0.5, flat shading) only if the user rejects the hybrid at the Stage B gate —
  the road Wang layer (mask-0 cells skipped, ~100 images) is already designed either way.
- **UI skinning:** NEW `src/ui/assets/{panels,icons,fonts}/` + `uiKit.ts` (Vite ?url glob → `uiUrl`/`hasUi`)
  — deliberately SEPARATE from the Phaser sprites glob (no dead GPU textures). Panels apply via CSS
  border-image 9-slice classes in `src/index.css` (`.pixel-panel/.pixel-chip/.pixel-btn`, `fill` +
  `repeat`, slice 24→12px, `image-rendering: pixelated`); components KEEP their Tailwind styling as the
  built-in fallback (missing PNG = today's look). States via CSS filters (hover brightness / active
  press / disabled grayscale) — only ONE extra generated variant (btn_gold for selected/CTA), cutting UI
  generation ~3×. Icons (coin/heart/shield/wave/skull/favor) via `create_map_object` 48px OUTLINED, in a
  NEW `src/ui/kit/PixelIcon.tsx` (img-or-emoji-fallback), swapped across TopBar/RunOverModal/RightRail/
  Pantheon; GameScene's floatText drops the 🪙.
- **Font:** self-hosted Silkscreen woff2 ×2 (+OFL.txt) — beats the Google link (no external request/CSP on
  Vercel, no FOUT) and beats PixelLab TTF (research verdict). `@font-face` + Tailwind v4 `@theme`
  `--font-pixel` → `font-pixel` on headings/numbers/buttons/god names; boon descriptions, Pantheon node
  text, leaderboard names, tooltips STAY system font (Silkscreen fatigues in paragraphs; Unicode coverage).
  Phaser-side text (wave banner, boss telegraph, floatText, map labels) switches to the Silkscreen-first
  stack; the title screen forces the font loaded before any canvas text renders.
- **Title screen:** `gamePhase: 'title' | 'playing'` + `startGame()` in gameStore (resetRun does NOT touch
  it — Play Again stays in-game). App.tsx renders TitleScreen XOR GameScreen — **Phaser mounts only after
  Play** (simpler than hidden-canvas; the session boot happens during the title, so PreloadScene's
  "Consulting the Fates…" splash becomes a cold-click-only edge case). `PantheonTreePanel` +
  `LeaderboardOverlay` LIFT to App root (verified self-contained: gameStore flags + sessionStore only) so
  both open from the title without a run; flag to the user that mid-run they'll now cover the full window.
  TitleScreen.tsx is pure React/CSS: gradient + rift glow backdrop, ~12 CSS-keyframe embers, GODSPIRE in
  Silkscreen bold w/ hard-offset text-shadow, optional flanking `spriteUrl('zeus')`/`spriteUrl('minotaur')`,
  Play/Pantheon/Ranks buttons.
- **Import scripts (defensive):** NEW `scripts/pixlab_import_tiles.sh <set> <id>` (curl → sniff zip vs
  single sheet → unzip or `magick -crop 32x32` → expect EXACTLY 16 → `sprites/tile_<set>_<0..15>.png`,
  example map saved to `docs/design/tilesets/` for the bake-off record) and
  `scripts/pixlab_import_object.sh <key> <id>` (single PNG → `sprites/obj_<key>.png`; map objects
  auto-delete after 8h — import immediately on approval).

### Staged execution (user = art director; every stage: build+test+lint green → screenshot → USER GATE → commit)
- **A — Ground bake-off:** land wang.ts + tests + hasTileset + drawTiledGround wiring FIRST (art-independent,
  renders nothing yet); generate 2–3 candidate tilesets varying only the prose (charcoal-ash/highland-stone ·
  basalt-rubble/ashen-flagstone · ember-flecked-ash/weathered-stone); compare example-map renders (gate 1);
  import winner, confirm WANG_TILE_FOR_MASK, screenshot WITH creatures on top (gate 2 — judging the
  outlined-roster-on-lineless-ground contrast); flip shadows on. ~2–3 tileset jobs.
- **B — Road:** hybrid restyle ($0) → gate; chained tileset only on rejection (1 job). Verify the placement
  ghost still matches the visual corridor.
- **C — Obstacles + anchors:** prototype ONE (ruined columns, ~96px, OUTLINED — props are actors; optional
  background_image palette-lock from an in-game screenshot) → gate → batch boulder/olive/styx (styx: try
  lineless — it's ground-like)/rift (~200px)/gate (~160px) → sprite-or-fallback in drawObstacles/drawMarkers.
  Footprints must still match obstacles.ts (placement probing). 6–8 jobs.
- **D — UI kit:** land uiKit.ts + CSS classes (inert, fallback-proven) → prototype ONE stone panel on one
  god card → gate the 9-slice look (tune slice/width) → batch panel_stone/chip/btn/btn_gold/card + 6 icons →
  apply component-by-component (all ten HUD files). Verify: denied-shake/hurt-flash still read; the rail
  still fits 8 gods unscrolled. ~5–6 panel + 6–7 icon jobs.
- **E — Font:** woff2 + token + per-policy apply + Phaser fontFamily swap. $0. Gate: draft cards readable
  at a glance (the 20s timer makes this gameplay, not just taste).
- **F — Title screen:** store gate + TitleScreen + lifted overlays; full-flow test (title→Pantheon→Ranks→
  Play→run→death→Play Again; refresh lands on title; no <canvas> in DOM pre-Play). $0. Optional stretch:
  a PixelLab logotype banner; "Return to title" from RunOverModal comes nearly free — ask the user.
- **Wrap:** update docs/bg-ui-plan.md to point here + record outcomes; update the godspire-art-direction
  memory with the terrain/UI kit conventions; commit + push per stage (Vercel auto-deploys).

**Budget ≈ 25–35 PixelLab jobs total** (wall-clock dominated by ~2min tileset jobs; character budget: 4,838
gens remaining, tile/object/UI jobs bill separately per job type — well within Tier 2).

### Verification (end-to-end)
Per stage as above, plus finals: 158+ tests green (+~8 wang tests); tiles byte-identical across two boots
(determinism); fallback proven by renaming one tile file (drawn map returns, no errors); a full run at 3×
with 60 bodies on the tiled map holds frame rate; placement rules unchanged (ghost/corridor/water checks);
title→run→death→again flow clean; Vercel deploy visually checked. The USER's taste sign-off is the ship gate.

---

## M9 — "Make It Unmistakable" (PLANNED 2026-07-03, from the user's 15-item M8 review)

### Context
The user reviewed shipped M8 and called it "a huge upgrade" with pointed feedback: the map reads flat and
Tartarus-heavy, the hellmouth/lake don't blend, the UI "still feels like Claude made it", shadows float,
names truncate, attack FX are thin — plus new asks (title lightning, logo, cliffs-as-gameplay) and a
strategic question about three.js. M9 turns the working game into a distinctive one.

### The three.js verdict (answered, not deferred)
NO rewrite, NO mixing: three.js is a 3D library; the impressive X clips are 3D games. Godspire's identity
is crisp 2D pixel art on Phaser; a second WebGL context buys nothing. What those clips actually radiate is
SHADER-DRIVEN spectacle — and Phaser 3.90 has built-in postFX (Glow, Shine, Displacement, etc.),
confirmed UNUSED in our codebase. M9 adopts them for the set pieces (hellmouth swirl/shimmer, lake shine)
plus a hand-rolled canvas lightning generator on the title. Same wow, one engine.

### User decisions (locked 2026-07-03)
1. **UI identity = ARCADE SHRINE:** bold, playful, BTD6-energy but Greek — chunky bevels, saturated
   per-god element colors (TOWER_STATS.color), bouncy hover/press motion, banner ribbons, big readable
   numbers. The north star for the full HUD overhaul (shop, inspector, draft, run-over, Pantheon, Ranks, title).
2. **Cliffs = gameplay:** ALL dark/ash terrain becomes unbuildable chasm — deterministic, learnable, a
   real strategy layer. The noise predicate moves INTO core (pure math) so placement + render share one
   truth; canPlace gains a 'cliff' reason; the terrain look regains texture as "cliffside and holes".
3. **Terrain gradient:** grass increases toward Olympus (a chained stone→grass tileset off the A3 stone
   base tile ID 5d5a7d50-…), cliffs bias toward Tartarus — fixes "very Tartarus heavy".
4. **Lake Styx = the FULL inner pocket,** with a naturally-blended shoreline (inpainting below).
5. **Budget spend (all approved):** projectile/attack art · logo + favicon · map decor pack ·
   boon + Pantheon icons. (~4,800 generations available.)

### Key techniques (from research + exploration)
- **Inpainting for set pieces:** `create_map_object` accepts `background_image` + an inpainting mask —
  PixelLab paints the hellmouth/lake INTO a screenshot of the live scene, so blending is by construction
  (fixes "square PNG" and "ugly blob"). 192px inpainting cap — design works around it.
- **Phaser built-in postFX** animate the two set pieces only (perf-capped): pulsing Glow + a rotating
  ADD-blend swirl sprite + ember emitter on the hellmouth; subtle Shine/mist drift on the lake.
- **Shadows: FLIERS ONLY** (Hermes' flier, harpies). All ground shadows removed ("the gods are floating").
- **Full names + bigger icons:** the shop redesign must fit 8 cards × (56px+ icons + never-truncated
  names) in ~540px.
- **Attack FX 2.0:** Zeus fractal branched bolt (3-layer stroke + impact flash + echo), Poseidon
  directional crescent wave + ripple rings + foam, Hermes motion-streak with afterimages; plus real
  proj_apollo/proj_hermes sprites (drop-in — manifest slots already render rotated).
- **Title:** stacked uniform menu column (room for future buttons), canvas lightning generator
  (white-core/blue-glow forked bolts, random strike timing, prefers-reduced-motion aware), generated
  GODSPIRE logo + favicon wired into index.html.

### Ground-truth corrections (from design exploration — bake in, don't rediscover)
- The rift/ash bias anchor is `OLYMPUS_PATH[0]` = (-30,120) — LEFT EDGE upper third, not the bottom-left
  glow corner. The gate = `OLYMPUS_PATH[last]` = (1000,205). Use path endpoints as bias anchors (no magic numbers).
- `proj_hermes` is a dead manifest slot — Hermes is HITSCAN (`drawDart`); the generated dart sprite gets
  stamped as the streak core in the new drawDart, not dropped into fireProjectile. Only Apollo projectiles.
- Obstacle audit vs the current noise (seed 7): columns + boulder on stone ✓; styx on ash (fine — lake);
  **olive center (401,170) lands on ash** — nudge its coords in obstacles.ts if the anchor test fails.
- `tests/m25-core.test.ts` has 6 `canPlace` calls at arbitrary coords — they must inject `ground: () => true`.
- The central pocket ring centroid ≈ (571,345); the lake polygon is traced inside the ring waypoints
  (430,280)→(615,205)→(745,345)→(590,455)→(475,440).

### Staged execution (each stage: tsc + vitest green → dev-server USER GATE → commit)

**S1 — Cliffs as gameplay + 3-band gradient (foundation).**
- NEW `src/core/map/terrain.ts` (pure; constants move here from GameScene): `TERRAIN_SEED=7`,
  `TERRAIN_TILE_PX=32`, `RIFT`/`GATE` from path endpoints, `RIFT_BIAS_RADIUS=300`, `GATE_BIAS_RADIUS=380`;
  `stonePredicate(...)` = the moved groundPatchPredicate + a gate-side stone bonus
  (`+max(0,1-dist(gate)/gateR)*0.30` — chasm ~vanishes near Olympus); `grassPredicate(...)` = subset BY
  CONSTRUCTION (`stone && grassNoise`, independent octaves, gate bias +0.5, threshold 0.72);
  `terrainAt(x,y): 'chasm'|'stone'|'grass'`; `isBuildableGround(x,y)` (canonical, vertex-memoized).
  wang.ts re-exports a deprecated `groundPatchPredicate` alias; tests repointed.
- `placement.ts`: `PlaceReason` += 'cliff'; `PlaceCtx.ground?` defaulting to `isBuildableGround`; check
  order oob → on-path → cliff → obstacle → too-close; `terrain:'water'` (Poseidon) EXEMPT from the cliff
  check. **Center-only check** (vertex-snapped predicate + 32px learnable cells + BTD6 forgiveness —
  justified in the design). GameScene.canPlaceGod needs zero changes.
- Tilesets (2 jobs): `ashen_v2` — REUSE stone upper via `upper_base_tile_id=5d5a7d50-e218-441c-9bca-ff5de84b5364`,
  lower re-described as "near-black chasm void… faint ember-red cracks below", transition "sheer sheared
  cliff face, stone ledge lip dropping into dark chasm, rocky strata" (ash becomes DEPTH/holes);
  `meadow` — chained `lower_base_tile_id=5d5a7d50-…`, upper "mediterranean meadow grass, olive-green,
  tiny white wildflowers". Import via pixlab_import_tiles.sh (16-tile assert stands).
- Render: GameScene imports constants from core; grass overlay pass stamps `tile_meadow_<mask>` at depth
  0.25 ONLY for mask>0 (~80–150 images), gated `hasTileset('meadow')`.
- Tests: NEW tests/terrain.test.ts (determinism; grass⊂stone invariant; gradient bands: chasm% near rift >
  near gate, grass% near gate > midfield > ~0 near rift; obstacle anchors buildable). m25 ground injection
  + 'cliff' reject/pass/water-exempt cases. Gate: 3-band screenshot + live cliff-reject ghost; user dials =
  thresholds (0.38/0.72), GATE_BIAS_RADIUS, bias weights.

**S2 — Set-piece blending + animation (needs S1 terrain final).**
- Lake = FULL pocket: `ObstacleShape` += `{kind:'poly'; points: Vec2[]}`; point-in-poly (+edge dilation via
  distToSegment) in placement.ts (export `pointInPoly`); GameScene.onWater + drawObstacles get poly branches
  (drawn poly water = fallback). Styx becomes the 6-pt polygon above. Tests: inside/outside/dilated edge;
  Poseidon places pocket-wide, land gods reject; across-the-road points unaffected.
- Inpainting: DEV-only `devPrepareInpaintShot()` (hides glows/vignette/props/labels) → 960×540 canvas shot →
  PIL crops → `create_map_object` with `background_image`+oval/mask (192px cap): RIFT = one crop (0,24)–
  (192,216), stamp `obj_rift_patch` at (0,24) depth 1.5 (do NOT upscale — FX carry the scale); LAKE = 2-patch
  chained mosaic (west crop → composite into screenshot → east crop of the composite = seamless), stamp at
  crop origins. Fallback chains: patch → old obj → drawn. Retrace the lake polygon to the final shoreline.
  Shoreline prompt: sunken lake — cliff-y rock shore where ash was (matches the cliff theme).
- Animation (Phaser built-in postFX, WebGL-guarded, ONLY these 2 objects): rift = `postFX.addGlow(0xff5533…)`
  with tweened outerStrength 2↔6, rotating ADD-blend `fx_swirl` sprite (9s/360°), optional
  `postFX.addDisplacement('fx_noise')` heat wobble (taste-gate), second ember emitter at the mouth
  (ambientCount cap 14→20); lake = `postFX.addShine` + 2 SCREEN-blend mist wisps tweened ±30px.

**S3 — Attack FX 2.0 + flier-only shadows (independent).**
- Shadows: spawnEnemy shadow block gains `&& enemy.flying` (harpies keep); placeTower deletes the two
  ground addTowerShadow calls, KEEPS the mobile-flier one (Hermes trails his shadow).
- NEW pure `src/game/render/fx.ts`: `boltPoints(from,to,depth=4,jitter)` midpoint-displacement + 1–2 forks
  (unit-tested with injected rand). drawLightning → 3-pass render on ONE Graphics (8px 0xbfe3ff@.15 / 4px@.55 /
  2px white core, ADD), impact flash + ring, 40ms echo bolt, 140ms fade.
- drawSplash → directional crescent: fireSplash gains `origin` (only call site passes tower.pos); arc sweep
  toward target (proxy-tween redraw r 0.35→1.05, ±0.55 rad), white crest, 8 foam particles, 2 trailing
  ripple rings; thin full ring stays as the damage-radius read.
- drawDart → motion streak: stamp `proj_hermes` sprite stretched along the line (ADD, 90ms) over a tapered
  fillTriangle fallback; 2 afterimages at 40/80ms; muzzle flash. `proj_apollo` = true drop-in (2 jobs).
- Gate: wave-20 swarm at 3× >55fps; each god identifiable "with eyes half-closed".

**S4 — Decor pack (needs S1).** NEW pure `src/game/render/decor.ts`: `scatterDecor(seed, target≈12–18,
isBuildable, terrainAt, path, obstacles, keysByTerrain)` — deterministic candidates, accept iff buildable +
>PATH_HALF_WIDTH+18 off-road + outside obstacles+16 + >100px from rift/gate + ≥40px apart; bones/skulls
bias toward the rift half, tufts on grass. `drawDecor()` stamps 16–28px at depth 0.8. 8 object jobs (bones,
cracked shield, column stump, 2 grass tufts, small shrine, 2 rocks). Missing PNGs filter out (never breaks).

**S5 — Arcade-Shrine foundation (independent).**
- index.css `@theme`: per-god element colors (= TOWER_STATS.color hexes), semantic tokens (gold/marble/
  abyss/branch-war/harvest/wisdom/rarity-*), `--ease-spring: cubic-bezier(.34,1.56,.64,1)`.
- Utilities: `.arcade-bevel` (3-tone inset box-shadow stack — composes with the 9-slice classes),
  `.arcade-raise` (hover scale 1.03 spring / press squash .97), `.num-pop` (keyed-remount replay; wave/
  lives/favor/costs — NOT raw gold), `.banner-ribbon` (9-slice PNG w/ clip-path gradient fallback),
  prefers-reduced-motion kill-switch for all of it. NEW `src/ui/kit/godColor.ts` (`godHex`).
- RightRail (the fit math, single column): rail w-56→w-60; 8 × 60px cards + gap-0.5 + header = 530 ≤ 540 ✓;
  card = 56px portrait on element-colored backplate + 3px element left-strip + FULL name on its own line
  (Silkscreen 13px bold, "Hephaestus" ≈ 100px < 150px available — NEVER truncates) + cost/hotkey row;
  active = gold wash + element glow; unaffordable = grayscale + red cost. Footer paragraph dies.
- TowerInspector: pixel-panel + arcade-bevel; 40px portrait + element underline; targeting pills in element
  color; chunky 8px tier squares; pixel-btn--gold upgrade w/ num-pop; stone-carved locked rows.

**S6 — Modals + Pantheon + Ranks + icon pack (needs S5).**
- Icons (counted from source): 20 boons + 18 Pantheon nodes − 4 shared ≈ **34 icons** at 48px, 2-tone
  glyph + accent style, one palette strip; files `icons/boon_<id>.png` / `node_<id>.png` (uiKit glob picks
  up); `PixelIcon` gains `sizeClass?` (replace, not append). Emoji fallback holds per-icon.
- FateDraftModal: rarity-glow framed cards, 56px icons on rarity backplates, staggered spring deal-in,
  legendary shine sweep; timer = gold "thread of fate", fraying red when urgent.
- RunOverModal: banner-ribbon header, font-pixel stats w/ num-pop, laurel + gold burst on NEW BEST.
- PantheonTreePanel: carved branch banners (1 marble PNG tinted per branch, gradient fallback), node cards
  w/ icons + tier connector lines (gold owned / branch-color available / slate locked), breathing available
  state, stone-relief locked.
- LeaderboardOverlay: TOP-3 PODIUM (center #1 raised gold + laurels, silver/bronze flanks), rows 4+ as
  pixel-chips, the player's row glows gold (or their podium slot pulses).
- Gate per component group; commit per component if the user wants finer grain.

**S7 — Title: menu column + lightning + logo/favicon (needs S5).**
- Menu = uniform stacked w-64 column (Play gold + Pantheon + Ranks, arcade-raise, extensible for future buttons).
- NEW `TitleLightning.tsx` (~70 lines): DPR-scaled canvas behind the logo; rAF strike loop (random 1.2–3.2s,
  30% double-strike at +80ms); midpoint-displacement bolts + forks; 3-pass draw (7px blue glow / 3.5px /
  1.5px white core), flicker envelope w/ re-brightens, impact flash + faint full-canvas wash; paused when
  document.hidden; prefers-reduced-motion → one static faint bolt.
- Logo: generated EMBLEM only (lightning-crowned temple spire, gold on indigo, 64px) — the GODSPIRE
  logotype STAYS Silkscreen (AI pixel text mangles) with a gold gradient + emblem above. Favicon:
  nearest-neighbor 48/32/16 from the emblem (16px legibility check; simplified bolt glyph if muddy) →
  public/ + sized <link rel=icon> entries + apple-touch-icon in index.html.

### Resolved design questions (defaults chosen; user re-judges at the visual gates)
Rift bias stays at the path mouth (cliffs frame where enemies pour in) · lake shoreline = sunken-lake
rocky cliff shore · logotype = Silkscreen + emblem · icons = 2-tone glyph + accent · the bigger lake's
Poseidon buff ships as-is (tune post-playtest) · rail w-60 (~1.5% canvas letterbox cost) accepted.

### PixelLab budget: ~55–65 jobs (2 tilesets, 3–6 inpaint patches, 2–3 FX sprites, 2 projectiles,
8 decor, 4–6 UI assets, ~34 icons; +20% reroll buffer) — comfortably inside the remaining ~4,800 gens.

### Verification
Per stage: `tsc --noEmit` + vitest (167 green + ~20 new: terrain 8, placement 3, poly 4, fx 3, decor 2) +
dev-server taste gate + commit + push. Finals: wave-20 at 3× >55fps with both postFX live; all 8 rail
cards full-named at min height; reduced-motion audit (no bounce/lightning/pop); favicon legible at 16px in
a real tab; ghost reds on chasm and the cliff cells feel learnable in play; Poseidon owns the pocket.

### M8 Stage 4 — EXECUTED 2026-07-02 (commits ab295f2 → dc06256). M8 IS COMPLETE.
All six stages shipped with user gates: **A** ashen tileset (candidate A3 "pale stone + ember rim" won the
3-way in-game bake-off; metadata-sliced import = identity Wang remap) · **B** hybrid road (palette-tuned
smooth polyline) · **C** props v2 after art-direction feedback (label-free hellmouth rift, pocket-filling
Styx LAKE r30→60 = Poseidon buff, scaled-up props) · **D** Greek-key pixel UI kit (9-slice border-image,
PixelIcon + 6 icons, one gold variant, Tailwind fallback throughout) · **E** self-hosted Silkscreen with
the readability policy · **F** title screen + overlay lift (Phaser mounts after Play; full flow verified).
Budget: 3 tileset + 9 object/icon + 3 UI-panel jobs. Next: the user plays the finished-looking game; then
M-next candidates from the backlog (draft reroll + per-god boons, deep upgrade economy, audio milestone,
per-tier upgrade art).

### M9 — EXECUTED 2026-07-03 (commits 8c510e6 → d9926c6). M9 IS COMPLETE.
All 7 stages shipped with verification (201 tests, adversarial review on S3):
**S1** cliffs-as-gameplay + 3-band gradient (core terrain module, 'cliff' PlaceReason, C1 cliff-fade
tileset + meadow, user-gated twice) · **S2** inpainted hellmouth + full-pocket Lake of Styx (custom-mask
inpainting into live-terrain screenshots; east lake color-matched in post + morphological-closing
bridge; polygon obstacles + retraced shoreline; postFX glow/vortex/embers/shine/mist) · **S3** Attack
FX 2.0 (pure fx.ts boltPoints/arcPoints; fractal Zeus bolt + echo, Poseidon crescent wave, Hermes
streak; proj sprites; FLIER-ONLY shadows; 4 review-confirmed fixes incl. Graphics.arc() perf) ·
**S4** deterministic decor scatter (8 objects, grim-west bias, pure module) · **S5** Arcade-Shrine
foundation (element tokens, spring utilities, god-colored rail w/ full names, stone inspector) ·
**S6** 38 boon/node icons + FateDraft rarity cards + RunOver ribbon + Pantheon banners/connectors +
Ranks podium · **S7** title lightning (canvas, reuses boltPoints), stacked menu, logo emblem + favicon.
Key new conventions: masked inpainting workflow (devPrepareInpaintShot → PIL crops → background_image
+ WHITE=paint masks → stamp at crop origin, patch→prop→drawn fallback chains); window.godspireGame +
MessageChannel frame pump for throttled headless tabs (see godspire-dev-probes memory).
NEXT: user playtest of the full M9 build; dials = mist/glow/vortex/ember density, decor size/count,
draft timer; then M-next candidates (draft reroll + per-god boons, deep upgrade economy, audio).

---

## M10 — "Ground the World" (PLANNED 2026-07-03, from the user's M9 playtest feedback)

### Context
The user's M9 review: the map still reads like it floats (bottom edge, lake-over-chasm), enemies walk
OVER the hellmouth instead of out of it, units are too small ("I would like to see more of them"),
the HUD still has "default claude blue," the title lightning shows its canvas rectangle, and the
three.js question needed a real answer. User decisions locked via interview: BTD6-chunky sizing
(+40-50%, fleet review dials it), lava = molten floor under the cliffs, tier-3 empowered god forms
(16 characters), Sacred Olive = lore + small aura, Cinematic shader pass, columns relocation (user
preferred south-center stage; the verified-buildable candidate is (770,110) upper-right — present
BOTH options as marked ghosts at the S6 gate and let the user pick on sight).

### The three.js verdict (delivered to the user directly this time)
NO — three.js is a 3D scene-graph renderer; Godspire has no 3D data, and a second WebGL context buys
cost without capability. The "wow" in reference clips is SHADER CRAFT, not 3D: color grading, bloom,
heat distortion, dynamic light. Phaser 3.90 exposes exactly that layer (built-in camera postFX:
Bloom, ColorMatrix; custom PostFX pipelines for anything bespoke). PixiJS = lateral move; Godot/Unity
= rewrite (only if true 3D is ever wanted). M10-S8 is the shader stage: CINEMATIC pass (user-picked)
— camera postFX warm color grade + low-strength gold bloom on the game camera, taste-gated A/B.

### Design (verified against the live terrain predicates by the design agent)
Key verified facts: 13/21 lattice vertices under the Styx polygon are CHASM and 12 chasm vertices
border the pocket (a water→stone Wang set needs the shore force-stoned); the bottom band y>440 has
ZERO chasm (lava belongs in the Tartarus mega-blob rows 9-14, x 0-288; the bottom edge gets heat
dressing); terrain.ts line 19 `RIFT = OLYMPUS_PATH[0]` — the hellmouth path change MUST pin RIFT to
{x:-30,y:120} in the same commit or the whole map reshuffles.

1. **LAKE V3 (flagship)** — NEW pure `src/core/map/water.ts`: STYX_POINTS moves here (obstacles.ts
   imports it — one polygon truth), `waterAt` (own tiny point-in-poly — importing placement would
   cycle), `nearStyxShore(x,y,pad=48)`. terrain.ts stonePredicate gains the leading clause
   `if (nearStyxShore(x,y)) return true` — a canonical force-stone shore ring (render + placement
   agree; the shoreline becomes buildable pads). Render: water Wang layer `tile_styx_*` (lower=water,
   upper=stone chained off base 5d5a7d50), isUpper = !waterAt, mask-15 skipped, drawn into ONE
   RenderTexture at depth 0.3 (above meadow 0.25, below road 1 — flush with the track by
   construction) with a single postFX.addShine. obj_styx_patch retires behind the fallback chain.
   Mist wisps + fx_swirl join setDressing (fixes an inpaint-shot leak). Poseidon: no change (same
   polygon truth). Tests: new water.test.ts (determinism; the no-seam invariant — every vertex of
   any water-cornered cell is stone; waterAt⇔pointInPoly parity); rerun terrain/lake-poly/wang/m25.
   Art: create_topdown_tileset — lower "deep dark water of the river Styx, near-black teal, glassy
   still, faint pale soul-glint reflections", upper_base_tile_id 5d5a7d50, transition "dark wet stone
   shoreline, thin pale foam line", 32px / high top-down / lineless / medium detail / basic shading /
   transition 0.25 → import as tile_styx_0..15 via the metadata slicer.

2. **LAVA FLOOR** — NEW pure `src/core/map/lava.ts`: `lavaVertexSet()` = 8-connected flood fill of
   chasm components (post-shore-clause), keep components ≥6 verts within ~480px of RIFT → the
   Tartarus mega-blob turns molten; Olympus-side ash blobs stay dark for free. 8-connectivity
   guarantees no mixed cell (the Wang conflict is dodged); the lava set chains off the same stone
   base so cliff lips are pixel-identical to ashen. Render: in the ashen loop, lava-corner cells
   stamp tile_lava_<idx> instead. Animation: ONE alt interior frame (tile_lava_0_f1) texture-cycled
   ~550ms with seeded phase; ≤2 additive glow ellipses; ember origins at 3-4 lava verts (ambientCap
   20→24); NO displacement postFX. Bottom canvas edge (no chasm there): a heat-gradient strip + 2
   ember origins at y≈530, all setDressing. ALSO here (user: "more grass on the Olympus side + a
   couple more design objects"): grass threshold 0.68→~0.64 (taste-gated), +2-3 new decor pieces
   (laurel bush, marble torso fragment, amphora cluster) added to the scatter pools. Tests:
   lava ⊂ chasm, no-mixed-cell invariant, determinism.

3. **BTD6-CHUNKY SIZING** — TOWER_SPRITE_PX 72→105; ENEMY_ART_PX ×1.4 (shade 50, skeleton 68, harpy
   72, satyr 70, gorgon 76, hydra 86, talos 96); boss 116→160; hermes flier 74 (+shadow 56, trail dy
   26), home base 52; projectiles 22/30/27; badge fallback r22. HITBOXES DO NOT SCALE (art > hitbox
   is the BTD6 feel; zero balance drift, zero core-test churn). Known breaks to fix in the same
   change: enemy HP bar y (new shared enemyArtPx helper → p.y + artPx/2 + 5), boss bar (y − art/2 −
   12, width r*2+36), tower click radius (max(footprint+6, TOWER_SPRITE_PX*0.33) — input only),
   placeThunk ring 24 / dust 20+16, attack lunge ±7, font bumps (wave preview 16, boss banner 19,
   floatText 16). Decor stays SMALL — the contrast sells the size. FLEET REVIEW (user-requested):
   a Workflow with 3-4 agents, each applying one candidate set (×1.35 / ×1.4 / ×1.55 / ×1.4+per-kind
   tweaks), staging a mid-wave field via godspireScene dev hooks (devJumpToWave/devStep/cheatGold)
   and screenshotting at 1× and 3×; USER GATE picks the winner (MessageChannel frame pump for
   throttled tabs — see the godspire-dev-probes memory).

4. **HELLMOUTH SPAWN** — path.ts WAYPOINTS[0] (-30,120)→(55,140) (inside the pit bowl, exiting over
   the east rim; the road at depth 1 emerges from under the patch at 1.5 by construction). SAME
   COMMIT: pin `RIFT = {x:-30,y:120}` in terrain.ts (the terrain scar must not move with the spawn).
   Spawn presentation (t=0 spawns only; split-children keep today's pop): alpha 0→1 over 350ms while
   the sim walks them out (never tween position). RIM OVERLAY: re-stamp obj_rift_patch cropped to
   its lower-right rim quadrant at depth 6.5 — enemies slide out from UNDER the lip (static, free;
   tween-only was judged insufficient since sprites render above the patch). Ember burst per spawn,
   load-gated. Path tests are relative — full suite expected green.

5. **SACRED OLIVE OF ATHENA** — NEW pure `src/core/map/sites.ts`: SITES = [{sacred_olive, pos
   (401,203), radius 110, effect {fireRateMul: 1.08}, lore: "Athena's first gift still grows here —
   gods in its shade strike swifter."}] + `siteBuffAt(pos)` (multiplicative fold). Fold at the fire
   loop (~line 766) beside the aura mul — Hephaestus charge production included; canPlace untouched
   (sites buff, never block; the olive rect still blocks its footprint). Render: olive draw ×1.5→
   ×2.1 (~193px canopy, y−8); soft gold ring (0xd9c879) in renderGhost when placing inside + in
   renderOverlay when the selected tower is inside; fixed-offset dressing (obj_decor_offering,
   obj_decor_olive_stones); NEW firefly ambient kind (green-gold, origin = site, cap +4). Lore
   hover: a Phaser text container at (401,150) fading in when the pointer rests on the olive rect
   (+10px) while not placing — no React/letterbox plumbing; in setDressing. Columns relocation:
   present (770,110) [verified stone] and the best south-center vertex as ghost markers at the gate;
   one-line obstacles.ts change after the pick. Art: grander obj_olive (same key — fallback chain
   untouched) "ancient sacred olive tree, silver-green wind-tossed canopy, gnarled luminous trunk,
   tiny gold votive ribbons" + the 2 dressing objects. Tests: sites.test.ts (fold math, radius
   edges); fire-rate delta measured via devStep.

6. **TITLE LIGHTNING EDGE** — TitleLightning.tsx only: delete the full-canvas fillRect wash (the
   square's source) → a larger tip-centered radial whose alpha reaches 0 inside its own circle; add
   a CSS mask-image radial feather on the canvas element so every draw melts into the backdrop at
   all four edges. No canvas resize needed.

7. **HUD DE-BLUE + SELL** — @theme adds --color-shrine-stone #2e2742 (the road's violet family),
   --color-shrine-slab #221d33 (recessed), --color-blood #a83240; new .pixel-btn--red (btn_red.png
   9-slice; ONE create_ui_asset job: "carved stone button frame, deep blood-red enamel inlay,
   chiseled gold-flecked edge, Greek key corners"). Component swaps (slate/sky → shrine tokens):
   TopBar wrapper/chips/buttons, RightRail aside + cards, SpeedControls, TowerInspector panel +
   targeting pills + PathRow, DevPanel, AccountBadge. Sell → pixel-btn--red arcade-raise font-pixel
   (bg-blood Tailwind fallback per the kit's missing-PNG rule). SHIELD CHIP (the mystery "3" = gate
   shields from the Pantheon Gate Wards node): 🛡️ {n} + a tiny GATE sublabel + title "Gate shields —
   each absorbs one leak before lives are lost" + num-pop and a one-shot ~4s explainer bubble the
   first time charges appear in a session.

8. **CINEMATIC SHADER PASS (the three.js answer made real)** — main-camera postFX: a subtle warm
   ColorMatrix grade (shadows toward indigo-violet, highlights toward gold — dialed live at a taste
   gate) + low-strength Bloom keyed to emissives (lava, bolts, hellmouth, lake shine). WebGL-guarded,
   one full-screen pass each. A/B screenshots (grade on/off) at the gate; a kill-switch constant.

9. **TIER-3 EMPOWERED FORMS (16 characters)** — sprite base keys <god>_asc_a/_asc_b (DirAnimSprite +
   manifest glob need ZERO changes). Hook: after upgradeSelectedTower increments a tier, new
   syncTowerAscension(tower) swaps the DirAnimSprite when pathX===3 && hasDirectional (the
   cross-path rule guarantees at most one form): kill tweens → destroy → recreate at
   TOWER_SPRITE_PX (Hermes 74 at tower.pos) → re-stash baseScale → ascension flourish (white flash +
   ring + settle). Missing art = silent no-op (drop-in contract). Art: identical pipeline settings
   to the base roster; prompt = base descriptor + "ascended, glowing, more ornate armor, same
   proportions and palette family" with per-path flavor (zeus_asc_a storm incarnation;
   poseidon_asc_b kraken-caller; etc.). 4 batches × 4 forms, user gate per batch; ~700-1,200 gens
   (fits ~4,600 remaining alongside the 2 tilesets).

### Staging (each stage: tsc + vitest green → preview verify → USER GATE where marked → commit+push)
S0 commission styx + lava tilesets + btn_red DAY 1 (longest lead, zero code deps) →
S1 HUD de-blue + shield chip + Sell + lightning edge fix →
S2 LAKE V3 (USER GATE — flagship) → S3 LAVA + grass dial + new decor (gate) →
S4 hellmouth spawn + pinned RIFT (gate) → S5 CHUNKY SIZING via the fleet-review Workflow (USER GATE
picks the scale set) → S6 Sacred Olive + columns pick (gate) → S7 ascension hook first (art-less),
then 4 art batches (gate per batch) → S8 cinematic grade + bloom (A/B taste gate).

### Sanity locks
Sim/pause untouched (every change is render-side); water RenderTexture + lava tiles + rim overlay
are TERRAIN (never setDressing); wisps/swirl/glows/hover/dressing → setDressing; ambient spawners
already respect inpaintShotMode; perf: +~60-120 static images, 1 RenderTexture, 2 postFX + the
camera grade/bloom, texture-swap shimmer — 60fps check at 3× wave-20 on every map stage.

### Verification (end-to-end finals)
Full suite (201 + ~12 new: water/lava/sites); Poseidon parity on the tiled lake; ghost reds on
chasm unchanged; spawn-from-pit reads at 1× and 3×; the fleet-review winner applied everywhere (HP
bars, boss bar, click radius); reduced-motion + WebGL-off audits; Vercel deploy visual check. The
user's taste sign-off is the ship gate for S2/S3/S5/S8 and every art batch.

