# Godspire — God Roster & Boon Design

> Design-locked reference (2026-06-28). Roster = the user's 8 BTD6-analogue picks, fleshed out
> by a multi-agent pass + cohesion critic. Identities are frozen; numbers stay fluid (tuned in M5).

## Tower access: **TRADITIONAL** (decided)

Any *unlocked* god is freely buyable from the shop with gold — **no per-run god draft**. The
persistent skill tree is the sole god-unlock gate (an `unlockGod` node → a run-start `unlockedGods`
set); ship 3–4 always-on starters. The Fate Draft stays boons-only; `draft.ts`'s `{type:'god'}`
arm stays dead-but-typed.

## God roster (8 — LOCKED)

| God | BTD6 analogue | Role | Counters | Cost | Signature |
|---|---|---|---|---|---|
| **Zeus** | Dart Monkey | Foundational early-game DP | fast, stealth, armor | 200 | A hitscan bolt that strikes the lead foe instantly every shot |
| **Apollo** | Sniper Monkey | Anchor lane-clearer and ra | swarm, splits, armor | 250 | A single arrow flies straight down the lane and pierces every monster in that single-file column, so positioning Apollo  |
| **Demeter** | Banana Farm. Path A mirrors the Ba | Economy | — | 300 | Harvest: at every wave-clear she drops a flat gold payout into the ledger ON TOP of normal wave income |
| **Hephaestus** | Spike Factory | Last line of defense | armor, swarm, splits, fast, tanky | 230 | Hephaestus never shoots from his own tile |
| **Aphrodite** | Glue Gunner (Path A) | control | fast, swarm | 220 | Enemies she hits 'fall in love' |
| **Hermes** | Monkey Ace (Path A strafing plane) | Roaming anti-air and flexi | flying, fast, swarm | 275 | Hermes never sits still: his pos updates every frame as he flies (a looping flight route, or a hover-orbit over a chosen |
| **Athena** | Monkey Village (support hub / buff | Support hub | stealth | 320 | A persistent radius aura that multiplies the effective stats (damage / fire-rate / range) of every friendly god standing |
| **Poseidon** | Monkey Sub | anti-swarm | swarm, splits, fast, tanky, armor | 300 | Tidal Slam: every shot detonates a true AoE splash over a swath of path that damages ALL enemies in the radius AND knock |

### Full kits

#### Zeus, the Stormking — *"I have a god complex. I'm allowed — I'm a god."*
- **BTD6:** Dart Monkey crossed with the Sniper Monkey — the cheap starter single-target that the player upgrades into either a crowd-arcing line (Path A, Druid-of-Storm fl
- **Signature:** A hitscan bolt that strikes the lead foe instantly every shot — zero travel time, never misses, so fast and stealthy enemies can't outrun or dodge it.
- **Base stats:** cost 200 · range 135 · dmg 5 · rate 1.5
- **Chain Lightning** — The bolt refuses to stop at one
  - *Forked Bolt:* Every bolt arcs from the primary target to 1 additional enemy within ~70px, dealing 60% of the hit's damage. First taste of width: a Zeus that quietly doubles i
  - *Storm Caller:* Arcs to 3 total extra enemies (each link ~65% of the previous link's damage, so it tapers down the chain). Arc search range widens to ~85px. Now a genuine swarm
  - *Wrath of the Sky:* Arcs to 6 total extra enemies and the taper softens (each link ~80% of the prior). Chains can now bounce back to re-hit the lead target once if no fresh target 
- **Tyrant's Bolt** — Fewer, godlier hits
  - *Heavy Bolt:* Damage x3.5 (5 -> ~18) and range +25% (135 -> ~170), but fire rate halved (1.5 -> 0.75). Net single-target DPS roughly holds while burst-per-hit and reach jump 
  - *Smite:* Damage x8 of base (~40/hit) and range +60% total (~215, matching Apollo's reach). Fire rate 0.6. Each strike now ignores a flat chunk of armor (overwhelming sin
  - *Bolt of the Titanomachy:* Damage x18 of base (~90/hit), range ~250 (longest in the roster), fire rate 0.5. Strikes pierce ALL armor entirely and deal bonus damage to bosses. One god, one
- **Needs (new primitives):** chain; armor + armor-pierce; bonus-vs-boss damage tag

#### Apollo, the Far-Shooter — *"Apollo doesn't miss. He just occasionally lets the front three share an arrow — and the rest of the line catch fire about it."*
- **BTD6:** Sniper Monkey crossed with a Dartling Gunner: a long-range straight-line raker (Sunlance = the pierce/velocity "rake" line; Plague-Ender = the burn-DoT line lik
- **Signature:** A single arrow flies straight down the lane and pierces every monster in that single-file column, so positioning Apollo to aim down a long straight turns one shot into a whole-lane rake.
- **Base stats:** cost 250 · range 210 · dmg 8 · rate 0.9
- **Sunlance** — Pure pierce and projectile velocity — the swarm/split lane-raker
  - *Long Draw:* +2 pierce (2 → 4) and +60% projectile speed (1400 → ~2240 px/s). Faster arrows track the lead enemy more reliably and the column shot rakes deeper into the pack
  - *Noon Volley:* Each shot fires 3 parallel arrows in a tight fan (each keeps full pierce) and +25% fire rate. Carpets the lane instead of threading one line — turns Apollo into
  - *Solar Spear:* Infinite pierce: the arrow passes through every enemy in range and never expires on pierce. Each enemy already pierced this shot adds +1 damage to subsequent hi
- **Plague-Ender** — Arrows ignite a burning DoT that ignores armor — Apollo as god of plague, not just sun
  - *Fever Arrow:* Hits ignite a burn: 3 ticks/sec of 2 true damage for 3s (≈18 true damage, ignores armor entirely). Pierce still applies, so one arrow can light an entire column
  - *Wasting Sickness:* Burn stacks (refreshing re-applications add intensity, up to 3 stacks) and lingers 5s. Burn damage scales with the target's max HP (e.g. +1% maxHP/tick), so the
  - *Apollo's Wrath:* When a burning enemy dies, its plague leaps to all nearby foes, applying a fresh burn (a rolling pyre). Apollo's own burn ticks also gain +50% crit-style spikes
- **Needs (new primitives):** DoT / status ticks; armor-pierce / true-damage flag; multi-shot / parallel-projectile spawn; per-shot scaling-on-pierce damage; infinite/unbounded pierce handling; AoE / proximity query for on-death status spread; maxHP-scaling damage hook; crit / bonus-vs-boss multiplier

#### Demeter — *"Other gods reap monsters. I reap dividends — and famine is just a poorly diversified portfolio."*
- **BTD6:** Banana Farm. Path A mirrors the Banana Plantation / Central Market passive-income line; Path B mirrors the Monkey Bank's compounding-interest vault.
- **Signature:** Harvest: at every wave-clear she drops a flat gold payout into the ledger ON TOP of normal wave income. She does not fight — her output is GOLD, not damage.
- **Base stats:** cost 300 · range 90 · dmg 0 · rate 0
- **Cornucopia** — Pure passive income that scales with zero upkeep — plant it, ignore it, get richer
  - *Golden Harvest:* Harvest payout 60 → 120 gold per wave-clear. Pure passive: doubles her settle() yield, halving break-even to ~3 waves. Still attacks nothing.
  - *Horn of Plenty:* Harvest 120 → 240 per wave AND it now grows +15 gold for each wave survived this run (so it ramps as waves escalate — a built-in answer to the late-game bounty 
  - *Eternal Spring:* Harvest 240 → 400 per wave, PLUS a passive +1 gold for every enemy killed anywhere on the map (a global trickle layered on the existing goldPerKillBonus pipe). 
- **Vault of Plutus** — Active, compounding wealth tied to kills and a banked balance — riskier, higher ceiling
  - *Tithe Sheaf:* Enemies that die within her range=90 pay +50% bounty, and that surplus is deposited into her Vault (a per-tower balance) instead of your purse. Turns her radius
  - *Interest of Plutus:* At each wave-clear the Vault grows by 15% interest, capped at +150/wave — literally activating the ledger's already-stubbed INTEREST_RATE/INTEREST_CAP hook, but
  - *Demeter's Reckoning:* Tap her to Withdraw the entire Vault into your gold instantly (then it resets and recompounds). Capstone risk/reward: a fat Vault is a war chest for an emergenc
- **Needs (new primitives):** money-gen; money-gen; money-gen; detection; deployable/active-ability; aura

#### Hephaestus — *"Olympus has gods who throw lightning. I have a god who reads the warranty, then drops a thousand caltrops on the doormat." — Hephaestus doesn't aim; he supplies.*
- **BTD6:** Spike Factory crossed with the Engineer Monkey (with a touch of Mortar's armor-break flavor on Path B)
- **Signature:** Hephaestus never shoots from his own tile. Instead he periodically MANUFACTURES persistent deployables onto the path (caltrop stacks or mini-turrets) that damage enemies independently of him. He is a producer, not a shooter: his "range" is a build-radius, his "fireRate" is a production tempo, and the things he makes are what actually deal the damage. He also stockpiles up to a cap during quiet stretches, so a calm wave front-loads a wall of ordnance for the next push.
- **Base stats:** cost 230 · range 90 · dmg 6 · rate 0.5
- **The Caltrop Forge** — Stockpiling spikes — pure end-of-track cleanup
  - *Deeper Stockpile:* Spike cap 8 → 20 and each spike carries 5 charges instead of 3. A quiet wave now banks a literal minefield for the next rush; brutal vs Shade swarms and Hydra s
  - *Caltrop Cluster:* Each forged unit drops a 3-spike cluster covering a wider band of path, and spikes deal +50% damage to enemies in the LAST 15% of the track (the gate kill-zone)
  - *Adamant Spikes of the Underworld:* Spikes ignore armor entirely (full damage to Talos), gain a small shrapnel splash on pop, and on big waves overflow stock auto-scatters down the lane. The end-o
- **Line of Automatons** — Deployable mini-turrets that fire on their own — sustained area DPS and the explosive armor-cracker
  - *Bronze Sentry:* Forged units are now mini-turrets instead of spikes: each is a stationary automaton with its own hitscan (dmg 5, range 70, 1/s) that lasts ~12s before powering 
  - *Talos-Pattern Gunner:* Automatons fire armor-piercing slugs (ignore Talos armor) and live longer (~20s, +1 forged at a time). This is his marquee ARMOR + TANKY answer — a wall of sent
  - *The Bronze Bull (Talos Reforged):* Periodically forges one elite Automaton: long range, explosive AoE shots (splash damage that strips armor in a radius), and it roams a short stretch of path. A 
- **Needs (new primitives):** deployable; armor-pierce; AoE / splash; money-gen-adjacent stockpile logic; mobile

#### Aphrodite — *"You can't outrun love, darling — and you definitely can't outrun it at minus seventy percent speed."*
- **BTD6:** Glue Gunner (Path A) crossed with Ice Monkey (Path B) — control over damage
- **Signature:** Enemies she hits 'fall in love' — they get SLOWED and CHARMED, and a charmed foe takes bonus damage from ALL sources (she multiplies the team's shots-on-target instead of dealing damage herself)
- **Base stats:** cost 220 · range 150 · dmg 1 · rate 1.2
- **Glue & Charm** — Heavy single-target lockdown — turn one dangerous foe (a boss, a fast runner) into a crawling, hyper-vulnerable damage sponge the whole team piles onto
  - *Sticky Infatuation:* The love-dart becomes GLUE: slow deepens to -45% speed and the vulnerability deepens to +25% damage-taken; both durations extend to 4s. The charmed target also 
  - *Hopeless Devotion:* Charm now STACKS up to 3 times on a single target (each dart adds another layer): at full stack the foe is -70% speed and takes +50% damage from every god. A gl
  - *Fatal Attraction:* A fully-charmed enemy that dies SHATTERS its devotion onto the nearest un-charmed foe (charm jumps once on death), and while at max stack the target also takes 
- **Winter Aphrodite (Cold-Hearted)** — AoE area-denial — a chilling field of unrequited love that slows whole clusters and briefly freezes the densest knots; the swarm-and-fast-rush answer
  - *Cold Shoulder:* Aphrodite stops firing darts and instead emits a constant SLOW AURA: every enemy inside her range moves -30% speed (no damage). Range widens by +20%. The classi
  - *Heart of Ice:* Enemies that dwell in the aura past 2s briefly FREEZE (speed 0) for 0.8s, then resume slowed — a rolling stutter that shreds FAST runners and bunches swarms int
  - *Eternal Frost:* The freeze hits ALL enemies in range simultaneously on a short pulse (a mass freeze every ~4s) and frozen enemies take +30% damage while iced. Pairs obscenely w
- **Needs (new primitives):** slow; freeze; vulnerability-amp; slowAura; freezeAura; DoT; status-stacking

#### Hermes — *"Rules are for things that stay on the ground." — Hermes, already three build-pockets away.*
- **BTD6:** Monkey Ace (Path A strafing plane) crossed with Heli Pilot (Path B hovering gunship) — the airborne, self-relocating attacker that can hit air.
- **Signature:** Hermes never sits still: his pos updates every frame as he flies (a looping flight route, or a hover-orbit over a chosen zone), so his range bubble sweeps the map instead of camping one tile — and he is the one god who can lock onto FLYING enemies. He is, in engine terms, "a tower whose position is a function of time," and he is the anti-air pillar.
- **Base stats:** cost 275 · range 120 · dmg 3 · rate 3
- **Strafing Ace** — A winged warplane that screams along a player-set flight path across the whole map — wide, mobile coverage that rakes the track on every pass
  - *Set Flight Path:* The player draws/relocates Hermes' looping route (a polyline he flies on repeat at a fixed air-speed). His range bubble now sweeps every build pocket and track 
  - *Caduceus Wingmen:* Hermes fires from BOTH wingtips in a parallel spread — effectively two target locks per pass (doubles shots-on-target through a crowded lane, the swarm/fast cle
  - *Sky-Sovereign's Sortie:* Hermes flies a wider, faster loop with a much larger range bubble (range x1.6, air-speed x1.5) and gains a 'bombing run': every few seconds his pass drops a sma
- **Hermes' Escort** — A hovering messenger-gunship that camps a single chokepoint, orbiting in a tight hover and raining rapid darts straight down — pinpoint, high-uptime air denial
  - *Hover Station:* Hermes stops touring and hovers in a tight orbit over a chosen zone (a small fixed circle, not a map loop), so a target stays in his bubble nearly the whole tim
  - *Winged Sandals' Lock-On:* Hermes prioritizes FLYING enemies and gains +60% damage versus air (the dedicated Harpy-deleter), with lock-on tracking that sticks to one Harpy until it dies b
  - *Psychopomp's Toll:* His hover-zone becomes a no-fly killbox: darts fire in a fan that tags every enemy under the orbit (mini-AoE), Harpies take execute-tier bonus damage, and any f
- **Needs (new primitives):** mobile; anti-air; antiAirPriority; AoE; money-gen; crit/execute

#### Athena — *"Strength is loud. Wisdom is the reason your whole pantheon suddenly aims better — and the reason the invisible ones stopped being invisible."*
- **BTD6:** Monkey Village (support hub / buff beacon + special-vision granter)
- **Signature:** A persistent radius aura that multiplies the effective stats (damage / fire-rate / range) of every friendly god standing inside it — and grants those gods stealth DETECTION — by riding the existing fire-time run-modifier pipeline, applied positionally instead of globally.
- **Base stats:** cost 320 · range 110 · dmg 0 · rate 0
- **Wisdom of War** — Offensive aura — turns the hub into a damage amphitheater that sharpens every blade in radius (the crit pillar lives here)
  - *Battle Doctrine:* Aura damage buff rises from +10% to +25%, and the aura radius grows +20%. Gods inside hit noticeably harder.
  - *Coordinated Strike:* Gods in the aura gain +15% crit chance (crits deal 2x damage). Athena turns a cluster of mediocre attackers into a burst-damage firing squad.
  - *Aegis of Victory:* Aura buff becomes +50% damage and +30% crit chance, and crits now deal 2.5x. Enemies that die inside the aura grant +1 bonus gold. The amphitheater is now a kil
- **Strategist** — Utility aura — the war-room that sees all and discounts everything (the detection + economy + range pillar)
  - *All-Seeing Aegis:* Aura radius +40% and its stealth DETECTION now also reveals stealth enemies for ALL gods globally (not just those in radius) — one Athena solves the entire Gorg
  - *War-Council Economy:* Gods placed inside the aura cost 20% less to build and to upgrade, and the aura grants +25% RANGE to gods inside it. Build your whole cluster cheaper and let it
  - *Grand Strategy:* Aura grants +30% range, +20% fire-rate, build/upgrade discount rises to 35%, and once per wave Athena issues a 'Tactical Command' that instantly refreshes the a
- **Needs (new primitives):** positional-aura; detection; effective-range modifier; crit; build-cost discount; cooldown-refresh trigger; money-gen on kill in radius

#### Poseidon — *"Make way. I am the reason you don't build near water."*
- **BTD6:** Monkey Sub x Monkey Buccaneer water-gated hybrid. Path A = Buccaneer-style broadside warship (Grape Shot / Cannon Ship area barrage). Path B = Monkey Sub torped
- **Signature:** Tidal Slam: every shot detonates a true AoE splash over a swath of path that damages ALL enemies in the radius AND knocks each one backward down the path (pathT -= d), shoving the front of a swarm back into the foes behind it. One crisp thing: hit-the-group-and-shove-them-back.
- **Base stats:** cost 300 · range 150 · dmg 6 · rate 0.8
- **Battleship** — Tsunami — long-range area barrage + harder mass knockback; the straightaway crowd-reset that turns a winding lane into a wall of surf
  - *Broadside Volley:* +50% splash radius (~45px → ~68px) and +25% range (150 → ~188). The slam now blankets a whole path segment; trades nothing — pure area uplift so a single shell 
  - *Tidal Bombardment:* Fires a 3-shell spread per volley landing across staggered points on the path, and knockback distance +40% (~3% → ~4.2% pathT). Mass crowd-reset: three overlapp
  - *Wrath of the Deep / Tsunami:* Periodically (every ~5s) the next slam becomes a full-lane TSUNAMI: a wave sweeps the entire visible path, big damage to all, and knocks every non-boss enemy ba
- **Submarine** — Maelstrom — heavy single-target torpedoes that dive, pierce armor, and surface what's hiding; the boss/tank/stealth answer that gives up the crowd-wipe for precision
  - *Torpedo Bay:* Converts the tidal slam into a homing torpedo: drops the wide splash for a tight single-target hit, but +150% damage (6 → ~15) and the torpedo carries ARMOR-PIE
  - *Depth Charge Sonar:* Gains DETECTION: reveals STEALTH (Gorgon-kin) enemies within range for itself and nearby gods, and torpedoes auto-prioritize revealed/submerged foes. +20% fire 
  - *Leviathan Torpedo / Maelstrom:* Torpedoes detonate for a small armor-piercing AoE on impact (regains a little splash) AND leave a lingering WHIRLPOOL at the hit point for ~3s that damages and 
- **Needs (new primitives):** AoE / splash damage; knockback; splashRadiusMul; knockbackMul; detection; armor-pierce; slow / DoT-zone

## Counter coverage (cohesion pass)

| Enemy property | Strength | Answered by |
|---|---|---|
| swarm (Shade) | **solid** | Zeus Path A Chain Lightning, Apollo Path A Sunlance, Hephaestus Path A Caltrop Forge, Aphrodite Path B Winter, Hermes Pa |
| baseline (Skeleton) | **solid** | Zeus base, Apollo base, Hermes base, everything |
| flying (Harpy) | **thin** | Hermes |
| armor (Talos) | **solid** | Zeus Path B Tyrant's Bolt, Apollo Path B Plague-Ender, Hephaestus Path A T3 + Path B T2/T3, Poseidon Path B Torpedo Bay |
| stealth (Gorgon-kin) | **thin** | Athena base aura + Path B All-Seeing Aegis, Poseidon Path B Depth Charge Sonar |
| splits (Hydra) | **solid** | Apollo Path A pierce, Hephaestus Path A spikes, Poseidon base + Path A AoE, Zeus Path A chain |
| fast (Satyr) | **solid** | Zeus base/Path A, Aphrodite, Hermes, Poseidon knockback |
| tanky (Cyclops) | **solid** | Zeus Path B single-target deletion, Apollo Path B maxHP-scaling burn, Aphrodite Path A vulnerability stacking, Poseidon  |
| boss (every 10 waves) | **solid** | Zeus Path B Bolt of the Titanomachy, Apollo Path B Wrath, Aphrodite Path A lockdown, Poseidon Path B boss-melt, Athena b |

### ⚠️ Coverage fixes to fold in (priority order)

- FLYING IS THE ROSTER'S SINGLE POINT OF FAILURE. With Ares/Artemis dropped, anti-air collapsed onto Hermes alone — the only canHitAir god, and a premium 275 one at that. In a roguelike with randomized Fate Drafts you cannot guarantee Hermes is offered or affordable, so a Harpy wave can be literally unanswerable. DECISION: give Apollo a base/Path-A clause to strike flying enemies in his column (thematically clean — arrows fly down the lane), demoting Hermes from 'only answer' to 'efficient specialist.' This is the highest-priority fix in the review.
- STEALTH-DETECTION needs a cheaper, more reliable home than Athena-Path-B-or-bust. Today the global reveal is gated behind Athena's Path B (320 god, then upgraded) and the only alternative is water-gated land-only Poseidon sonar. DECISION: make base Athena's in-aura detection officially 'count' (matrix = thin not missing), and add detection as a low-cost Favor skill-tree node and/or innate detection on Hephaestus' automatons, so a stealth wave is never a hard brick.
- ARMOR-PIERCE is over-homed (Zeus B, Apollo B, Hephaestus, Poseidon B = 4 answers) while flying/stealth are under-homed (1–2 each). The re-homing of dropped-Ares armor succeeded TOO well. Rebalance design budget: armor coverage is safe at 2–3 homes; redirect the surplus toward the second anti-air option above.
- BUILD-SEQUENCING IS SOUND AND SHOULD BE FOLLOWED LITERALLY: ship Zeus(base+PathB-stats) + Demeter(base+PathA) + Apollo(base+Sunlance-T1) on TODAY's engine with zero new primitives; then mobile(Hermes) → deployable(Hephaestus) → chain(Zeus-A) → AoE+knockback(Poseidon) → status(Aphrodite/Apollo-burn) → positional-aura(Athena). Aphrodite is ~0% functional without the status system and Poseidon is a worse-Apollo without AoE+knockback — never ship either before its primitive lands.
- NEVER SPLIT A GOD FROM ITS ENEMY. The three identity-defining counters (Hermes anti-air, Athena/Poseidon detection, everyone's armor-pierce) are no-ops until M4 lands their target enemy (Harpy/Gorgon-kin/Talos). Ship the mobile/aura/deployable CHASSIS early for the novelty, but gate each god's COUNTER identity to the exact milestone that introduces the enemy it answers, so the player never gets a tool with nothing to use it on (or vice versa).

### Build order (ship sequence — follow literally)

1. TIER 0 — SHIP TODAY, no new primitives (pure stat tables on current hitscan/projectile engine): Zeus base + entire Path B (minus armor-ignore) — pure damage/range/fireRate tuning through existing effectiveDamage/effectiveFireRate; Apollo base + Sunlance T1 (pierce/speed bump); Demeter base + full Path A Cornucopia (one earn() line in settle() + existing goldPerKillBonus pipe).
2. TIER 1 — MOBILE primitive (per-frame tower.pos controller; selectTarget already takes pos as a param): Hermes mobile chassis (route + hover), Path A T1/T2, Path B T1. Smallest new primitive, biggest novelty payoff — build first among new mechanics.
3. TIER 2 — DEPLOYABLE primitive (persistent on-path actors with lifetime/charges/stock): Hephaestus base + Path A T1/T2 (spikes reuse flat damageEnemy) + Path B T1 Bronze Sentry (reuses Zeus hitscan with a lifetime).
4. TIER 3 — CHAIN primitive (arc-to-N with falloff): Zeus Path A Chain Lightning (the marquee chain showcase). Also unlocks the cut '+chain' boon.
5. TIER 4 — AoE/SPLASH + KNOCKBACK primitives: Poseidon base + Path A (his whole identity; do NOT ship Poseidon before this or he is a worse Apollo); Hephaestus T3 shrapnel/explosive; Hermes T3 bombing run/killbox.
6. TIER 5 — M4 ENEMY TRAITS gate the counter identities: ARMOR field (Talos) unlocks armor-pierce on Zeus Path B Smite, Hephaestus armor lines, Poseidon Torpedo Bay; FLYING flag (Harpy) + canHitAir unlocks Hermes Path B anti-air identity; STEALTH flag (Gorgon-kin) unlocks detection. Never split a god from its enemy — ship these alongside their M4 enemy.
7. TIER 6 — STATUS primitives (slow/freeze/vulnerability-amp/aura + DoT): Aphrodite (≈0% works without status — fully gated here): base + Path A T1/T2 need speedMul+vulnMul+freezeTimer on Enemy; Path B reuses the shared slowAura/freezeAura emitter. Apollo Plague-Ender (DoT + maxHP-scaling + on-death AoE). Poseidon Path B whirlpool (slow/DoT-zone).
8. TIER 7 — POSITIONAL-AURA + CRIT + build-discount + cooldown-refresh: Athena base damage/fireRate aura ships early-ish (rides existing fire-time fold with one positional helper), but her detection waits on Tier 5 stealth, her range-buff waits on range-as-multiplied-value, and crit/discount/Tactical-Command are their own primitives.
9. TIER 8 — MONEY-GEN advanced (per-tower Vault balance + interest stub + active-ability tap + kill-position attribution): Demeter Path B Vault of Plutus; Hermes T3 gold-on-flyer-kill; Athena T3 bonus-gold-in-aura.

**Cost curve:** "The 8 costs span 200→320 and read sensibly as a cheap→premium ladder, with role clearly tracking price. CHEAP CORE: Zeus 200 (always-correct starter DPS), Aphrodite 220 (cheap support, trivial damage), Hephaestus 230 (mid deployable). MID: Apollo 250 (long-range anchor), Hermes 275 (premium for sole anti-air + mobility). PREMIUM: Demeter 300 (pure investment, zero board presence), Poseidon 300 (water-gated AoE artillery), Athena 320 (most expensive, zero solo DPS, multiplicative payoff). The pricing logic is coherent: the two zero-DPS economy/support gods (Demeter 300, Athena 320) and the two

## Boon roster

### Shipped now (the 20-boon "ship-now" tranche — LIVE)

Globals + Zeus/Apollo per-god + economy/defense + 2 synergies, all on the M3 engine with the
design critique's balance fixes (soft caps on stacking, rarity-weighted draws, redundant
duplicates cut, negative-lives routed through the death check).

| Boon | Rarity | Cat | Effect |
|---|---|---|---|
| Midas' Windfall | common | eco | +200 gold |
| Tithe of the Fallen | common | eco | +2 gold/kill |
| Coin of Charon | rare | eco | +5 gold/kill |
| Spoils of War | epic | eco | +10 gold/kill |
| Favor of Fortuna | epic | eco | +350 gold & +10 lives |
| Divine Wrath | common | off | ×1.15 all dmg |
| Hermes' Tempo | common | off | ×1.12 fire rate |
| Blood of the Titans | rare | off | ×1.25 all dmg |
| Twin Volley | rare | off | ×1.25 fire rate |
| Relentless Onslaught | epic | off | ×1.20 dmg & rate |
| Wrath of the Pantheon | legendary | off | ×1.50 all dmg |
| King of Storms | common | core | Zeus ×1.30 dmg |
| Noon Glare | common | core | Apollo ×1.30 dmg |
| Draught of Ambrosia | common | def | +20 lives |
| Aegis of Athena | rare | def | +15 max lives |
| Bulwark of Styx | epic | def | 5-charge gate shield |
| Second Wind of Nike | legendary | def | survive 1st defeat at 25 |
| Festival of Dionysus | epic | util | ×1.35 fire rate |
| Storm Front | rare | syn | Zeus ×1.35 & all ×1.10 rate |
| Gambler's Laurel | legendary | syn | coin flip ×1.8 / ×0.8 dmg |

### Deferred boons (land per-god, with each god + its primitive)

The full ~79-boon design includes per-god signature boons (chain/pierce/slow/DoT/AoE/detection
amplifiers) and economy levers (interest, bounty mult, build discount). They map to the new
effect kinds below and ship alongside the gods/mechanics they belong to (M4/M5) — NOT now, since
most reference mechanics that don't exist yet. Deferred per critique: interest boons (economy-
breaking), per-god boons for the unbuilt gods, and anything needing slow/crit/DoT/splash/pierce.

### New effect kinds shipped now

`maxLivesAdd`, `gateShield`, `secondWind`, `composite` (multi-effect), `coinflipFold` (50/50 on pick)
— all pure run-number, plus soft caps `FIRE_RATE_CAP=3` / `TOWER_DAMAGE_CAP=12` and rarity-weighted drafting.
