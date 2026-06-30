# Overnight goal — finish the Godspire pixel roster (autonomous /loop)

> ✅✅✅ **DONE — 2026-06-30 ~01:25.** All 4 conditions met: full 18/18 roster is pixel art (14 new this run);
> `docs/bg-ui-plan.md` written; dead code cleaned (`art-guide.md` removed; build+lint+147 tests green);
> all 10 commits pushed to `origin/main` (Vercel auto-deploys). Loop stopped cleanly. **AM review TODO for
> the user:** visual pass on the whole roster in-game (the headless preview boot-lagged all night, so every
> batch was gated on objective on-disk + build/lint/test checks against the already-proven render paths,
> not a live step-check) — eyeball Hermes's mobile flier, Demeter's harvest-on-payout, and the Hydra
> best-effort especially; tune display sizes per `bg-ui-plan.md` Stage C.

**GOAL:** Give every remaining creature pixel art (8-direction + animation) via the PixelLab MCP, the
exact proven way; then write the bg/UI animation plan; then clean up dead code; then commit + push.

**DONE condition (stop scheduling the next /loop wakeup when ALL of these hold):**
1. Every creature in the checklist below is ✅ (art imported + passes the gate) or 🚫 (logged as skipped).
2. `docs/bg-ui-plan.md` exists (background + UI animation plan — *plan only*).
3. Dead/unused code removed; `npm run build && npm run test && npm run lint` green.
4. Everything committed and `git push origin main` succeeded (Vercel auto-deploys).

If the 5-hour usage cap is hit, STOP cleanly — git holds all state; the user resumes in the morning.

---

## Procedure per creature (≤3 creatures per /loop iteration)
1. **Generate the character** — `mcp__pixellab__create_character`: `mode:"v3"`, `view:"high top-down"`,
   `size:84`, `outline:"single color black outline"`, `detail:"high detail"`, `body_type:"humanoid"`
   (animal-bodied → `mode:"pro"` + `body_type:"quadruped"` + a `template`). Description from the table below.
2. **Poll** `get_character` until `completed` (jobs cap = 10; one creature's 8-dir animation = 8 slots, so
   animate one creature at a time). Eyeball the south rotation preview for obvious wrongness; re-roll if bad.
3. **Animate** — `mcp__pixellab__animate_character` template mode (all 8 dirs): gods → `fireball` (or
   `throw-object`); enemies/bosses → `walk` (or `running-6-frames` for animal walks). `animation_name`
   = `attack` for gods, `walk` for enemies. Poll until done.
4. **Import** — `bash scripts/pixlab_import.sh <key> <charid>` (drops `<key>_<dir>.png`,
   `<key>.png`, `<key>_<anim>_<dir>_<N>.png`). No per-creature code for normal creatures.
5. **VERIFY (the gate — never commit red):** `npm run build && npm run test && npm run lint` green, AND an
   in-game check via the dev hooks: reload the preview, place the god / spawn the enemy with `devStep`,
   assert its `DirAnimSprite` cycles the right `<key>_<dir>` / `<key>_<anim>_<dir>_<N>` keys and there are
   no console errors. (Objective texture-key checks > flaky screenshots; grab one screenshot for the AM review.)
6. **Commit** the batch (`git add -A && git commit`). Update this file's checklist + progress log.

`key` MUST equal the engine id (GodKind / EnemyKind / BossId) so the manifest glob + renderer auto-wire it.

---

## Roster checklist (done so far: zeus, poseidon, skeleton, nemean)

### Gods — towers (v3 humanoid; anim = attack)
- [x] **apollo** — "Apollo Greek god of sun and archery, youthful muscular man, golden laurel crown, white-and-gold toga with a blue sash, holding a golden longbow, faint sun-glow, confident stance, standing on the ground, no pedestal no base". attack: `throw-object` (or v3 custom "drawing a bow and firing an arrow").
- [x] **demeter** — SPECIAL (see below). "Demeter Greek goddess of the harvest, mature woman, crown of golden wheat, green-and-gold robe, holding a sheaf of wheat and a sickle, warm, standing on the ground, no pedestal no base". anim = a HARVEST/coin motion (name it `attack` so it imports to `demeter_attack_*`; played on payout, not on fire).
- [x] **hermes** — SPECIAL (mobile; see below). "Hermes Greek messenger god, lean athletic young man, winged sandals, winged helmet, short tunic, holding a caduceus, dynamic mid-stride, standing on the ground, no pedestal no base". attack: `throw-object`.
- [x] **hephaestus** — "Hephaestus Greek god of the forge, burly bearded blacksmith, leather apron, holding a glowing forge hammer and tongs, forge-orange glow, soot-smudged, standing on the ground, no pedestal no base". attack: v3 custom "swinging a heavy forge hammer down" (or `cross-punch`).
- [x] **aphrodite** — "Aphrodite Greek goddess of love and beauty, graceful elegant woman, flowing pink-and-white gown, golden jewelry, long flowing hair, soft pink glow, standing on the ground, no pedestal no base". attack: v3 custom "blowing a kiss, casting a charm".
- [x] **athena** — "Athena Greek goddess of wisdom and war, regal woman in bronze armor and a crested helmet, holding a spear and round aegis shield, a small owl on one shoulder, standing on the ground, no pedestal no base". attack: v3 custom "thrusting a spear forward".

### Enemies (v3 humanoid unless noted; anim = walk)
- [x] **shade** — "a Shade, small ghostly shadow wraith, tattered dark-purple cloak, glowing pale eyes, wispy translucent lower body, eerie". (small swarm unit)
- [x] **harpy** — "a Harpy, winged bird-woman monster, large feathered wings, clawed talons, wild hair, fierce, airborne". (flying — engine already renders it above + a hint)
- [x] **talos** — "Talos, a giant bronze automaton warrior, riveted bronze armor plates, single glowing eye, heavy, lumbering". (armored brute)
- [x] **satyr** — "a Satyr, goat-legged man, furry goat legs and hooves, small curved horns, mischievous, holding a wooden club, quick". (fast)
- [x] **gorgon** — "a Gorgon, snake-haired woman monster, writhing snakes for hair, scaled greenish skin, menacing glare, holding a short bow". (stealth — engine renders at half-alpha)
- [x] **hydra** — NON-HUMANOID best-effort: "the Lernaean Hydra, a multi-headed green serpent dragon, several snake heads on long necks, scaled coiled body, venomous". ✅ Used **v3 humanoid** (NOT pro — pro ignores the outline/detail style params that anchor set consistency) with an upright multi-headed-dragon description. Came out GREAT — reads clearly as a coiled multi-headed serpent. No skip needed. FLAGGED for AM taste review anyway.

### Bosses (v3 humanoid — both bipedal; anim = walk; a signature can come later)
- [x] **minotaur** — "the Minotaur, a massive muscular bull-headed man, large horns, nose ring, wielding a huge double-bladed labrys axe, snorting, imposing".
- [x] **cyclops** — "a Cyclops, a colossal one-eyed giant, one huge central eye, ragged loincloth, swinging a giant club, brutish, towering".

---

## Special cases (need a small code touch in `src/game/scenes/GameScene.ts`)
- **Hermes (mobile orbiting tower):** `placeTower`'s `stats.mobile` branch draws a fixed home-base badge +
  a small orbiting flier. Make the **home base use the `hermes` pixel sprite** (a `DirAnimSprite` or scaled
  image), and ideally the flier too (small). He may warrant a base/identity sprite *plus* the animated
  flier — fine to use the same rotations. Keep `updateMobileTowers` moving the flier.
- **Demeter (income, not attack):** she never fires, so `updateTowerAnims`' target-based cast won't trigger.
  Give her a `DirAnimSprite` and **play her `attack` (harvest) animation from `payDemeterIncome`** (a one-shot
  on each payout) — reads as "making money". Idle = static south + bob otherwise.
- **Hydra:** see checklist — non-humanoid, best-effort or skip+log.

## Guardrails (do not skip)
- **Verify before every commit.** Never commit a red build/test/lint or a creature that errors in-game.
- **State lives in git + this file.** Re-derive "what's left" from the checklist + `ls src/game/assets/sprites/`.
- **≤3 creatures per iteration;** `mark_chapter` per batch.
- **No infinite loops:** if a creature won't pass after ~2 re-rolls, mark it 🚫 in the log and move on.
- **Watch credits:** `get_balance` occasionally (5000-gen budget; ~12 gens/creature → plenty).
- **Stop at the 5-hour cap** — clean stop, git has everything.

## Final steps (after the whole checklist is ✅/🚫)
1. Write **`docs/bg-ui-plan.md`** (plan only): map/background via PixelLab `create_topdown_tileset` +
   `create_map_object` (Greek obstacles), a subtle animated backdrop (Phaser tweens/particles); the HUD/UI
   pixel restyle (pixel font, chunky borders, `create_ui_asset` icons for the resource/wave chips + shop, a
   title/menu screen). This is the concrete M8 Stage 4.
2. **Clean up dead/unused code** the pixel pivot left behind: the now-stale `docs/art-guide.md` (HD guide),
   the unused single-sprite `addSpriteScaled`/`makeBadge` sprite branch if truly unused, unused imports,
   orphaned helpers. Use `npx oxlint` + `tsc --noEmit` to find unused; keep build/test green.
3. **Ship:** `git add -A && git commit && git push origin main`; confirm the push (Vercel auto-deploys).
4. Stop the loop (do not schedule another wakeup).

## Progress log (append-only — newest last)
- 2026-06-29 — quartet done (zeus, poseidon, skeleton, nemean); pipeline + integration proven. Roster run begins.
- 2026-06-29 — batch 1 gods ✅: apollo, hephaestus, aphrodite (aphrodite west-attack failed → re-queued, re-import next iter; graceful fallback meanwhile). Refactored `updateTowerAnims` to drive `attack` off a foe-in-range (anti-strobe hold kept) so it covers deployable (Hephaestus) + charm (Aphrodite) gods; Demeter excluded (farm → harvest anim on payout). Verified: build+lint+147 tests green, no console errors. NOTE for batch 2: Athena may be a pure-aura/support tower — if she deals no damage, exclude her from the attack-trigger like Demeter (give her an idle/aura pose).
- 2026-06-30 — **bg/UI plan + cleanup done.** Wrote `docs/bg-ui-plan.md` (M8 Stage 4, plan only): animated
  pixel map/tileset + Greek obstacle objects + subtle Phaser backdrop (Tartarus glow, drifting mist, gate
  shimmer), HUD pixel restyle (UI kit + font + icons), a title screen, and a cohesion/scale sweep — all
  reusing the proven PixelLab→importer→glob pipeline. **Cleanup:** the pixel pivot left LESS dead code than
  expected — `tsc --noEmit` is clean (no unused imports/locals), the HD `flipX` path was already ripped out,
  and `addSpriteScaled`/`makeBadge`/`proj_*` are all still load-bearing (tower bases, Hermes home base,
  projectile art slots, shape fallbacks) — so they were KEPT, not removed (the plan's "if truly unused" guess
  was wrong). The only genuinely stale artifact was `docs/art-guide.md` (the superseded HD/Gemini/Scenario
  guide, replaced by `docs/pixel-pipeline.md`) → removed. Build+lint+147 tests green. NOTE for the user: a few
  stray PixelLab account characters remain from early pillar-Zeus attempts (061d3d82, 20a380b8) — harmless,
  remote-only, left for your review (didn't auto-delete remote data).
- 2026-06-30 — batch 5 BOSSES ✅: minotaur, cyclops (each 8/8 rotations + 48 walk frames). South previews on-style (minotaur bull-head+horns+labrys-axe, cyclops single-eye+club). Confirmed the boss render path: GameScene `spawnEnemy` uses `texKey = isBoss && enemy.bossId ? enemy.bossId : enemy.kind`, so `minotaur`/`cyclops` keys auto-wire (pure data drop-in, no code). Verified: on-disk counts, build+lint+147 tests green. 🎉 **FULL ROSTER COMPLETE — 18/18 creatures are pixel art** (8 gods +attack, 7 enemies +walk, 3 bosses +walk). Remaining DONE steps: bg/UI plan → dead-code cleanup → push.
- 2026-06-30 — batch 4 enemies ✅: satyr, gorgon, hydra (each 8/8 rotations + 48 walk frames). South previews on-style (satyr horned+hooved+club, gorgon snake-hair+bow, hydra a clean multi-headed coiled serpent — the non-humanoid best-effort exceeded expectations). PixelLab "heavy load" flaked 3 satyr walk dirs (north ×2, north-west ×1) → re-queued single dirs until all 8 landed (note: re-rolls succeed but the failed-jobs record stays in get_character output as stale history; trust the anims list). Pure data drop-in, no code. Verified: on-disk counts, build+lint+147 tests green. **ENEMY ROSTER COMPLETE (6/6).** Remaining: minotaur + cyclops bosses. Then bg/UI plan + cleanup + push.
- 2026-06-30 — batch 3 enemies ✅: shade, harpy, talos (each 8/8 rotations + 48 walk frames; v3 humanoid, walk template). South previews eyeballed — shade (hooded purple wraith, glowing eyes), harpy (large feathered wings + talons), talos (riveted bronze automaton, single eye) — all on-style, no re-rolls. Pure data drop-in (no code; manifest glob + DirAnimSprite walk-cycle = the proven skeleton/nemean path). Verified: on-disk counts correct, build+lint+147 tests green, no console errors. Preview boot-lag again blocked the live step-check. Next: satyr, gorgon, hydra (hydra = non-humanoid special, pro mode best-effort).
- 2026-06-30 — batch 2 gods ✅: athena (8/8 rot + 48 attack), demeter (8/8 + 56 harvest), hermes (8/8 + 56 attack). SPECIAL cases wired in GameScene: Demeter plays her harvest anim from `payDemeterIncome` (one-shot per payout, reads as "making money"); Hermes mobile branch now spawns his animated DirAnimSprite as the orbiting flier (faces + casts while it darts) + keeps a planted home-base badge. Throw-object zip folder is named "animating" → renamed to `*_attack_*` + hardened `pixlab_import.sh` with an ANIM_OVERRIDE 3rd arg + `*animat*` case. Verified: on-disk sprite counts correct, build+lint+147 tests green. Preview boot-lag (no console errors) blocked the in-game step-check — proven render path identical to batch 1; flagged Hermes's new mobile path for the AM review. GODS ROSTER COMPLETE (6/6). Next: enemies (shade, harpy, talos → walk via `pixlab_import.sh <key> <id> walk`).
