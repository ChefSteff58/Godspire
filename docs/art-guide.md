# Godspire — Sprite Art Guide (M8 Stage 3)

How we generate the ~30 bespoke sprites consistently. Drop a finished PNG named `<key>.png`
into `src/game/assets/sprites/` and it renders in-game automatically (keys = god / enemy / boss ids).

## Locked art direction

- **Camera:** 3/4 top-down. The *ground shadow* reads as a tilted ellipse (~45° "from above"),
  but the **torso + face stay ~25–35° front** so the face, emblems, and hand-effects survive at 32px.
  (Asking for a literal 45° on the whole body hides the face — this split is the key trick.)
- **On the ground** — soft elliptical shadow under the feet. **No pedestal / pillar / column / raised base.**
- **Proportions:** balanced heroic-cartoon (big readable head, capable body; not chibi, not realistic).
- **Pose:** confident calm **idle**, element only **hinted** (a few sparks at the hand) — never mid-action.
- **Finish:** bold near-black `#1A1A2E` outlines (reads as black at 32px, avoids pure-#000 banding),
  flat cel-shading (2–3 shade bands), vibrant saturated colors (rich, not neon), strong silhouette.
- **Output:** single centered character, transparent PNG, authored ~1024px then proofed at 32 & 64px.

## Animation: two frames per creature (idle + action)

Each creature = **one static sprite the engine animates with tweens**, PLUS a **second "action" frame** that
swaps in briefly for punch. No hand-drawn frame sequences, no Spine rig.

- **Files:** `<key>.png` = idle (default), `<key>_action.png` = action. Both auto-load via the glob.
- **Gods:** action frame = an attack pose; the engine swaps to it the moment the god fires (+ a forward
  lunge), then snaps back to idle. Layered on idle-bob, hit-flinch, death-burst.
- **Monsters:** action frame = an alternate **walk pose**; the engine alternates idle↔action as they move
  for a walk-cycle (wings/legs).
- **Critical:** generate the action frame **from the finished idle frame** (Nano-Banana edit), changing
  ONLY the pose — keep the same character, style, size, and **feet position / footprint**, or the swap
  jumps. Same anchor/center across both frames.

Engine motion vocabulary (all in code, applies to every sprite): idle bob · spawn squash-pop · attack
lunge + frame-swap (gods) / walk-cycle (monsters) · hit scale-punch + white flash · death burst + fade.

## Hero prompt (Zeus — the "golden master")

> Zeus, king of the Greek gods, as a single full-body 2D game tower character sprite. Heroic-cartoon
> proportions: large readable head, broad capable mighty body, epic but friendly (not chibi, not
> realistic). Thick white beard, white tousled hair, short gold laurel crown, white-and-deep-blue toga
> over one shoulder with gold trim and a glowing gold lightning-bolt chest emblem. Confident calm IDLE
> stance, one hand open at his side with a FEW small electric-blue sparks at the fingertips (power
> hinted, not mid-throw). He stands directly on flat ground with a soft semi-transparent elliptical
> shadow beneath his feet — NO pedestal, NO pillar, NO column, NO raised base. Camera: three-quarter
> view, high angle, from above and slightly in front — the ground shadow reads as a tilted ellipse
> (~45° ground read) but the torso and face stay ~25–35° front so the face, emblem, and hand-sparks
> stay fully visible. Bold near-black (#1A1A2E) outlines, flat cel-shading (2–3 bands), vibrant clean
> saturated colors (rich, not neon), strong silhouette. Single isolated character, centered, full body,
> transparent background, reads clearly at 32–64px.

**Avoid:** pedestal, pillar, column, statue base, raised platform, bird's-eye / overhead / top-down 90°,
flat front view, side profile, isometric, multiple characters, extra limbs, cropped, face hidden,
mid-action / throwing pose, busy background, scenery, realism, photo, blur, text, watermark, neon.

## One-line-swap template (every other sprite)

Keep the hero prompt fixed; swap only the character + its color/effect identity. **Always restate the
camera + ground clause** — never trim it.

> `[CHARACTER + identity]`, as a single full-body 2D game tower character sprite. Heroic-cartoon
> proportions … standing in a confident calm IDLE on flat ground with a soft elliptical shadow (no
> pedestal/pillar) … `[element hinted at the hand]` … 3/4 high angle: ground shadow a tilted ellipse but
> torso + face ~25–35° front, face visible … near-black `#1A1A2E` outline, flat cel-shading 2–3 bands,
> vibrant saturated (not neon) … single centered isolated sprite, transparent, reads at 32–64px.

Per-god identity hints: Apollo = gold, sun glow, bow at rest · Poseidon = teal, water droplets at hand,
trident · Demeter = green/wheat, grain · Hermes = winged sandals, speed lines · Hephaestus = forge-orange,
hammer/sparks · Aphrodite = pink, charm hearts · Athena = owl, aegis/spear, steel-blue.

## Tools (decided 2026-06-29 bake-off)

- **Primary → Gemini / Nano-Banana (Gemini 3 Pro Image).** Best cross-sprite consistency (accepts ~14
  reference images + conversational "keep everything, change only X"). One god per generation; **re-anchor
  to the master Zeus every time** (drift starts ~4th–5th image). Free in-app (≈2/day on free tier; more +
  no watermark on a paid Google tier). If output isn't transparent, the agent removes the background.
- **Paid insurance → Scenario.** Free ~50 credits/day to generate; its real edge is a **trained style
  model** (~30–60 min, needs Pro ~$45/mo, cancelable) = the most identical-looking full set. Only buy one
  month if Gemini's look wanders across 30 sprites; train on the best Gemini outputs, batch the rest, cancel.
- **Dropped:** Leonardo + Recraft (off-style here), Sprixen (pixel-art), Midjourney (no transparency).

## Style-anchor recipe (lock once, reuse 30×)

1. **Nail the hero.** Generate many Zeus batches; pick the ONE with the clearest silhouette, face turned
   toward you, ground-shadow ellipse + ~25–35° front torso, sparks visible. This is the golden master.
2. **Proof at game size.** Get it transparent, downscale to 64px and 32px. If the face mushes or the
   outline vanishes, FIX the master now (thicker outline, bigger head, fewer details) — everything copies it.
3. **Write the recipe down.** Lock exact hexes: outline `#1A1A2E`, the ≤4-color body palette, 2–3 shade
   bands, "on ground + elliptical shadow," and the split-camera clause. Paste these identical words every time.
4. **Pick the consistency engine.** Easiest: keep the master as a style/character reference in Gemini.
   Strongest: train a Scenario style-model on 10–30 master variants.
5. **One-line-swap** per new sprite (template above). Generate 4, pick best, transparent-ify, proof at 32/64px.
6. **Gods → enemies → bosses,** all anchored to the master so they share one world. Bosses get bigger,
   grander silhouettes (wings/horns/crown) but the **same finish + camera**.
7. **Upgrade tiers:** reuse that god's image + add ONE silhouette flag per tier (cape → wings → crown/halo).
   Keep the same calm idle; escalate via gear/aura, not pose.
8. **Anchor point:** center every sprite the same way on its footprint so engine tweens line up.
9. **Final QA:** view the whole set at ~48px together; re-roll anything that doesn't match the master's
   outline color/weight, palette, or camera.

## Pitfalls (most common)

- "top view / overhead / bird's-eye" → faceless hat. Use the split-camera stack instead.
- Typing "transparent background" can give a gray checkerboard/fringe on some tools; prefer the tool's
  Remove-Background, or let the agent cut it.
- Identity tools (Character Reference at high strength, MJ `--cref`) copy the same *person* and bleed gods
  together — use the **style** channel, not identity, for different gods.
- Seeds only re-roll the *same* sprite; they don't enforce style across different gods.
- Generate large then downscale — never author at sprite size.
- Tiers must change the **silhouette**, not just recolor.
