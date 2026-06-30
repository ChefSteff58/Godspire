# Godspire — Pixel Art Pipeline (PixelLab)

Decision research (2026-06-29). Verdict: **PixelLab is a strong pick — but whole-roster consistency
is UNPROVEN, so gate on a free test before paying.** You do **not** need the $50/mo tier.

## The honest answer on consistency (your #1 concern)

PixelLab's style tool is documented to match **ONE new sprite to ONE reference image** — it is *not*
documented or independently proven to hold **30 different creatures** on-model across distinct prompts.
There are **two separate drift axes** — don't conflate them:

- **Intra-character drift** (a belt/shadow/silhouette wandering between frames of one creature) —
  well-documented, and reliably hand-fixable per creature in Aseprite.
- **Inter-character drift** (do all 30 look like one artist?) — a **separate, unproven** axis. The
  playbook below is a *reasonable bet* to minimize it, **not a guarantee**.

➡️ **So Step 0 is a GATING test, not a warmup.** Pass it before you spend a dime.

## Pricing — skip the $50 tier

| Tier | ~Price | What it buys | For us |
|---|---|---|---|
| Free trial | $0 | ~40 fast gens, capped ~200px | **Run the gating test here** |
| Tier 1 (Apprentice) | ~$12/mo | ~1,000 gens, animation, 8-rotation, commercial license | Viable *if* you adopt the 80px workaround (style-base at 80px, upscale) |
| Tier 2 (Artisan) | ~$24/mo | ~3,000 gens, 140px headroom, priority | **Recommended buy** — covers the whole roster comfortably |
| Tier 3 (Architect) | ~$50/mo | ~6,000 gens, 20 concurrent jobs | Only worth **one month** to batch the roster in parallel, then downgrade |
| Pay-as-you-go API | ~$0.007–0.16/img | USD per image, no subscription | **Whole roster ≈ $10–25 one-time** — cheapest path |

A 30-creature roster ≈ 600–900 generations (8 rotations + ~2 short anims each, with re-rolls) — easily
inside Tier 2. **Confirm live prices + the exact size cap at app.pixellab.ai/#checkout** (some figures
online are unverified).

## Step 0 — the GATING test (free, do this first)

1. Take your cleanest Zeus frame — `rotations/south.png` — as the **style reference**.
2. Generate **3 different creatures** from it via **Bitforge / "Create image (style)"** (NOT Pixflux):
   one god (e.g. Poseidon + trident), one humanoid enemy (a skeleton), one beast (the Nemean Lion).
3. Line them up next to Zeus. **Do they read as "one artist made these"?**
   - **Yes →** subscribe Tier 2 (or Tier 1 + workaround) and run the playbook.
   - **No →** retune the knobs (Steps 4) and retry, *or* trial **Sprixen** (10 free credits) — its
     project-wide Style Lock may hold a roster more structurally. Then decide.

## Consistency playbook (once the gate passes)

1. **Master palette:** make one tiny PNG strip of Zeus's exact colors; pass it as `color_image` on
   **every** generation so all 30 literally share one palette. (Color creep is a top drift cause.)
2. **Lock settings once, never vary:** same canvas size, same View, same Outline/Shading/Detail values,
   fixed seed. Two templates that share palette/outline/shading: **bipedal** (gods, humanoids) +
   **quadruped** (Nemean Lion, Cerberus).
3. **Always go through Bitforge "Create image (style)"** with Zeus as `style_image` + palette as
   `color_image` + fixed seed. **Never Pixflux** (text-to-pixel, no style input = #1 drift cause).
   Vary only the per-creature description.
4. **Tune two knobs once, then freeze:** `style_strength` + `extra_guidance_scale` (higher = tighter to
   Zeus but less per-god identity). Lock these during Step 0.
5. **Rotate from the same base** (8-rotation tool) — never incrementally (errors compound).
6. **Animate from the rotated frames** (skeleton + reference). Animate a few prominent directions and
   **mirror east/west** rather than all 8 — keeps the frame count sane.
7. **Hand-fix the last 20% in Aseprite** (intra-character drift) — reliably fixable.
8. **Script Steps 3–6 via the PixelLab Python SDK** (`pip install pixellab`) so style/palette/seed/view/
   outline/shading stay constant in *code* and only the description changes — removes human-introduced
   drift and outputs straight into the existing `rotations/<dir>.png` + `animations/<Anim>/<dir>/frame_XXX.png`
   layout. (The agent does this part.)

## The alternatives (so we're sure)

- **Sprixen (~$10/mo):** a real, cheaper rival — 8-direction *isometric* turnarounds + 128px + project-wide
  **Style Lock** (palette/resolution/proportions enforced across every asset, arguably more structural than
  PixelLab's per-image ref). Caveats: **isometric** (verify angle vs our top-down Zeus), 128px max. **Worth a
  10-credit A/B** if PixelLab's gate wobbles.
- **Sprite-AI (~$8+):** 16–128px, editor + animator + palette transfer + atlas export + MCP — Phaser-friendly,
  but **no documented 8-direction turnaround**. A finish-quality / animation alternative.
- **Scenario (~$45–125):** strongest *custom-trained* consistency (train one "Godspire style model"), but a
  general platform — not native pixel 8-dir. The "scale later if the roster balloons" option.
- **Retro Diffusion:** ruled out — locked to 32/48px + 4-direction. Static illustration only.

## Risks (eyes open)

- Whole-roster consistency is the unproven bet — **the Step 0 gate is how we de-risk it.**
- Don't use Pixflux for the roster (no style input).
- Per-direction animation can explode — animate prominent dirs + mirror.
- Beasts need the second (quadruped) template or proportions drift.
- Confirm all pricing + the Bitforge size cap + reference-image limit in-app; several online figures are unverified.
