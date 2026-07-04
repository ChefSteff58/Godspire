import Phaser from 'phaser'
import { useGameStore } from '../../state/gameStore'
import { useSessionStore } from '../../state/sessionStore'
import { PathSystem, OLYMPUS_PATH } from '../../core/map/path'
import { OBSTACLES } from '../../core/map/obstacles'
import { canPlace, pointInPoly } from '../../core/map/placement'
import {
  createEnemy,
  advanceEnemy,
  damageEnemy,
  onDeath,
  applySlow,
  enemyRadius,
  enemyColor,
  enemyStroke,
  damagedColor,
  damagedRadius,
  type Enemy,
  type SpawnDesc,
} from '../../core/entities/enemy'
import { bossById } from '../../core/data/bosses'
import { createTower, type Tower } from '../../core/entities/tower'
import {
  createProjectile,
  advanceProjectile,
  projectileDone,
  type Projectile,
} from '../../core/entities/projectile'
import { selectTarget, type TargetingMode } from '../../core/systems/targeting'
import { wavePreview } from '../../core/systems/waveManager'
import { TOWER_STATS, GOD_ORDER, sellValue, type GodKind } from '../../core/data/towers'
import {
  UPGRADES,
  towerEffectiveStats,
  auraBuff,
  demeterIncome,
  nextTier,
  canUpgradePath,
} from '../../core/data/upgrades'
import { favorFromRun } from '../../core/progress/rules'
import type { Vec2 } from '../../core/types'
import { RunController } from '../run/RunController'
import { arcPoints, boltPoints } from '../render/fx'
import { scatterDecor } from '../render/decor'
import { hasSprite, hasTileset } from '../assets/manifest'
import { DirAnimSprite } from '../render/DirAnimSprite'
import { layoutWangTiles, WANG_TILE_FOR_MASK } from '../render/wang'
import { stonePredicate, grassPredicate, isBuildableGround, terrainAt, TERRAIN_TILE_PX } from '../../core/map/terrain'
import { waterAt } from '../../core/map/water'
import { isLavaVertex, lavaVertexSet } from '../../core/map/lava'
import { SITES, siteBuffAt } from '../../core/map/sites'
import { dir8, dirToTarget } from '../render/facing'
import { GAME_WIDTH, GAME_HEIGHT } from '../dimensions'

const MAX_DELTA_MS = 50
const BOUNDS = { w: GAME_WIDTH, h: GAME_HEIGHT }
// Frame-budget guard: never let more than this many bodies live at once (targeting/collision loops
// are O(towers × enemies) / O(projectiles × enemies)). Over-budget wave spawns DEFER, they don't drop.
const MAX_CONCURRENT_BODIES = 60
// Fixed sim substep: at 3× a single 150ms step let fast arrows tunnel straight through hitboxes, so
// the sim always advances in ≤16ms slices (1 step at 1×, up to ~9 at 3× — capped so a hitched tab
// can't spiral). Render/mirror still happen once per real frame. Matches devStep's 16ms convention.
const SIM_STEP_MS = 16
const MAX_STEPS_PER_FRAME = 12
// M10-S5 BTD6-CHUNKY: one dial scales the whole unit layer (user-gated at 1.35/1.45/1.55).
// HITBOXES DO NOT SCALE — art > hitbox is the BTD6 feel; placement/balance are untouched.
const SIZE_SCALE = 1.45
// M10-S8 CINEMATIC PASS (the three.js answer, done the right way): one full-screen color grade +
// one bloom pass on the main camera — shader-level polish inside Phaser, no second engine.
// Kill-switch for old hardware / taste comparison.
const CINEMATIC_GRADE = true
// On-screen height (px) an HD god sprite is drawn at — bigger than the placeholder discs so the art reads.
const TOWER_SPRITE_PX = Math.round(72 * SIZE_SCALE)
// Keep a pixel tower in its cast animation this long after each shot, so a flickering target can't
// strobe the cast back to idle (the bug: lightning fired but the body didn't animate).
const ATTACK_HOLD_MS = 450
// The sim's base walk speed (px/s) — enemy walk-cycle cadence is scaled by speed/BASE so charmed foes
// visibly crawl and satyrs visibly sprint instead of every walk cycling at one fixed fps.
const BASE_ENEMY_SPEED = 60
// The Wang ground tilesets (M8 Stage 4; M9 adds the 3-band gradient). 32px tiles over the 960×540
// field → a 30×17 grid (the last row overdraws 4px; Scale.FIT clips it). The terrain NOISE lives in
// src/core/map/terrain.ts — cliffs are GAMEPLAY now, so render + placement share one canonical truth.
const TILE_SET = 'ashen'
const GRASS_SET = 'meadow'
const WATER_SET = 'styx'
const LAVA_SET = 'lava'
const TILE_COLS = 30
const TILE_ROWS = 17
// Per-kind art sizes — a deliberate SILHOUETTE LADDER. The old max(radius*3, 46) floor flattened
// everything to ~46px, which is why the roster read as "too similar": size is the fastest identifier.
const ENEMY_ART_PX: Record<string, number> = {
  shade: Math.round(36 * SIZE_SCALE), // swarm chaff — visibly small and skittery
  skeleton: Math.round(48 * SIZE_SCALE), // the baseline yardstick
  harpy: Math.round(52 * SIZE_SCALE), // wide wings need room
  satyr: Math.round(50 * SIZE_SCALE),
  gorgon: Math.round(54 * SIZE_SCALE),
  hydra: Math.round(62 * SIZE_SCALE), // a brood matriarch
  talos: Math.round(68 * SIZE_SCALE), // the armored wall — visibly the biggest non-boss
}
// Kill feedback throttles: float a bounty only for meaty kills, and only while the field is readable.
const BOUNTY_FLOAT_MIN = 8
const BOUNTY_FLOAT_MAX_BODIES = 40
// The Fate Draft's decision clock (wall time): urgency for the present player, and an AFK player can
// never block the run — when it expires, the Fates choose for them (a random card).
const DRAFT_TIMER_MS = 20_000

/** A Hephaestus spike trap on the path — pops each ground enemy once, consuming a charge. */
type Spike = { pos: Vec2; charges: number; damage: number; hitRadius: number; hitIds: Set<string> }

/** Pre-wave hint per debuting enemy kind — shown BEFORE its teaching wave so the counter is buyable. */
const DEBUT_HINTS: Record<string, string> = {
  shade: 'Shades swarm from the rift — cheap, quick, and many!',
  skeleton: 'Skeletons march — the rank and file of Tartarus.',
  harpy: 'Harpies take wing — only anti-air (Apollo / Hermes) reaches them!',
  talos: 'Talos automatons lumber in — armor shrugs off chip damage; bring BIG hits.',
  satyr: 'Satyrs sprint — slow them (Aphrodite) or they slip right past!',
  gorgon: "Gorgons stalk unseen — Athena's owl reveals them.",
  hydra: 'Hydras split when slain — piercing shots rake the whole brood!',
}

/**
 * GameScene owns the game loop. M2.5: flat top-down map with dead zones, fast-forward (timeScale),
 * Zeus hitscan + Apollo piercing projectiles, and hit/HP "juice." Logic lives in src/core; this
 * scene renders it, drives the (scaled) clock, and handles placement input.
 */
export class GameScene extends Phaser.Scene {
  private readonly path = new PathSystem(OLYMPUS_PATH)
  private enemies: Enemy[] = []
  // Wave spawns waiting for a free body slot (keeps the wave intact when we hit the concurrency cap).
  private pendingSpawns: SpawnDesc[] = []
  // Arc = placeholder disc; Image = dropped-in sprite. Both support setPosition/scale tweens/destroy;
  // the damage-state code branches on which one is live (see hitEnemy).
  private readonly enemySprites = new Map<
    string,
    Phaser.GameObjects.Arc | Phaser.GameObjects.Image | Phaser.GameObjects.Sprite
  >()
  // Directional + animated pixel controllers (when 8-dir art exists), keyed by enemy / tower id.
  private readonly enemyArt = new Map<string, DirAnimSprite>()
  private towers: Tower[] = []
  private readonly towerSprites = new Map<
    string,
    Phaser.GameObjects.Container | Phaser.GameObjects.Sprite | Phaser.GameObjects.Image
  >()
  // HD sprite gods: the animated tower Sprite + its frame keys, keyed by tower id. On fire the tower
  // lunges and swaps idle→action (when the action frame exists), then snaps back.
  private readonly towerArt = new Map<string, DirAnimSprite>()
  private readonly towerLastFire = new Map<string, number>() // scene-time of each tower's last shot
  private ghostSprite?: Phaser.GameObjects.Image // placement preview: the tower itself under the cursor
  // Mobile gods (Hermes) get a static "home base" badge at their orbit center — the click target.
  private readonly homeBaseGfx = new Map<string, Phaser.GameObjects.Container>()
  private projectiles: Projectile[] = []
  private readonly projSprites = new Map<string, Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image>()
  // Hephaestus spike traps, one per owner tower (keyed by tower id).
  private readonly spikes = new Map<string, Spike>()
  private readonly spikeGfx = new Map<string, Phaser.GameObjects.Graphics>()
  // Aphrodite holds a STABLE set of charmed enemy ids per tower, so the slowed foes don't churn.
  private readonly charmedByTower = new Map<string, Set<string>>()
  private overlay!: Phaser.GameObjects.Graphics
  private ghost!: Phaser.GameObjects.Graphics
  private pointer: Vec2 = { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 }
  private elapsedAccumMs = 0
  private elapsedSec = 0
  private simAccumMs = 0 // fixed-substep accumulator (see SIM_STEP_MS)
  private run = new RunController()
  private runEnded = false
  private draftWasOpen = false
  private draftClockMs = 0 // wall-clock ms left on the open draft's decision timer
  private selectedTowerId: string | null = null
  // True when the Wang ground tileset rendered this boot — gates the terrain-plot fallback AND the
  // creature/tower shadows (shadows only read as grounded on real terrain, per the 07-01 playtest).
  private groundTiled = false
  // Soft ellipse shadows ground every creature; fliers get a smaller, fainter one so altitude reads.
  private readonly enemyShadows = new Map<string, Phaser.GameObjects.Ellipse>()
  private readonly towerShadows = new Map<string, Phaser.GameObjects.Ellipse>()
  // Per-enemy world-position memo keyed by pathT — targeting/collision/overlay all read positions many
  // times per step; recompute only when pathT actually changed (stays correct through mid-step knockback).
  private readonly posCache = new Map<string, { t: number; pos: Vec2 }>()
  // Per-tower folded stats, invalidated by key when an upgrade changes a path tier (boons apply at
  // fire time via run.effectiveDamage/effectiveFireRate, so they never enter this fold).
  private readonly effCache = new Map<string, { key: string; eff: ReturnType<typeof towerEffectiveStats> }>()
  // The fire loop's target picks this step, reused by updateTowerAnims (no double target acquisition).
  private readonly stepTargets = new Map<string, Enemy | null>()
  // Athena auras folded once per step (pos + r² + buff), instead of per auraAt() call.
  private stepAuras: { pos: Vec2; r2: number; damageMul: number; fireRateMul: number; detect: boolean }[] = []
  // Enemies currently charm-tinted (rebuilt each step) — hitEnemy's flash restore consults this.
  private readonly charmedIds = new Set<string>()
  private ambientCount = 0 // live ambient ember/mote count
  private ambientCap = 14 // raised to 20 when the animated hellmouth adds its own ember stream
  private lastBossFrac = new Map<string, number>() // boss bar damage-ghost (lerped last-frame fill)
  // Set dressing (glows, vignette, prop art, marker labels) — tracked so the DEV inpaint-shot helper
  // can hide everything that isn't raw terrain+road when capturing a base image for PixelLab.
  private setDressing: Phaser.GameObjects.GameObject[] = []
  private inpaintShotMode = false

  constructor() {
    super('Game')
  }

  create(): void {
    this.setDressing = []
    this.inpaintShotMode = false
    this.drawBackground()
    this.groundTiled = this.drawTiledGround()
    this.drawTerrain()
    this.drawPath()
    this.drawObstacles()
    this.drawDecor()
    this.drawSites()
    this.drawMarkers()
    this.overlay = this.add.graphics().setDepth(3)
    this.ghost = this.add.graphics().setDepth(10)

    this.enemies = []
    this.pendingSpawns = []
    this.enemySprites.clear()
    this.towers = []
    this.towerSprites.clear()
    this.towerArt.clear()
    this.towerLastFire.clear()
    this.enemyArt.clear()
    this.ghostSprite = undefined // recreated lazily; the old one is destroyed with the scene
    this.homeBaseGfx.clear()
    this.projectiles = []
    this.projSprites.clear()
    this.spikes.clear()
    this.spikeGfx.clear() // old graphics are destroyed by scene.restart
    this.charmedByTower.clear()
    this.enemyShadows.clear()
    this.towerShadows.clear()
    this.posCache.clear()
    this.effCache.clear()
    this.stepTargets.clear()
    this.stepAuras = []
    this.charmedIds.clear()
    this.lastBossFrac.clear()
    this.ambientCount = 0
    this.ambientCap = 14
    this.elapsedAccumMs = 0
    this.elapsedSec = 0
    this.simAccumMs = 0

    // Start a fresh run: the skill-tree meta (gold/lives/towerDmg) feeds run-start here.
    this.run = new RunController()
    this.run.start(useSessionStore.getState().getModifiers())
    this.runEnded = false
    this.draftWasOpen = false
    this.selectedTowerId = null
    useGameStore.getState().setElapsed(0)
    useGameStore.getState().setRunSummary(null)
    useGameStore.getState().setSelectedTower(null)
    useGameStore.getState().mirrorRun(this.run.snapshot())

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      this.pointer = { x: p.worldX, y: p.worldY }
    })
    // Click-to-place (clearer than drag on a laptop): click a god in the rail, then click the
    // field to place. Clicking empty ground while not placing selects/deselects a tower.
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.onPointerDown(p))
    this.input.keyboard?.on('keydown-ESC', () => {
      useGameStore.getState().cancelPlacing()
      this.deselectTower()
    })
    // Hotkeys 1–8 enter placement for that god (BTD6 muscle memory); ESC still exits.
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      const n = parseInt(e.key, 10)
      if (n >= 1 && n <= GOD_ORDER.length) useGameStore.getState().beginPlacing(GOD_ORDER[n - 1])
    })

    // Ambient life: embers drift up from the Tartarus rift, gold motes at the Olympus gate.
    this.time.addEvent({ delay: 450, loop: true, callback: () => this.spawnAmbient('ember') })
    this.time.addEvent({ delay: 1300, loop: true, callback: () => this.spawnAmbient('mote') })

    // M10-S8: the cinematic pass — a subtle warm grade (indigo-leaning shadows, gold-leaning
    // highlights, a touch of saturation/contrast) + low-strength bloom keyed to the emissives
    // (lava, bolts, the hellmouth, the lake shine). WebGL only; Canvas render stays raw.
    if (CINEMATIC_GRADE && this.game.renderer.type === Phaser.WEBGL) {
      const cam = this.cameras.main
      const cm = cam.postFX.addColorMatrix()
      cm.saturate(0.08, true)
      cm.contrast(0.04, true)
      // warm tilt: highlights lean gold (R up, B trimmed), shadows lift faintly toward indigo (+B offset)
      cm.multiply([1.05, 0.02, 0, 0, 0, 0.01, 1.0, 0.01, 0, 0, 0, 0.02, 0.99, 0, 4, 0, 0, 0, 1, 0], true)
      cam.postFX.addBloom(0xffdf9e, 1, 1, 1, 0.5, 4)
    }

    // Tell the player what wave 1 brings before they press start (debut/boss/elite telegraphs).
    this.showWavePreview(1)

    if (import.meta.env.DEV) {
      ;(window as unknown as Record<string, unknown>).godspireScene = this
      ;(window as unknown as Record<string, unknown>).godspireSession = useSessionStore
    }
  }

  devStep(frames: number, dtMs = 16): void {
    for (let i = 0; i < frames; i++) this.update(0, dtMs)
  }

  /** DEV only: jump straight to a wave (e.g. `godspireScene.devJumpToWave(40)` to test a boss). */
  devJumpToWave(n: number): void {
    this.run.devJumpToWave(n)
  }

  getEnemies(): readonly Enemy[] {
    return this.enemies
  }
  getTowers(): readonly Tower[] {
    return this.towers
  }

  /** On-screen art height for an enemy — the visual size, NOT the hitbox (bars anchor to this). */
  private enemyArtPx(e: Enemy): number {
    return e.kind === 'boss' ? Math.round(110 * SIZE_SCALE) : (ENEMY_ART_PX[e.kind] ?? Math.max(enemyRadius(e) * 3, 46))
  }

  // Memoized per enemy on pathT: recomputes only when the enemy actually moved (or was knocked back),
  // so the O(enemies × towers/projectiles/spikes) consumers stop re-scanning the polyline per call.
  private enemyPos = (e: Enemy): Vec2 => {
    const c = this.posCache.get(e.id)
    if (c && c.t === e.pathT) return c.pos
    const pos = this.path.getPointAt(e.pathT)
    this.posCache.set(e.id, { t: e.pathT, pos })
    return pos
  }

  /** Folded upgrade stats per tower, cached until an upgrade changes a path tier (see effCache). */
  private towerEff(tower: Tower): ReturnType<typeof towerEffectiveStats> {
    const key = `${tower.pathA}:${tower.pathB}`
    const hit = this.effCache.get(tower.id)
    if (hit && hit.key === key) return hit.eff
    const eff = towerEffectiveStats(tower)
    this.effCache.set(tower.id, { key, eff })
    return eff
  }

  private towerFootprints() {
    // A mobile god's dead zone is its FIXED home base, not its orbiting position — so other towers
    // can be built freely under its sweep (only the small base footprint is blocked).
    return this.towers.map((t) => ({
      pos: TOWER_STATS[t.god].mobile ? t.center : t.pos,
      footprint: TOWER_STATS[t.god].footprint,
    }))
  }

  // ── static map (flat, top-down) ──
  /** Deterministic pseudo-random in [0,1) — the map's scatter must not change between frames/boots. */
  private static seeded(n: number): number {
    const v = Math.sin(n * 9871.123) * 43758.5453
    return v - Math.floor(v)
  }

  /** Bounding box + center of a polygon (for stamping prop art / fallback fills over a poly shape). */
  private static polyBounds(pts: readonly Vec2[]): { cx: number; cy: number; w: number; h: number } {
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const p of pts) {
      minX = Math.min(minX, p.x)
      minY = Math.min(minY, p.y)
      maxX = Math.max(maxX, p.x)
      maxY = Math.max(maxY, p.y)
    }
    return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, w: maxX - minX, h: maxY - minY }
  }

  private drawBackground(): void {
    const g = this.add.graphics().setDepth(0)
    g.fillStyle(0x14121a, 1)
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
    // atmosphere glows sit ABOVE the ground tiles (0.2) so they tint the terrain instead of hiding
    // under it — ember at Tartarus (bottom-left), gold at Olympus (top-right)
    const glow = this.add.graphics().setDepth(0.4)
    glow.fillStyle(0x4a121b, 0.22)
    glow.fillCircle(0, GAME_HEIGHT, 240)
    glow.fillStyle(0x3a2f10, 0.2)
    glow.fillCircle(GAME_WIDTH, 0, 240)
    // corner vignette — focuses the eye center-field and hides the hard canvas edge (static, no frame cost)
    const v = this.add.graphics().setDepth(0.6)
    v.fillStyle(0x000000, 0.18)
    v.fillEllipse(0, 0, 520, 340)
    v.fillEllipse(GAME_WIDTH, 0, 520, 340)
    v.fillEllipse(0, GAME_HEIGHT, 520, 340)
    v.fillEllipse(GAME_WIDTH, GAME_HEIGHT, 520, 340)
    // M10-S3: heat rising from below the world's rim — the map no longer ends in flat void.
    // Strong over Tartarus (left), fading toward Olympus (right).
    const heat = this.add.graphics().setDepth(0.6)
    heat.fillGradientStyle(0xd83a2a, 0xd83a2a, 0xd83a2a, 0xd83a2a, 0.16, 0.03, 0.22, 0.05)
    heat.fillRect(0, GAME_HEIGHT - 46, GAME_WIDTH, 46)
    this.setDressing.push(glow, v, heat)
    // two extra ember mouths at the world's rim
    this.time.addEvent({ delay: 1100, loop: true, callback: () => this.spawnAmbient('ember', { x: 120, y: 534 }) })
    this.time.addEvent({ delay: 1600, loop: true, callback: () => this.spawnAmbient('ember', { x: 330, y: 534 }) })
  }

  /**
   * DEV only: toggle a clean-terrain view for inpainting base shots (M9-S2). Hides everything that
   * isn't raw ground + road — glows, vignette, prop/marker art, labels — and stops new ambient
   * particles (live ones expire within ~4s; wait that long before capturing).
   */
  devPrepareInpaintShot(hide = true): void {
    this.inpaintShotMode = hide
    for (const obj of this.setDressing) {
      if ('setVisible' in obj) (obj as unknown as { setVisible(v: boolean): void }).setVisible(!hide)
    }
  }

  /**
   * The Wang ground layers. Base: chasm vs buildable stone — the CANONICAL core predicate that
   * placement also rejects on (cliffs are gameplay). Overlay: grass ⊂ stone biased toward the gate,
   * stamped only where its mask is non-empty (the meadow set's lower terrain IS the same stone base
   * tile, so transitions sit seamlessly on the base layer). All-or-nothing per tileset — missing art
   * renders nothing and the drawn map below carries the field. Returns whether tiles rendered.
   */
  private drawTiledGround(): boolean {
    if (!hasTileset(TILE_SET)) return false
    const isStone = stonePredicate()
    const lavaReady = hasTileset(LAVA_SET)
    const lavaInteriors: Phaser.GameObjects.Image[] = []
    for (const p of layoutWangTiles(TILE_COLS, TILE_ROWS, TERRAIN_TILE_PX, isStone)) {
      // M10-S3: molten chasm — whole 8-connected blobs near Tartarus render from the lava set
      // (same masks, same stone upper base, so cliff lips are pixel-identical; lava.ts guarantees
      // a cell is never half-lava half-ash). Checking ONE chasm corner suffices.
      const lava =
        lavaReady &&
        p.mask !== 15 &&
        (isLavaVertex(p.x, p.y) ||
          isLavaVertex(p.x + TERRAIN_TILE_PX, p.y) ||
          isLavaVertex(p.x + TERRAIN_TILE_PX, p.y + TERRAIN_TILE_PX) ||
          isLavaVertex(p.x, p.y + TERRAIN_TILE_PX))
      const img = this.add
        .image(p.x, p.y, `tile_${lava ? LAVA_SET : TILE_SET}_${WANG_TILE_FOR_MASK[p.mask]}`)
        .setOrigin(0)
        .setDepth(0.2)
      // seeded flips on the SOLID tiles break repetition for free (edge tiles must not flip — their
      // corner pattern is directional)
      if (p.mask === 0 || p.mask === 15) {
        const r = GameScene.seeded(p.col * 31 + p.row)
        img.setFlipX(r < 0.5).setFlipY(r > 0.25 && r < 0.75)
      }
      if (lava && p.mask === 0) lavaInteriors.push(img)
    }
    if (lavaInteriors.length > 0) this.animateLava(lavaInteriors)
    if (hasTileset(GRASS_SET)) {
      const isGrass = grassPredicate()
      for (const p of layoutWangTiles(TILE_COLS, TILE_ROWS, TERRAIN_TILE_PX, isGrass)) {
        if (p.mask === 0) continue // bare stone shows the base layer — no wasted images
        const img = this.add
          .image(p.x, p.y, `tile_${GRASS_SET}_${WANG_TILE_FOR_MASK[p.mask]}`)
          .setOrigin(0)
          .setDepth(0.25)
        if (p.mask === 15) {
          const r = GameScene.seeded(p.col * 47 + p.row * 3)
          img.setFlipX(r < 0.5).setFlipY(r > 0.25 && r < 0.75)
        }
      }
    }
    // M10-S2: the Lake of Styx as a WATER WANG LAYER — pixel-crisp shorelines chained off the same
    // stone base as the cliffs, flush with everything by construction (lower = water, upper = stone;
    // terrain.ts force-stones the shore ring so these tiles never meet chasm). All water tiles are
    // stamped into ONE RenderTexture so a single Shine postFX animates the whole surface.
    if (hasTileset(WATER_SET)) {
      const placements = layoutWangTiles(TILE_COLS, TILE_ROWS, TERRAIN_TILE_PX, (x, y) => !waterAt(x, y)).filter(
        (p) => p.mask !== 15, // fully-land cells show the stone/grass layers beneath
      )
      if (placements.length > 0) {
        const minX = Math.min(...placements.map((p) => p.x))
        const minY = Math.min(...placements.map((p) => p.y))
        const maxX = Math.max(...placements.map((p) => p.x)) + TERRAIN_TILE_PX
        const maxY = Math.max(...placements.map((p) => p.y)) + TERRAIN_TILE_PX
        const rt = this.add.renderTexture(minX, minY, maxX - minX, maxY - minY).setOrigin(0).setDepth(0.3)
        // stamp via a scratch image so open-water tiles get seeded flips (breaks the glint grid)
        const scratch = this.add.image(0, 0, `tile_${WATER_SET}_0`).setOrigin(0).setVisible(false)
        for (const p of placements) {
          scratch.setTexture(`tile_${WATER_SET}_${WANG_TILE_FOR_MASK[p.mask]}`)
          if (p.mask === 0) {
            const r = GameScene.seeded(p.col * 53 + p.row * 7)
            scratch.setFlipX(r < 0.5).setFlipY(r > 0.25 && r < 0.75)
          } else {
            scratch.setFlipX(false).setFlipY(false)
          }
          rt.draw(scratch, p.x - minX, p.y - minY) // draw() honors the object's flip state
        }
        scratch.destroy()
        this.animateLake(rt)
      }
    }
    return true
  }

  private drawPath(): void {
    const g = this.add.graphics().setDepth(1)
    // Layered road: buffer band → dark base → mid surface → a worn center stripe (depth from strokes
    // alone). HYBRID with the Wang ground: the smooth polyline keeps the map's organic curves; the
    // palette is sampled from the imported "ashen" tileset (stone ≈ #747594, ash ≈ #1c1530) so the
    // dark violet road reads as of-a-piece while VALUE contrast against the pale stone carries it.
    g.lineStyle(46, 0x141021, 1) // dead-zone buffer band (tight to the road)
    this.strokePolyline(g)
    g.lineStyle(40, 0x262038, 1) // dark road base
    this.strokePolyline(g)
    g.lineStyle(30, 0x2e2742, 1) // mid surface
    this.strokePolyline(g)
    g.lineStyle(8, 0x3b3354, 0.55) // center wear stripe (feet polish the middle)
    this.strokePolyline(g)
    // deterministic pebbles + cracks scattered along the walkway (2px-quantized — pixel-flavored)
    for (let i = 0; i <= 50; i++) {
      const t = i / 50
      const p = this.path.getPointAt(t)
      const r1 = GameScene.seeded(i * 3 + 1)
      const r2 = GameScene.seeded(i * 3 + 2)
      const r3 = GameScene.seeded(i * 3 + 3)
      if (r3 < 0.65) {
        g.fillStyle(r3 < 0.3 ? 0x1c1530 : 0x4a4168, 0.8)
        g.fillCircle(p.x + (r1 - 0.5) * 28, p.y + (r2 - 0.5) * 28, r3 < 0.35 ? 1 : 2)
      }
    }
  }

  private strokePolyline(g: Phaser.GameObjects.Graphics): void {
    g.beginPath()
    g.moveTo(OLYMPUS_PATH[0].x, OLYMPUS_PATH[0].y)
    for (let i = 1; i < OLYMPUS_PATH.length; i++) g.lineTo(OLYMPUS_PATH[i].x, OLYMPUS_PATH[i].y)
    g.strokePath()
  }

  private drawTerrain(): void {
    if (this.groundTiled) return // the Wang tileset IS the terrain — the placeholder plots retire
    const g = this.add.graphics().setDepth(0.5)
    // subtle buildable "plots" so the field reads as a map, not a flat void (placeholder; art in M8)
    const zones: [number, number, number, number, number][] = [
      [40, 150, 330, 210, 0x1b2018],
      [400, 95, 380, 150, 0x191c22],
      [360, 340, 430, 175, 0x1d1a16],
    ]
    for (const [x, y, w, h, c] of zones) {
      g.fillStyle(c, 0.6)
      g.fillRoundedRect(x, y, w, h, 24)
      // a 1px top-edge highlight + deterministic speck texture so the plots read as ground, not flat panels
      g.lineStyle(1, 0xffffff, 0.05)
      g.lineBetween(x + 18, y + 1, x + w - 18, y + 1)
      for (let i = 0; i < 40; i++) {
        const rx = GameScene.seeded(x + i * 7 + 1)
        const ry = GameScene.seeded(y + i * 7 + 2)
        const light = GameScene.seeded(x + y + i) > 0.5
        g.fillStyle(light ? 0xffffff : 0x000000, 0.05)
        g.fillRect(x + 6 + rx * (w - 12), y + 6 + ry * (h - 12), 2, 2)
      }
    }
  }

  private drawObstacles(): void {
    const g = this.add.graphics().setDepth(2)
    this.setDressing.push(g)
    for (const o of OBSTACLES) {
      const s = o.shape
      // dropped-in prop art (obj_<id>.png) replaces the drawn shape — the dead-zone FOOTPRINT is
      // still obstacles.ts data either way (canPlace never looks at pixels). Props draw LARGER than
      // their footprints (like creatures) so the map reads at real scale, not miniature.
      // The Lake of Styx: prefer the M9 inpainted shoreline patch — PixelLab painted the water
      // INTO a live-terrain screenshot (masked-alpha import, stamped at its crop origin, depth 1.5
      // = over the road edge it blends against, under props/creatures). The patch is terrain, not
      // set dressing — it must stay visible in any future inpaint shots.
      if (o.id === 'styx' && hasTileset(WATER_SET)) continue // the water Wang layer IS the lake
      if (o.id === 'styx' && this.textures.exists('obj_styx_patch')) {
        // legacy inpainted patch — only when the tileset is missing (safe staging fallback)
        this.animateLake(this.add.image(475, 273, 'obj_styx_patch').setOrigin(0).setDepth(1.5))
        continue
      }
      const objKey = `obj_${o.id}`
      if (this.textures.exists(objKey)) {
        if (s.kind === 'circle') this.setDressing.push(this.addSpriteScaled(objKey, s.x, s.y, s.r * 3.1).setDepth(2))
        else if (s.kind === 'poly') {
          const b = GameScene.polyBounds(s.points)
          this.setDressing.push(this.addSpriteScaled(objKey, b.cx, b.cy, Math.max(b.w, b.h) * 1.08).setDepth(2))
        } else {
          // the Sacred Olive draws GRAND (M10-S6) — a landmark, not a shrub; other rects stay 1.5×
          const mul = o.id === 'olive' ? 2.1 : 1.5
          const dy = o.id === 'olive' ? -8 : 0
          this.setDressing.push(this.addSpriteScaled(objKey, s.x + s.w / 2, s.y + s.h / 2 + dy, Math.max(s.w, s.h) * mul).setDepth(2))
        }
        continue
      }
      if (o.id === 'styx' && s.kind === 'poly') {
        // drawn-water fallback: the traced pocket as layered fills (dark rim → body → highlight)
        const pts = s.points.map((p) => new Phaser.Geom.Point(p.x, p.y))
        g.fillStyle(0x123847, 0.95)
        g.fillPoints(pts, true)
        const b = GameScene.polyBounds(s.points)
        const inner = s.points.map(
          (p) => new Phaser.Geom.Point(b.cx + (p.x - b.cx) * 0.88, b.cy + (p.y - b.cy) * 0.88),
        )
        g.fillStyle(0x2f6f8c, 0.95)
        g.fillPoints(inner, true)
        g.fillStyle(0x5aa6c2, 0.4)
        g.fillEllipse(b.cx - b.w * 0.12, b.cy - b.h * 0.12, b.w * 0.32, b.h * 0.22)
      } else if (o.id === 'columns' && s.kind === 'circle') {
        for (const [dx, dy] of [[-12, -4], [5, -13], [13, 7], [-5, 11]]) {
          g.fillStyle(0x5f6470, 1)
          g.fillCircle(s.x + dx, s.y + dy + 3, 8)
          g.fillStyle(0x9aa0ac, 1)
          g.fillCircle(s.x + dx, s.y + dy, 8)
        }
      } else if (o.id === 'olive' && s.kind === 'rect') {
        for (let i = 0; i < 6; i++) {
          const cx = s.x + 14 + (i % 3) * ((s.w - 28) / 2)
          const cy = s.y + 13 + Math.floor(i / 3) * (s.h - 26)
          g.fillStyle(0x2f4a1f, 1)
          g.fillCircle(cx, cy + 2, 11)
          g.fillStyle(0x4e7a32, 1)
          g.fillCircle(cx - 2, cy - 2, 9)
        }
      } else if (s.kind === 'circle') {
        g.fillStyle(0x42424a, 1)
        g.fillCircle(s.x, s.y, s.r)
        g.fillStyle(0x63636d, 0.85)
        g.fillCircle(s.x - 6, s.y - 7, s.r * 0.5)
      } else if (s.kind === 'rect') {
        g.fillStyle(o.color, 0.9)
        g.fillRoundedRect(s.x, s.y, s.w, s.h, 6)
      } else {
        g.fillStyle(o.color, 0.9)
        g.fillPoints(s.points.map((p) => new Phaser.Geom.Point(p.x, p.y)), true)
      }
    }
  }

  /** M9-S4: deterministic decor scatter — bones near Tartarus, tufts on grass, stumps and rocks
   *  between. Pure math picks the spots (src/game/render/decor.ts); missing PNGs simply filter
   *  out, so the pack lands art-by-art without ever breaking the map. */
  /** M10-S6: sacred-site dressing — offerings + stones at fixed spots, fireflies, a hover lore
   *  label (Phaser-side: no React/letterbox plumbing). All of it is set dressing. */
  private siteLoreLabel?: Phaser.GameObjects.Text
  private drawSites(): void {
    const olive = SITES.find((s) => s.id === 'sacred_olive')
    if (!olive) return
    // fixed dressing (not scatterDecor — these BELONG to the tree)
    if (this.textures.exists('obj_decor_offering')) {
      this.setDressing.push(this.addSpriteScaled('obj_decor_offering', olive.pos.x - 58, olive.pos.y + 34, 24).setDepth(2))
    }
    if (this.textures.exists('obj_decor_olive_stones')) {
      this.setDressing.push(this.addSpriteScaled('obj_decor_olive_stones', olive.pos.x + 56, olive.pos.y + 30, 26).setDepth(2))
    }
    // fireflies drift in the tree's shade (green-gold, slow)
    this.ambientCap = Math.max(this.ambientCap, 26)
    this.time.addEvent({
      delay: 900,
      loop: true,
      callback: () =>
        this.spawnAmbient('firefly', {
          x: olive.pos.x + (Math.random() - 0.5) * 90,
          y: olive.pos.y + 20 + (Math.random() - 0.5) * 40,
        }),
    })
    // hover lore — created lazily, faded by update() when the pointer rests on the grove
    this.siteLoreLabel = this.add
      .text(olive.pos.x, olive.pos.y - 62, `${olive.label}\n${olive.lore}`, {
        fontFamily: 'Silkscreen, Georgia, serif',
        fontSize: '11px',
        color: '#e7e3d8',
        align: 'center',
        backgroundColor: '#000000cc',
        padding: { x: 8, y: 5 },
        wordWrap: { width: 240 },
      })
      .setOrigin(0.5, 1)
      .setDepth(12)
      .setAlpha(0)
    this.setDressing.push(this.siteLoreLabel)
  }

  private drawDecor(): void {
    if (!this.groundTiled) return // dressing belongs to the real terrain, not the drawn fallback
    const have = (k: string) => this.textures.exists(k)
    const keys = {
      grim: ['obj_decor_bones', 'obj_decor_shield', 'obj_decor_torso'].filter(have),
      stone: ['obj_decor_stump', 'obj_decor_rock1', 'obj_decor_rock2', 'obj_decor_shrine', 'obj_decor_amphorae'].filter(have),
      grass: ['obj_decor_tuft1', 'obj_decor_tuft2', 'obj_decor_laurel'].filter(have),
    }
    for (const d of scatterDecor(7, 19, isBuildableGround, terrainAt, OLYMPUS_PATH, OBSTACLES, keys)) {
      this.setDressing.push(this.addSpriteScaled(d.key, d.x, d.y, d.sizePx).setDepth(0.8))
    }
  }

  private drawMarkers(): void {
    const start = OLYMPUS_PATH[0]
    const end = OLYMPUS_PATH[OLYMPUS_PATH.length - 1]
    const g = this.add.graphics().setDepth(2)
    this.setDressing.push(g)
    // Mouth of Tartarus — the M9 INPAINTED patch wins: the hellmouth was painted into a live
    // terrain screenshot (masked-alpha import at its crop origin), so blending is by construction.
    // Fallback chain: patch → old prop art → drawn ellipses.
    if (this.textures.exists('obj_rift_patch')) {
      this.animateRift(this.add.image(0, 24, 'obj_rift_patch').setOrigin(0).setDepth(1.5))
      // M10-S4: the pit's lower-right RIM re-stamped above the creatures (depth 6.5 > enemy 4-6) —
      // fresh spawns slide out from UNDER the lip instead of materializing on top of the art.
      // A cropped copy of terrain, not set dressing (double-draw in inpaint shots is identical).
      this.add.image(0, 24, 'obj_rift_patch').setOrigin(0).setDepth(6.5).setCrop(96, 96, 96, 96)
    } else if (this.textures.exists('obj_rift')) {
      this.setDressing.push(this.addSpriteScaled('obj_rift', start.x + 16, start.y, 270).setDepth(2))
    } else {
      const rings: [number, number][] = [
        [62, 0x2a0810],
        [46, 0x7a1020],
        [30, 0xd83a2a],
        [15, 0xffb070],
      ]
      for (const [r, c] of rings) {
        g.fillStyle(c, 0.92)
        g.fillEllipse(start.x, start.y, r * 1.9, r * 1.35)
      }
      this.setDressing.push(
        this.add
          .text(start.x + 34, start.y - 46, 'Tartarus', { fontFamily: 'Silkscreen, Georgia, serif', fontSize: '12px', color: '#e08a98' })
          .setOrigin(0.5)
          .setDepth(2),
      )
    }
    // Olympus gate — prop art when dropped in (label-free for the same reason), else the drawn slab
    if (this.textures.exists('obj_gate')) {
      this.setDressing.push(this.addSpriteScaled('obj_gate', end.x - 20, end.y, 230).setDepth(2))
    } else {
      g.fillStyle(0xf5d061, 0.96)
      g.fillRoundedRect(end.x - 78, end.y - 36, 130, 74, 6)
      g.fillStyle(0xbfa03a, 1)
      g.fillRect(end.x - 64, end.y - 36, 11, 74)
      g.fillRect(end.x - 30, end.y - 36, 11, 74)
      this.setDressing.push(
        this.add
          .text(end.x - 44, end.y, 'OLYMPUS', {
            fontFamily: 'Silkscreen, Georgia, serif',
            fontSize: '11px',
            color: '#1a1407',
            fontStyle: 'bold',
          })
          .setOrigin(0.5)
          .setDepth(2),
      )
    }
  }

  // ── M9-S2 set-piece animation: Phaser built-in postFX + blend sprites, on ONLY these two
  // objects (perf-capped by design). WebGL-guarded — Canvas renderer just shows the static art. ──

  /** The hellmouth breathes: pulsing molten glow + a rotating fire vortex over the pit floor. */
  private animateRift(rift: Phaser.GameObjects.Image): void {
    if (this.game.renderer.type === Phaser.WEBGL) {
      const glow = rift.postFX.addGlow(0xff5533, 2, 0, false, 0.1, 12)
      this.tweens.add({ targets: glow, outerStrength: 6, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
    }
    // molten mouth = the bright centroid of the painted patch (measured at import: world 97,161)
    if (this.textures.exists('fx_swirl')) {
      const swirl = this.add
        .image(97, 161, 'fx_swirl')
        .setDepth(1.55)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.5)
        .setDisplaySize(76, 58)
      this.setDressing.push(swirl) // dressing — hide in inpaint shots
      this.tweens.add({ targets: swirl, angle: 360, duration: 9000, repeat: -1 })
      this.tweens.add({ targets: swirl, alpha: 0.28, duration: 1700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
    }
    // a second, denser ember stream rises from the mouth itself (cap raised 14→20 for it)
    this.ambientCap = 20
    this.time.addEvent({ delay: 520, loop: true, callback: () => this.spawnAmbient('ember', { x: 97, y: 155 }) })
  }

  /** The Styx shimmers: a slow shine sweep + two drifting mist wisps over the water. */
  private animateLake(lake: Phaser.GameObjects.Image | Phaser.GameObjects.RenderTexture): void {
    if (this.game.renderer.type === Phaser.WEBGL) {
      lake.postFX.addShine(0.2, 0.3, 4)
    }
    this.ensureMistTexture()
    const wisps: [number, number, number][] = [
      [545, 320, 0], // [x, y, phase]
      [635, 365, 1],
    ]
    for (const [x, y, i] of wisps) {
      const m = this.add
        .image(x, y, 'fx_mist')
        .setDepth(1.6)
        .setBlendMode(Phaser.BlendModes.SCREEN)
        .setAlpha(0.14 + i * 0.05)
        .setDisplaySize(120, 44)
      this.setDressing.push(m) // mist is dressing — future inpaint shots must hide it
      this.tweens.add({
        targets: m,
        x: x + (i ? -30 : 30),
        y: y - 8,
        duration: 5200 + i * 1300,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      })
    }
  }

  /** The molten floor breathes: interior tiles shimmer between two frames, blobs glow, embers rise. */
  private animateLava(interiors: Phaser.GameObjects.Image[]): void {
    // frame shimmer — a single clock retextures the open-lava tiles on seeded alternating phases
    if (this.textures.exists('tile_lava_0_f1')) {
      let tick = 0
      this.time.addEvent({
        delay: 550,
        loop: true,
        callback: () => {
          tick++
          for (let i = 0; i < interiors.length; i++) {
            const img = interiors[i]
            if (!img.active) continue
            const phase = GameScene.seeded(i * 17 + 3) < 0.5 ? 0 : 1
            img.setTexture((tick + phase) % 2 === 0 ? 'tile_lava_0' : 'tile_lava_0_f1')
          }
        },
      })
    }
    // one breathing additive glow at the molten centroid
    let cx = 0
    let cy = 0
    let n = 0
    for (const k of lavaVertexSet()) {
      cx += (k % 64) * TERRAIN_TILE_PX
      cy += Math.floor(k / 64) * TERRAIN_TILE_PX
      n++
    }
    if (n > 0) {
      const glow = this.add
        .ellipse(cx / n, cy / n, 220, 150, 0xff5a2a, 0.12)
        .setDepth(0.35)
        .setBlendMode(Phaser.BlendModes.ADD)
      this.setDressing.push(glow)
      this.tweens.add({ targets: glow, alpha: 0.2, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
    }
    // embers rise off the melt (deterministic origins; cap bumped for the extra stream)
    this.ambientCap = Math.max(this.ambientCap, 24)
    const verts = [...lavaVertexSet()]
    const origins = [0.2, 0.45, 0.7, 0.9].map((f) => {
      const k = verts[Math.floor(f * (verts.length - 1))]
      return { x: (k % 64) * TERRAIN_TILE_PX, y: Math.floor(k / 64) * TERRAIN_TILE_PX }
    })
    let oi = 0
    this.time.addEvent({
      delay: 700,
      loop: true,
      callback: () => this.spawnAmbient('ember', origins[oi++ % origins.length]),
    })
  }

  /** Procedural soft radial-gradient blob for the lake mist (no art dependency). */
  private ensureMistTexture(): void {
    if (this.textures.exists('fx_mist')) return
    const c = this.textures.createCanvas('fx_mist', 96, 48)
    if (!c) return
    const ctx = c.getContext()
    const grad = ctx.createRadialGradient(48, 24, 4, 48, 24, 44)
    grad.addColorStop(0, 'rgba(190,220,230,0.5)')
    grad.addColorStop(1, 'rgba(190,220,230,0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 96, 48)
    c.refresh()
  }

  update(_time: number, delta: number): void {
    // Intents + run-over + draft-pause run EVERY frame, even while paused (dt may be 0).
    this.applyIntents()
    this.run.autoStart = useGameStore.getState().autoStart // read-through preference
    if (this.run.phase === 'over' && !this.runEnded) this.endRun()
    this.syncDraftPause(delta)

    // Effective sim scale, enforced EVERY frame: any pause overlay (Pantheon / Ranks / the Fate
    // Draft) forces 0 no matter what other writers (SpeedControls' resume button, a closing sibling
    // overlay) set timeScale to — combat can never run on behind an opaque panel. timeScale itself
    // stays purely the player's speed preference.
    const st = useGameStore.getState()
    const scale = st.pantheonOpen || st.leaderboardOpen || this.run.draft ? 0 : st.timeScale
    const dt = Math.min(delta, MAX_DELTA_MS) * scale

    if (dt > 0 && !this.runOver()) {
      // Fixed-substep accumulator: the sim only ever advances in ≤SIM_STEP_MS slices so fast
      // projectiles can't tunnel through hitboxes at 3× (collision runs per substep). Clamped so a
      // hitched tab can't queue an unbounded catch-up spiral.
      this.simAccumMs = Math.min(this.simAccumMs + dt, SIM_STEP_MS * MAX_STEPS_PER_FRAME)
      while (this.simAccumMs >= SIM_STEP_MS && !this.runOver()) {
        this.simAccumMs -= SIM_STEP_MS
        this.simStep(SIM_STEP_MS / 1000)
      }
    }

    useGameStore.getState().mirrorRun(this.run.snapshot())
    this.renderOverlay()
    this.renderGhost()
    // sacred-site lore on hover (fade, not popping): pointer resting on the grove, not placing
    if (this.siteLoreLabel) {
      const o = OBSTACLES.find((ob) => ob.id === 'olive')
      const over =
        !useGameStore.getState().placingGod &&
        o?.shape.kind === 'rect' &&
        this.pointer.x >= o.shape.x - 10 &&
        this.pointer.x <= o.shape.x + o.shape.w + 10 &&
        this.pointer.y >= o.shape.y - 10 &&
        this.pointer.y <= o.shape.y + o.shape.h + 10
      const target = over ? 1 : 0
      const a = this.siteLoreLabel.alpha
      if (Math.abs(a - target) > 0.01) this.siteLoreLabel.setAlpha(a + (target - a) * 0.18)
    }
  }

  /** Opaque to TS narrowing on purpose — simStep mutates run.phase mid-loop (a run can end mid-frame). */
  private runOver(): boolean {
    return this.run.phase === 'over'
  }

  /** One fixed sim step. Everything that moves/aims/collides/settles lives here (the one clock). */
  private simStep(dtSec: number): void {
    const dt = dtSec * 1000

    this.elapsedAccumMs += dt
    if (this.elapsedAccumMs >= 1000) {
      this.elapsedAccumMs -= 1000
      this.elapsedSec += 1
      useGameStore.getState().setElapsed(this.elapsedSec)
    }

    // spawn this wave's enemies on the run's schedule — but never exceed the concurrency cap;
    // over-budget spawns wait in pendingSpawns and emit as bodies die (the wave stays intact).
    for (const desc of this.run.tick(dtSec)) this.pendingSpawns.push(desc)
    while (this.pendingSpawns.length > 0 && this.enemies.length < MAX_CONCURRENT_BODIES) {
      this.spawnEnemy(this.pendingSpawns.shift()!)
    }

    // fold Athena's auras ONCE per step (auraAt used to re-scan towers per tower per frame)
    this.foldStepAuras()
    // Aphrodite chills foes in her field BEFORE they move this frame
    this.updateSlowAuras()

    // advance enemies; sync sprites; face their heading + cycle the walk; leak → lose lives + juice
    const dtMs = dt
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i]
      const leaked = advanceEnemy(enemy, dtSec, this.path.length)
      if (leaked) {
        this.onEnemyLeak(enemy)
        continue
      }
      const pos = this.enemyPos(enemy)
      this.enemySprites.get(enemy.id)?.setPosition(pos.x, pos.y)
      const shadow = this.enemyShadows.get(enemy.id)
      shadow?.setPosition(pos.x, pos.y + (shadow.getData('dy') as number))
      this.syncChargeTell(enemy)
      const eart = this.enemyArt.get(enemy.id)
      if (eart) {
        eart.setFacing(dir8(this.path.getAngleAt(enemy.pathT))) // face the way it's walking
        // legs pump at the enemy's ACTUAL pace — charmed foes crawl, satyrs sprint, charges blur
        eart.update(dtMs, (enemy.speed * enemy.slowMul) / BASE_ENEMY_SPEED)
      }
    }

    // mobile gods (Hermes) orbit their placed center — move them before they acquire/fire
    this.updateMobileTowers(dtSec)

    // towers acquire + fire (effective stats from UPGRADES × run modifiers, read at fire-time)
    this.stepTargets.clear()
    for (const tower of this.towers) {
      const eff = this.towerEff(tower)
      if (eff.fireRate <= 0 || eff.damage <= 0) continue // farms (Demeter) don't fire
      tower.cooldown -= dtSec
      if (tower.cooldown > 0) continue
      const aura = this.auraAt(tower.pos) // Athena buffs nearby gods + reveals stealth foes
      const site = siteBuffAt(tower.pos) // sacred sites (the Olive of Athena) bless from the map itself
      const fireRate = this.run.effectiveFireRate(tower.god, eff.fireRate * aura.fireRateMul * site.fireRateMul)
      const dep = TOWER_STATS[tower.god].deployable
      if (dep) {
        // Hephaestus produces a trap charge instead of shooting an enemy directly.
        tower.cooldown = 1 / fireRate
        this.produceSpike(tower, { damage: eff.damage * aura.damageMul, maxCharges: eff.maxCharges }, dep)
        continue
      }
      const target = selectTarget(
        { pos: tower.pos, range: eff.range, canHitAir: eff.canHitAir, canDetect: aura.detect },
        this.enemies,
        this.enemyPos,
        tower.targeting,
      )
      this.stepTargets.set(tower.id, target) // updateTowerAnims reuses this pick (no double targeting)
      if (!target) continue
      tower.cooldown = 1 / fireRate
      const dmg = this.run.effectiveDamage(tower.god, eff.damage * aura.damageMul)
      const stats = TOWER_STATS[tower.god]
      if (stats.splash) this.fireSplash(tower.pos, this.enemyPos(target), dmg, eff.splashRadius, eff.knockback, stats.color)
      else if (stats.attack === 'hitscan') this.fireHitscan(tower, target, dmg)
      else this.fireProjectile(tower, target, dmg, eff.pierce, eff.projectileSpeed)
      this.towerAttackTell(tower, target) // pixel gods: a quick lunge toward the target on each shot
    }
    this.updateTowerAnims(dtMs) // face nearest target + play attack/idle + advance frames

    this.updateProjectiles(dtSec)
    this.updateSpikes()

    // clear-gate: a wave ends only when fully emitted AND no enemy remains alive. Pending (capped)
    // spawns count as "still alive" so a deferred body can't let the wave clear out from under it.
    // When it clears, Demeter farms pay out their harvest and the payday floats at the gate.
    const income = this.run.settle(this.enemies.length + this.pendingSpawns.length)
    if (income !== null) {
      this.payDemeterIncome()
      this.cameras.main.flash(220, 70, 56, 10) // juice: a soft gold pulse celebrates a cleared wave
      const gate = OLYMPUS_PATH[OLYMPUS_PATH.length - 1]
      this.floatText(gate.x - 44, gate.y - 44, `+${income} 🪙`, '#ffe066')
      // spike traps forget everyone they've popped — ids are unique per spawn, a settle means all dead
      for (const s of this.spikes.values()) s.hitIds.clear()
      this.showWavePreview(this.run.wave + 1) // telegraph what's coming while the player can still act
    }
  }

  /** Drain React→Phaser intents and forward them to the authoritative run. */
  private applyIntents(): void {
    for (const it of useGameStore.getState().drainIntents()) {
      if (it.type === 'startWave') this.run.requestStartWave()
      else if (it.type === 'pickDraft') this.run.pickDraft(it.index)
      else if (it.type === 'sellTower') this.sellSelectedTower()
      else if (it.type === 'upgradeTower') this.upgradeSelectedTower(it.path)
      else if (it.type === 'setTargeting') this.setSelectedTargeting(it.mode)
      else if (it.type === 'cheatGold') this.run.cheatGold()
      else if (it.type === 'cheatInvincible') this.run.toggleInvincible()
      else if (it.type === 'playAgain') {
        // ORDER MATTERS: clear store mirrors → reset speed → restart, or the overlay sticks.
        useGameStore.getState().resetRun()
        useGameStore.getState().setSpeed(1)
        this.scene.restart()
        return
      }
    }
  }

  /**
   * Pause the sim for the Fate Draft (stashing the player's prior speed so 3× FF survives), and run
   * the draft's DECISION CLOCK on wall time: when it expires, the Fates pick a random card — an AFK
   * player never blocks the run, and a present one feels the urgency. The clock freezes while a menu
   * overlay (Pantheon / Ranks) is open, and the delta clamp means a hidden tab resumes, not expires.
   */
  private syncDraftPause(deltaMs: number): void {
    const store = useGameStore.getState()
    const open = !!this.run.draft
    if (open && !this.draftWasOpen) {
      this.draftWasOpen = true
      this.draftClockMs = DRAFT_TIMER_MS
      store.setPreDraftScale(store.timeScale === 0 ? 1 : store.timeScale)
      store.setSpeed(0)
    } else if (!open && this.draftWasOpen) {
      this.draftWasOpen = false
      store.setSpeed(store.preDraftScale || 1)
    }
    if (open) {
      if (!store.pantheonOpen && !store.leaderboardOpen) {
        this.draftClockMs -= Math.min(deltaMs, 100) // clamp: returning from a hidden tab resumes the clock
        if (this.draftClockMs <= 0) {
          const draft = this.run.draft!
          this.run.pickDraft(Math.floor(Math.random() * draft.length)) // the Fates grow impatient
        }
      }
      store.setDraftTimer(Math.max(0, Math.ceil(this.draftClockMs / 1000)))
    } else {
      store.setDraftTimer(null)
    }
  }

  /** End the run: bank Favor (fire-and-forget — never await, or the lose screen hangs). */
  private endRun(): void {
    this.runEnded = true
    const session = useSessionStore.getState()
    const s = this.run.runStats()
    const result = {
      waveReached: this.run.wave,
      victory: false,
      kills: this.run.kills,
      bossesKilled: s.bossesKilled,
      goldSpent: s.goldSpent,
      goldEarned: s.goldEarned,
      towersBuilt: s.towersBuilt,
      worstWave: s.worstWave,
      worstWaveLives: s.worstWaveLives,
    }
    const prevBestWave = session.progress.stats.bestWave // captured BEFORE applyRun bumps it — an honest "new best"
    const bestWave = Math.max(prevBestWave, this.run.wave)
    void session.applyRun(result) // bumps stats.bestWave synchronously before submitScore reads it
    void session.submitScore() // account-gated + only posts if it beats your board entry; fire-and-forget

    useGameStore.getState().setRunSummary({
      wave: this.run.wave,
      favor: favorFromRun(result),
      bestWave,
      prevBestWave,
      kills: this.run.kills,
      bossesKilled: s.bossesKilled,
      goldEarned: s.goldEarned,
      goldSpent: s.goldSpent,
      towersBuilt: s.towersBuilt,
      worstWave: s.worstWave,
      worstWaveLives: s.worstWaveLives,
    })
  }

  private onEnemyLeak(enemy: Enemy): void {
    const lost = this.run.onLeak(enemy.leakWeight)
    this.removeEnemy(enemy)
    if (lost) this.flashLeak()
  }

  /** Red pulse at the Olympus gate — the game's only negative feedback, so it's mandatory. */
  private flashLeak(): void {
    const end = OLYMPUS_PATH[OLYMPUS_PATH.length - 1]
    const flash = this.add.circle(end.x, end.y, 26, 0xff2d3a, 0.6).setDepth(9)
    this.tweens.add({ targets: flash, scale: 2.2, alpha: 0, duration: 320, onComplete: () => flash.destroy() })
    this.cameras.main.shake(120, 0.004)
    this.cameras.main.flash(160, 90, 12, 16) // juice: a dim red screen pulse — the leak STINGS
  }

  private spawnEnemy(desc: SpawnDesc): void {
    const enemy = createEnemy(desc.kind)
    enemy.hp = desc.hp
    enemy.maxHp = desc.hp
    enemy.speed = desc.speed
    enemy.bounty = desc.bounty
    enemy.leakWeight = desc.leakWeight
    if (desc.splitDepth !== undefined) enemy.splitDepth = desc.splitDepth
    if (desc.spawnAtT !== undefined) enemy.pathT = desc.spawnAtT // split children appear mid-path
    if (desc.bossId !== undefined) enemy.bossId = desc.bossId
    if (desc.damageCap !== undefined) enemy.damageCap = desc.damageCap
    if (desc.armor !== undefined) enemy.armor = desc.armor // boss armor overrides the kind trait
    if (enemy.kind === 'boss' && enemy.bossId) {
      // derive the live mechanic fields from the roster (Minotaur's CC-resist + charge)
      const m = bossById(enemy.bossId).mechanic
      if (m.slowResist !== undefined) enemy.slowResist = m.slowResist
      if (m.knockbackImmune) enemy.knockbackImmune = true
      if (m.charge) {
        enemy.charge = m.charge
        enemy.baseSpeed = enemy.speed
        enemy.chargeTimerMs = m.charge.periodMs
      }
    }
    this.enemies.push(enemy)
    if (enemy.kind === 'boss') this.telegraphBoss(enemy)
    const pos = this.path.getPointAt(enemy.pathT)
    const isBoss = enemy.kind === 'boss'
    const depth = isBoss ? 6 : enemy.flying ? 5 : 4 // bosses ride above everything
    const texKey = isBoss && enemy.bossId ? enemy.bossId : enemy.kind
    // Pixel art reads best drawn larger than the hitbox disc; the per-kind ladder keeps silhouettes
    // distinct (shade small → talos huge), and bosses get real presence.
    const artPx = isBoss ? Math.round(110 * SIZE_SCALE) : (ENEMY_ART_PX[enemy.kind] ?? Math.max(enemyRadius(enemy) * 3, 46))
    const sizePx = DirAnimSprite.hasDirectional(this, texKey) ? artPx : enemyRadius(enemy) * 2
    let sprite: Phaser.GameObjects.Arc | Phaser.GameObjects.Image | Phaser.GameObjects.Sprite
    if (DirAnimSprite.hasDirectional(this, texKey)) {
      // 8-direction pixel art: faces its heading + cycles a walk while it advances down the path
      const art = new DirAnimSprite(this, texKey, pos.x, pos.y, sizePx, depth)
      art.play('walk')
      this.enemyArt.set(enemy.id, art)
      sprite = art.sprite
    } else if (hasSprite(texKey)) {
      sprite = this.addSpriteScaled(texKey, pos.x, pos.y, sizePx).setDepth(depth)
    } else {
      sprite = this.add
        .circle(pos.x, pos.y, enemyRadius(enemy), enemyColor(enemy), 1)
        .setStrokeStyle(isBoss ? 4 : enemy.flying ? 3 : 2, enemyStroke(enemy))
        .setDepth(depth)
    }
    if (enemy.stealth) sprite.setAlpha(0.5) // hidden — reads as a ghostly shimmer
    this.enemySprites.set(enemy.id, sprite)
    if (this.groundTiled && enemy.flying) {
      // FLIERS ONLY (M9-S3): a small offset shadow makes altitude read; grounded creatures stand
      // directly on the terrain — their shadows made the whole roster look like it floated.
      const shDy = sizePx * 0.45
      const shadow = this.add.ellipse(pos.x, pos.y + shDy, sizePx * 0.4, sizePx * 0.18, 0x000000, 0.18).setDepth(3.5)
      shadow.setData('dy', shDy)
      this.enemyShadows.set(enemy.id, shadow)
    }
    // juice: pop into existence (squash-stretch) instead of blinking in — relative to the baseline scale
    // so a scaled sprite keeps its intended size (a placeholder disc's baseline is 1). The baseline is
    // stashed on the sprite so overlapping hit-punch tweens can anchor to it instead of ratcheting.
    const base = (sprite.getData('baseScale') as number) ?? sprite.scale
    sprite.setData('baseScale', base)
    sprite.setScale(base * 0.4)
    const fromMouth = desc.spawnAtT === undefined // fresh spawns walk out of the hellmouth
    if (fromMouth) {
      // rise out of the pit: fade in while the sim walks them over the rim (position is NEVER
      // tweened — the fixed-substep sim owns it). Stealth keeps its half-alpha ceiling.
      const targetAlpha = enemy.stealth ? 0.5 : 1
      sprite.setAlpha(0)
      this.tweens.add({ targets: sprite, alpha: targetAlpha, duration: 350, ease: 'Sine.easeOut' })
      const sh = this.enemyShadows.get(enemy.id)
      if (sh) {
        sh.setAlpha(0)
        this.tweens.add({ targets: sh, alpha: 0.18, duration: 350, ease: 'Sine.easeOut' })
      }
      if (this.enemies.length + this.projectiles.length <= 30) {
        this.burst(97, 161, 4, 0xff7040, 18, 2, 260) // the mouth coughs embers with each arrival
      }
    }
    this.tweens.add({
      targets: sprite,
      scale: base,
      duration: isBoss ? 360 : fromMouth ? 350 : 200,
      ease: 'Back.easeOut',
    })
  }

  /**
   * Telegraph what the NEXT wave brings — BEFORE it starts, while the counter is still buyable
   * (a debut kind's hint, a boss warning, or an elite-legion callout; boss > debut > elite priority).
   * RunController grants a longer build grace on these waves so the warning is actionable.
   */
  private showWavePreview(nextWave: number): void {
    const preview = wavePreview(nextWave)
    let msg: string | null = null
    let color = '#bfe3ff'
    if (preview.bossId) {
      const boss = bossById(preview.bossId)
      msg = `⚠ NEXT WAVE: ${boss.name.toUpperCase()} ⚠\n${boss.telegraph}`
      color = '#ffe6a0'
    } else if (preview.debutKind && DEBUT_HINTS[preview.debutKind]) {
      msg = `NEXT WAVE — ${DEBUT_HINTS[preview.debutKind]}`
    } else if (preview.elite) {
      msg = '⚔ ELITE LEGION — the heavy kinds mass!'
      color = '#ffc9a0'
      this.cameras.main.shake(140, 0.003)
    }
    if (!msg) return
    const t = this.add
      .text(GAME_WIDTH / 2, 72, msg, {
        fontFamily: 'Silkscreen, Georgia, serif',
        fontSize: '16px',
        color,
        align: 'center',
        backgroundColor: '#000000aa',
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0.5)
      .setDepth(20)
      .setStroke('#000000', 3)
    t.setScale(0.7)
    this.tweens.add({ targets: t, scale: 1, duration: 200, ease: 'Back.easeOut' })
    this.tweens.add({ targets: t, alpha: 0, delay: 3600, duration: 800, onComplete: () => t.destroy() })
  }

  /** A dramatic banner + spatial entrance every time a boss actually arrives on the field. */
  private telegraphBoss(enemy: Enemy): void {
    if (!enemy.bossId) return
    const boss = bossById(enemy.bossId)
    // juice: a dramatic entrance — shake + a brief punch-zoom that settles back
    this.cameras.main.shake(300, 0.008)
    this.cameras.main.zoomTo(1.08, 320, 'Sine.easeInOut')
    this.time.delayedCall(1100, () => this.cameras.main.zoomTo(1, 480, 'Sine.easeInOut'))
    // WHERE the threat comes from: the whole lane flashes in the boss's color…
    const lane = this.add.graphics().setDepth(2.5)
    lane.lineStyle(6, boss.color, 0.35)
    this.strokePolyline(lane)
    this.tweens.add({ targets: lane, alpha: 0, duration: 900, onComplete: () => lane.destroy() })
    // …a shockwave rips out of the rift…
    const start = OLYMPUS_PATH[0]
    for (const [color, delay] of [
      [boss.color, 0],
      [0xffffff, 120],
    ] as const) {
      const ring = this.add.circle(start.x, start.y, 30, 0x000000, 0).setStrokeStyle(3, color, 0.9).setDepth(8)
      ring.setBlendMode(Phaser.BlendModes.ADD)
      ring.setScale(0.2)
      this.tweens.add({ targets: ring, scale: 3, alpha: 0, delay, duration: 700, onComplete: () => ring.destroy() })
    }
    // …and the field briefly dims behind the banner for a cinematic beat.
    const dim = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0).setDepth(15)
    this.tweens.add({ targets: dim, fillAlpha: 0.25, duration: 350, yoyo: true, hold: 500, onComplete: () => dim.destroy() })
    const t = this.add
      .text(GAME_WIDTH / 2, 80, `⚠ ${boss.name.toUpperCase()} ⚠\n${boss.telegraph}`, {
        fontFamily: 'Silkscreen, Georgia, serif',
        fontSize: '17px',
        color: '#ffe6a0',
        align: 'center',
        backgroundColor: '#000000c0',
        padding: { x: 16, y: 9 },
      })
      .setOrigin(0.5)
      .setDepth(20)
    t.setScale(0.6)
    this.tweens.add({ targets: t, scale: 1, duration: 260, ease: 'Back.easeOut' })
    this.tweens.add({ targets: t, alpha: 0, delay: 4200, duration: 900, onComplete: () => t.destroy() })
  }

  private removeEnemy(enemy: Enemy): void {
    const sprite = this.enemySprites.get(enemy.id)
    if (sprite) this.tweens.killTweensOf(sprite) // in-flight punch/pop tweens must not touch a dead object
    sprite?.destroy()
    this.enemySprites.delete(enemy.id)
    this.enemyArt.delete(enemy.id)
    this.enemyShadows.get(enemy.id)?.destroy()
    this.enemyShadows.delete(enemy.id)
    this.posCache.delete(enemy.id)
    this.charmedIds.delete(enemy.id)
    for (const s of this.spikes.values()) s.hitIds.delete(enemy.id) // ids never recur — keep the sets tight
    const idx = this.enemies.indexOf(enemy)
    if (idx >= 0) this.enemies.splice(idx, 1)
  }

  /** Mobile gods (Hermes) orbit their placed center; recompute pos + move the sprite each frame. */
  private updateMobileTowers(dtSec: number): void {
    for (const tower of this.towers) {
      const m = TOWER_STATS[tower.god].mobile
      if (!m) continue
      tower.orbitPhase += m.angularSpeed * dtSec
      tower.pos.x = tower.center.x + Math.cos(tower.orbitPhase) * m.orbitRadius
      tower.pos.y = tower.center.y + Math.sin(tower.orbitPhase) * m.orbitRadius
      this.towerSprites.get(tower.id)?.setPosition(tower.pos.x, tower.pos.y)
      this.towerShadows.get(tower.id)?.setPosition(tower.pos.x, tower.pos.y + 18) // the flier's ground shadow trails it
    }
  }

  /** Fold every Athena's aura (pos + r² + buff) once per sim step; auraAt then just checks distance. */
  private foldStepAuras(): void {
    this.stepAuras.length = 0
    for (const a of this.towers) {
      const buff = auraBuff(a)
      if (!buff) continue
      const r = this.towerEff(a).range
      this.stepAuras.push({ pos: a.pos, r2: r * r, damageMul: buff.damageMul, fireRateMul: buff.fireRateMul, detect: buff.detect })
    }
  }

  /** Athena: the combined buff (+ stealth detection) at a point from every covering aura tower. */
  private auraAt(pos: Vec2): { damageMul: number; fireRateMul: number; detect: boolean } {
    let damageMul = 1
    let fireRateMul = 1
    let detect = false
    for (const a of this.stepAuras) {
      if ((a.pos.x - pos.x) ** 2 + (a.pos.y - pos.y) ** 2 > a.r2) continue
      damageMul *= a.damageMul
      fireRateMul *= a.fireRateMul
      detect = detect || a.detect
    }
    return { damageMul, fireRateMul, detect }
  }

  /**
   * Aphrodite: charm a STABLE set of up to N foes (not the whole lane). A charmed foe stays charmed
   * while alive + in range; freed slots are filled by the lead un-charmed foe. Holding membership by
   * id (instead of re-sorting every frame) stops the slowed set from churning/flickering, and foes
   * outside the set are genuinely unaffected.
   */
  private updateSlowAuras(): void {
    // rebuild the scene-wide charm roster each step — the tint pass + hitEnemy's flash-restore read it
    const wasCharmed = new Set(this.charmedIds)
    this.charmedIds.clear()
    let byId: Map<string, Enemy> | null = null
    for (const tower of this.towers) {
      const aura = TOWER_STATS[tower.god].slowAura
      if (!aura) continue
      if (!byId) {
        byId = new Map()
        for (const e of this.enemies) byId.set(e.id, e)
      }
      const eff = this.towerEff(tower)
      const cap = Math.max(0, Math.floor(eff.slowTargets))
      const r2 = eff.range * eff.range
      const inRange = (e: Enemy): boolean => {
        const ep = this.enemyPos(e)
        return (tower.pos.x - ep.x) ** 2 + (tower.pos.y - ep.y) ** 2 <= r2
      }
      let charmed = this.charmedByTower.get(tower.id)
      if (!charmed) {
        charmed = new Set()
        this.charmedByTower.set(tower.id, charmed)
      }
      // 1. release any charmed foe that died or walked out of range (its slow lifts on its own ≤refreshMs)
      for (const id of [...charmed]) {
        const e = byId.get(id)
        if (!e || !inRange(e)) charmed.delete(id)
      }
      // 2. fill free slots with the lead (furthest-along) in-range foes not already held
      if (charmed.size < cap) {
        const fresh = this.enemies
          .filter((e) => !charmed!.has(e.id) && inRange(e))
          .sort((a, b) => b.pathT - a.pathT)
        for (const e of fresh) {
          if (charmed.size >= cap) break
          charmed.add(e.id)
        }
      }
      // 3. hold the slow on exactly the charmed set (stable → smooth; everyone else stays free)
      for (const id of charmed) {
        const e = byId.get(id)
        if (e) {
          applySlow(e, eff.slowMul, aura.refreshMs)
          this.charmedIds.add(id)
        }
      }
    }
    // charm is otherwise invisible — tint held foes pink, and clear the tint the moment charm lifts
    for (const id of this.charmedIds) {
      if (wasCharmed.has(id)) continue
      const s = this.enemySprites.get(id)
      if (s && !(s instanceof Phaser.GameObjects.Arc)) s.setTint(0xff9ec7)
    }
    for (const id of wasCharmed) {
      if (this.charmedIds.has(id)) continue
      const s = this.enemySprites.get(id)
      if (s && !(s instanceof Phaser.GameObjects.Arc)) s.clearTint()
    }
  }

  // ── Hephaestus spike traps (deployable) ──
  /** Produce/refill a Hephaestus trap at the nearest path point (one trap per tower). */
  private produceSpike(tower: Tower, eff: { damage: number; maxCharges: number }, dep: { hitRadius: number }): void {
    let spike = this.spikes.get(tower.id)
    const dmg = this.run.effectiveDamage(tower.god, eff.damage)
    if (!spike) {
      spike = { pos: this.nearestPathPoint(tower.pos), charges: 0, damage: dmg, hitRadius: dep.hitRadius, hitIds: new Set() }
      this.spikes.set(tower.id, spike)
    }
    spike.damage = dmg // keep current (boons/upgrades may have changed it)
    const gained = spike.charges < eff.maxCharges
    spike.charges = Math.min(spike.charges + 1, eff.maxCharges)
    this.drawSpike(tower.id, spike)
    if (gained) {
      // the forge's "shot" is a NEW charge — swing the hammer only when one is actually made
      // (swinging on every production tick at a full trap read as a nonstop spasm)
      this.towerLastFire.set(tower.id, this.time.now)
      this.towerArt.get(tower.id)?.playOnce('attack')
    }
  }

  /** Each frame: a charged trap pops every ground enemy that walks over it (once each). */
  private updateSpikes(): void {
    for (const [ownerId, spike] of this.spikes) {
      if (spike.charges <= 0) continue
      // backward over the live array (no slice alloc) — same safety as the projectile loop
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        if (spike.charges <= 0) break
        const e = this.enemies[j]
        if (e.flying || spike.hitIds.has(e.id)) continue // ground-only, once per enemy
        const ep = this.enemyPos(e)
        const r = spike.hitRadius + damagedRadius(enemyRadius(e), e.hp / e.maxHp)
        if ((spike.pos.x - ep.x) ** 2 + (spike.pos.y - ep.y) ** 2 <= r * r) {
          spike.hitIds.add(e.id)
          spike.charges -= 1
          this.hitEnemy(e, spike.damage, 0xd6a15a) // forge-ember sparks
        }
      }
      this.drawSpike(ownerId, spike)
    }
  }

  /** Closest world point on the path to `pos` (coarse scan; called once per trap). */
  private nearestPathPoint(pos: Vec2): Vec2 {
    let best = this.path.getPointAt(0)
    let bestD = Infinity
    for (let t = 0; t <= 1; t += 0.01) {
      const p = this.path.getPointAt(t)
      const d = (p.x - pos.x) ** 2 + (p.y - pos.y) ** 2
      if (d < bestD) {
        bestD = d
        best = p
      }
    }
    return best
  }

  private drawSpike(ownerId: string, spike: Spike): void {
    let g = this.spikeGfx.get(ownerId)
    if (!g) {
      g = this.add.graphics().setDepth(3)
      this.spikeGfx.set(ownerId, g)
    }
    g.clear()
    if (spike.charges <= 0) return
    const n = Math.min(spike.charges, 8) // a little caltrop pile that grows with charges
    g.lineStyle(2, 0xd6a15a, 0.95)
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2
      const len = spike.hitRadius * 0.8
      g.beginPath()
      g.moveTo(spike.pos.x, spike.pos.y)
      g.lineTo(spike.pos.x + Math.cos(a) * len, spike.pos.y + Math.sin(a) * len)
      g.strokePath()
    }
    g.fillStyle(0x7a4a1e, 0.6)
    g.fillCircle(spike.pos.x, spike.pos.y, 3)
  }

  // ── firing ──
  private fireHitscan(tower: Tower, target: Enemy, damage: number): void {
    const to = this.enemyPos(target)
    if (tower.god === 'hermes') this.drawDart(tower.pos, to)
    else this.drawLightning(tower.pos, to)
    this.hitEnemy(target, damage, TOWER_STATS[tower.god].color) // element-hued impact sparks
  }

  private fireProjectile(tower: Tower, target: Enemy, damage: number, pierce: number, projectileSpeed: number): void {
    const stats = TOWER_STATS[tower.god]
    const tp = this.enemyPos(target)
    const proj = createProjectile(
      tower.pos,
      { x: tp.x - tower.pos.x, y: tp.y - tower.pos.y },
      projectileSpeed,
      damage,
      pierce,
      stats.canHitAir ?? false,
    )
    this.projectiles.push(proj)
    const angle = Math.atan2(proj.vy, proj.vx)
    const projKey = `proj_${tower.god}`
    const sprite: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image = hasSprite(projKey)
      ? this.addSpriteScaled(projKey, proj.pos.x, proj.pos.y, Math.round(16 * SIZE_SCALE)).setRotation(angle).setDepth(7)
      : this.add
          .rectangle(proj.pos.x, proj.pos.y, Math.round(16 * SIZE_SCALE), Math.round(4 * SIZE_SCALE), stats.color, 1)
          .setRotation(angle)
          .setDepth(7)
          .setBlendMode(Phaser.BlendModes.ADD) // the fallback bolt glows in its element color
    sprite.setData('trailColor', stats.color) // the fading trail reads this (an Image has no fillColor)
    this.projSprites.set(proj.id, sprite)
  }

  private updateProjectiles(dtSec: number): void {
    // juice budget: trails thin out as the field crowds, so 3× swarm fights stay readable
    const load = 30 / Math.max(30, this.enemies.length + this.projectiles.length)
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i]
      advanceProjectile(p, dtSec)
      const ps = this.projSprites.get(p.id)
      ps?.setPosition(p.pos.x, p.pos.y)
      // juice: a glowing speed-stretched streak so fast shots read as motion (in the projectile's color)
      if (ps && Math.random() < 0.8 * load) {
        const trailColor = (ps.getData('trailColor') as number) ?? 0xffffff
        const t = this.add
          .ellipse(p.pos.x, p.pos.y, 11, 3, trailColor, 0.55)
          .setRotation(Math.atan2(p.vy, p.vx))
          .setDepth(6)
          .setBlendMode(Phaser.BlendModes.ADD)
        this.tweens.add({ targets: t, alpha: 0, scaleX: 0.3, duration: 140, onComplete: () => t.destroy() })
      }
      // collide with enemies — iterate BACKWARD over the live array (no per-frame slice alloc): a hit
      // can only remove the current index or push split-children past the start point, both safe here.
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        if (p.pierceLeft < 0) break
        const e = this.enemies[j]
        if (p.hitIds.includes(e.id)) continue
        if (e.flying && !p.canHitAir) continue // ground-only arrows pass under fliers
        const ep = this.enemyPos(e)
        const hitR = damagedRadius(enemyRadius(e), e.hp / e.maxHp) + 5
        if ((p.pos.x - ep.x) ** 2 + (p.pos.y - ep.y) ** 2 <= hitR * hitR) {
          p.hitIds.push(e.id)
          p.pierceLeft -= 1
          this.hitEnemy(e, p.damage, (ps?.getData('trailColor') as number) ?? 0xffffff)
        }
      }
      if (projectileDone(p, BOUNDS)) this.removeProjectile(i)
    }
  }

  private removeProjectile(index: number): void {
    const p = this.projectiles[index]
    this.projSprites.get(p.id)?.destroy()
    this.projSprites.delete(p.id)
    this.projectiles.splice(index, 1)
  }

  // ── damage + feedback ──
  private hitEnemy(enemy: Enemy, dmg: number, sparkColor = 0xffffff): void {
    // Pantheon Titan-Slayer adds damage vs bosses (before the boss's own damage cap clamps it).
    const amount = enemy.kind === 'boss' ? dmg * this.run.bossDamageMul : dmg
    const dead = damageEnemy(enemy, amount)
    const pos = this.enemyPos(enemy)
    if (dead) {
      this.killEnemy(enemy, pos)
      return
    }
    const sprite = this.enemySprites.get(enemy.id)
    // juice budget: under heavy fire, throttle the per-sprite flash (no solid-white strobing) and
    // thin the sparks so the swarm stays readable exactly when it matters most.
    const now = this.time.now
    const canFlash = sprite ? now - ((sprite.getData('lastFlashMs') as number) ?? -1e9) >= 90 : false
    if (sprite && canFlash) {
      sprite.setData('lastFlashMs', now)
      const frac = enemy.hp / enemy.maxHp
      if (sprite instanceof Phaser.GameObjects.Arc) {
        // placeholder disc: convey HP via radius shrink + heat-ramp fill, with a brief white flash
        sprite.setRadius(damagedRadius(enemyRadius(enemy), frac))
        sprite.setFillStyle(0xffffff)
        this.time.delayedCall(70, () => {
          if (sprite.active) sprite.setFillStyle(damagedColor(enemyColor(enemy), frac))
        })
      } else {
        // real sprite: a brief white hit-flash (HP reads from the ring; recoloring art would muddy it)
        sprite.setTintFill(0xffffff)
        this.time.delayedCall(70, () => {
          if (!sprite.active) return
          // restore the charm tint instead of stripping it — the flash must not "cure" Aphrodite's hold
          if (this.charmedIds.has(enemy.id)) sprite.setTint(0xff9ec7)
          else sprite.clearTint()
        })
      }
      // punch anchored to the STORED baseline (explicit from/to): overlapping hits at 3× used to
      // capture each other's inflated scale and permanently balloon the sprite — from: base pins it.
      const base = (sprite.getData('baseScale') as number) ?? sprite.scale
      this.tweens.add({
        targets: sprite,
        scaleX: { from: base, to: base * 1.15 },
        scaleY: { from: base, to: base * 1.15 },
        duration: 55,
        yoyo: true,
      })
    }
    const load = 30 / Math.max(30, this.enemies.length + this.projectiles.length)
    this.burst(pos.x, pos.y, Math.max(1, Math.round(4 * load)), sparkColor, 14, 2, 150)
  }

  private killEnemy(enemy: Enemy, at: Vec2): void {
    // Hydra split / Cyclops adds: children MUST enter this.enemies (via spawnEnemy) BEFORE settle()
    // reads .length this frame, or the clear-gate false-triggers between the death and the kids' birth.
    for (const child of onDeath(enemy)) this.spawnEnemy(child)
    const color = enemyColor(enemy)
    const isBoss = enemy.kind === 'boss'
    this.burst(at.x, at.y, isBoss ? 40 : 14, color, isBoss ? 70 : 28, isBoss ? 8 : 3, isBoss ? 520 : 240)
    if (isBoss) this.cameras.main.shake(320, 0.013) // a felled boss rocks the screen
    const poof = this.add.circle(at.x, at.y, isBoss ? 20 : 12, color, 0.7).setDepth(7)
    this.tweens.add({ targets: poof, scale: isBoss ? 4 : 2.4, alpha: 0, duration: isBoss ? 360 : 200, onComplete: () => poof.destroy() })
    // A death BEAT instead of a blink-out: detach the sprite (the sim forgets the enemy immediately —
    // clear-gate/targeting untouched) and squash-fade the corpse, so the pixel body gets its moment.
    const sprite = this.enemySprites.get(enemy.id)
    if (sprite && sprite.active) {
      this.enemySprites.delete(enemy.id) // detach BEFORE removeEnemy so it isn't destroyed with the enemy
      this.enemyArt.delete(enemy.id) // …and no anim update touches the dying sprite
      this.tweens.killTweensOf(sprite)
      if (!(sprite instanceof Phaser.GameObjects.Arc)) sprite.setTint(damagedColor(color, 0.4))
      const base = (sprite.getData('baseScale') as number) ?? sprite.scale
      this.tweens.add({
        targets: sprite,
        scaleX: base * 1.3,
        scaleY: base * 0.1,
        y: sprite.y + 6,
        alpha: 0,
        angle: isBoss ? 90 : 0,
        duration: isBoss ? 420 : 180,
        ease: 'Sine.easeIn',
        onComplete: () => sprite.destroy(),
      })
    }
    // meaty kills pay VISIBLY — but only while the field is readable (skip the float under swarm load)
    if (enemy.bounty >= BOUNTY_FLOAT_MIN && this.enemies.length <= BOUNTY_FLOAT_MAX_BODIES) {
      this.floatText(at.x, at.y - 14, `+${enemy.bounty}`, '#ffe066')
    }
    this.removeEnemy(enemy)
    this.run.onKill(enemy.bounty, enemy.kind === 'boss')
  }

  /** A cheap particle burst — small circles that fly outward and fade. */
  private burst(x: number, y: number, count: number, color: number, dist: number, size: number, dur: number): void {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2
      const d = dist * (0.5 + Math.random() * 0.5)
      const s = this.add.circle(x, y, size, color, 1).setDepth(7)
      this.tweens.add({
        targets: s,
        x: x + Math.cos(a) * d,
        y: y + Math.sin(a) * d,
        alpha: 0,
        scale: 0.3,
        duration: dur,
        onComplete: () => s.destroy(),
      })
    }
  }

  private drawLightning(from: Vec2, to: Vec2): void {
    this.strokeBolt(from, to, 1)
    // impact: a white pop + a widening shock ring at the strike point
    const flash = this.add.circle(to.x, to.y, 6, 0xffffff, 0.95).setDepth(8).setBlendMode(Phaser.BlendModes.ADD)
    this.tweens.add({ targets: flash, scale: 2.2, alpha: 0, duration: 130, onComplete: () => flash.destroy() })
    const ring = this.add
      .circle(to.x, to.y, 9, 0x000000, 0)
      .setStrokeStyle(2, 0xbfe3ff, 0.8)
      .setDepth(8)
      .setBlendMode(Phaser.BlendModes.ADD) // share the depth-8 ADD blend group (no pipeline flush)
    this.tweens.add({ targets: ring, scale: 1.9, alpha: 0, duration: 180, onComplete: () => ring.destroy() })
    // 40ms echo: a second, thinner re-rolled strike — thunder rolls twice. Skipped under swarm load.
    if (this.enemies.length + this.projectiles.length <= 30) {
      this.time.delayedCall(40, () => {
        if (this.scene.isActive()) this.strokeBolt(from, to, 0.55)
      })
    }
  }

  /** One fractal bolt (main + forks) drawn in 3 passes on a single Graphics: glow → beam → core.
   *  Under swarm load the bolt drops to depth 3 + 2 passes — the halo is invisible in the chaos
   *  anyway, and Graphics polylines re-tessellate every frame (review perf finding). */
  private strokeBolt(from: Vec2, to: Vec2, intensity: number): void {
    const loaded = this.enemies.length + this.projectiles.length > 30
    const bolt = boltPoints(from, to, loaded ? 3 : 4)
    const g = this.add.graphics().setDepth(8).setBlendMode(Phaser.BlendModes.ADD)
    const passes: [number, number, number][] = loaded
      ? [
          [4, 0xbfe3ff, 0.55 * intensity],
          [2, 0xffffff, 1 * intensity],
        ]
      : [
          [8, 0xbfe3ff, 0.15 * intensity],
          [4, 0xbfe3ff, 0.55 * intensity],
          [2, 0xffffff, 1 * intensity],
        ]
    for (const [width, color, alpha] of passes) {
      g.lineStyle(width, color, alpha)
      g.beginPath()
      g.moveTo(bolt.main[0].x, bolt.main[0].y)
      for (let i = 1; i < bolt.main.length; i++) g.lineTo(bolt.main[i].x, bolt.main[i].y)
      g.strokePath()
    }
    // forks render thin — wisps that die out, not second strikes
    g.lineStyle(1.5, 0xbfe3ff, 0.5 * intensity)
    for (const fork of bolt.forks) {
      g.beginPath()
      g.moveTo(fork[0].x, fork[0].y)
      for (let i = 1; i < fork.length; i++) g.lineTo(fork[i].x, fork[i].y)
      g.strokePath()
    }
    this.tweens.add({ targets: g, alpha: 0, duration: 140, onComplete: () => g.destroy() })
  }

  /** Poseidon's tidal slam — damage all GROUND foes in a radius + shove survivors back down the path. */
  private fireSplash(origin: Vec2, center: Vec2, damage: number, radius: number, knockback: number, sparkColor = 0x3a8fb5): void {
    this.drawSplash(origin, center, radius)
    for (let j = this.enemies.length - 1; j >= 0; j--) {
      const e = this.enemies[j]
      if (e.flying) continue // a tidal wave hits the ground, not fliers
      const ep = this.enemyPos(e)
      if ((ep.x - center.x) ** 2 + (ep.y - center.y) ** 2 > radius * radius) continue
      this.hitEnemy(e, damage, sparkColor)
      if (knockback > 0 && e.hp > 0 && !e.knockbackImmune) e.pathT = Math.max(0, e.pathT - knockback) // shove survivors back
    }
  }

  /** A directional crescent wave: Poseidon SENDS the sea at the target instead of popping a circle. */
  private drawSplash(origin: Vec2, center: Vec2, radius: number): void {
    const ang = Math.atan2(center.y - origin.y, center.x - origin.x)
    const dist = Math.max(24, Math.hypot(center.x - origin.x, center.y - origin.y))
    const g = this.add.graphics().setDepth(7)
    const proxy = { t: 0.55 }
    this.tweens.add({
      targets: proxy,
      t: 1.05,
      duration: 320,
      ease: 'Sine.easeOut',
      onUpdate: () => {
        // the crest travels outward FROM the god, through the impact point. Envelope: a short
        // pop-in ramp, then fade that reaches EXACTLY 0 at tween end (review: the old +0.25 floor
        // made every wave blink out at ~20% opacity).
        const r = dist * proxy.t + radius * Math.max(0, proxy.t - 0.9) * 2
        const ramp = Math.min(1, (proxy.t - 0.55) / 0.08)
        const fade = Math.max(0, (1.05 - proxy.t) / 0.5) * 1.15 * ramp
        const half = 0.55 - (proxy.t - 0.55) * 0.25 // the wave tightens as it runs
        g.clear()
        // bounded arc tessellation (arcPoints) — Graphics.arc() re-expands ~101 points per arc
        // per frame; 3 arcs × 20 segments keeps the crest under a tenth of that
        const passes: [number, number, number, number, number][] = [
          [7, 0x3a8fb5, 0.45 * fade, 1, 1],
          [3, 0x9fe0ff, 0.7 * fade, 0.96, 0.9],
          [1.5, 0xffffff, 0.85 * fade, 1, 0.75], // white crest
        ]
        for (const [width, color, alpha, rMul, halfMul] of passes) {
          g.lineStyle(width, color, alpha)
          const pts = arcPoints(origin.x, origin.y, r * rMul, ang - half * halfMul, ang + half * halfMul)
          g.beginPath()
          g.moveTo(pts[0].x, pts[0].y)
          for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y)
          g.strokePath()
        }
      },
      onComplete: () => g.destroy(),
    })
    // sea foam bursts where the wave breaks
    for (let i = 0; i < 8; i++) {
      const fa = ang + (Math.random() - 0.5) * 0.9
      const fr = radius * (0.3 + Math.random() * 0.7)
      const foam = this.add
        .circle(center.x, center.y, 1.5 + Math.random() * 1.5, 0xdff4ff, 0.85)
        .setDepth(7)
        .setBlendMode(Phaser.BlendModes.ADD)
      this.tweens.add({
        targets: foam,
        x: center.x + Math.cos(fa) * fr,
        y: center.y + Math.sin(fa) * fr,
        alpha: 0,
        duration: 260 + Math.random() * 120,
        ease: 'Sine.easeOut',
        onComplete: () => foam.destroy(),
      })
    }
    // trailing ripple rings + the honest damage-radius read (thin, full circle)
    for (const [delay, scale] of [[60, 0.55], [140, 0.8]] as const) {
      this.time.delayedCall(delay, () => {
        if (!this.scene.isActive()) return
        const rip = this.add.circle(center.x, center.y, radius * scale, 0x000000, 0).setStrokeStyle(1.5, 0x9fe0ff, 0.5).setDepth(7)
        this.tweens.add({ targets: rip, scale: 1.35, alpha: 0, duration: 300, onComplete: () => rip.destroy() })
      })
    }
    const read = this.add.circle(center.x, center.y, radius, 0x000000, 0).setStrokeStyle(1, 0x9fe0ff, 0.45).setDepth(7)
    this.tweens.add({ targets: read, alpha: 0, duration: 260, onComplete: () => read.destroy() })
  }

  /** Hermes' strike is pure SPEED: a stretched dart streak, ghost afterimages, and a muzzle flash. */
  private drawDart(from: Vec2, to: Vec2): void {
    // SNAPSHOT the strike line: `from` aliases the live tower.pos and Hermes ORBITS — the 40/80ms
    // ghost callbacks must stamp the line as it was at fire time, not where he has flown since.
    const fx = from.x
    const fy = from.y
    const tx = to.x
    const ty = to.y
    const ang = Math.atan2(ty - fy, tx - fx)
    const len = Math.hypot(tx - fx, ty - fy)
    // streak core: the dart sprite stretched along the flight line (falls back to a tapered blade).
    // Point-blank strikes (orbit directly over the target) skip it — atan2(0,0) points the art east.
    if (hasSprite('proj_hermes') && len >= 8) {
      const s = this.addSpriteScaled('proj_hermes', (fx + tx) / 2, (fy + ty) / 2, Math.round(22 * SIZE_SCALE))
        .setRotation(ang)
        .setDepth(8)
        .setBlendMode(Phaser.BlendModes.ADD)
      s.scaleX *= Math.min(4, (len * 0.6) / 22)
      this.tweens.add({ targets: s, alpha: 0, scaleX: s.scaleX * 0.4, duration: 90, onComplete: () => s.destroy() })
      // ghost afterimages trail the strike
      for (const [delay, frac, alpha] of [[40, 0.55, 0.5], [80, 0.8, 0.3]] as const) {
        this.time.delayedCall(delay, () => {
          if (!this.scene.isActive()) return
          const ghost = this.addSpriteScaled('proj_hermes', fx + (tx - fx) * frac, fy + (ty - fy) * frac, Math.round(20 * SIZE_SCALE))
            .setRotation(ang)
            .setAlpha(alpha)
            .setDepth(8)
            .setBlendMode(Phaser.BlendModes.ADD)
          this.tweens.add({ targets: ghost, alpha: 0, duration: 70, onComplete: () => ghost.destroy() })
        })
      }
    } else if (len >= 8) {
      const g = this.add.graphics().setDepth(8).setBlendMode(Phaser.BlendModes.ADD)
      g.fillStyle(0xe8e0ff, 0.9)
      const px = -Math.sin(ang)
      const py = Math.cos(ang)
      g.fillTriangle(fx + px * 2.5, fy + py * 2.5, fx - px * 2.5, fy - py * 2.5, tx, ty)
      this.tweens.add({ targets: g, alpha: 0, duration: 90, onComplete: () => g.destroy() })
    }
    // muzzle flash at the launch point
    const mz = this.add.circle(fx, fy, 4, 0xffffff, 0.9).setDepth(8).setBlendMode(Phaser.BlendModes.ADD)
    this.tweens.add({ targets: mz, scale: 1.8, alpha: 0, duration: 70, onComplete: () => mz.destroy() })
  }

  // ── overlay: range rings, debug target lines, HP rings ──
  private renderOverlay(): void {
    const showDebug = useGameStore.getState().showDebug
    const g = this.overlay
    g.clear()

    for (const tower of this.towers) {
      // Range ring shows ONLY for the selected tower (or every tower in debug) — never always-on,
      // including the support auras (Aphrodite / Athena), which now behave like every other range ring.
      const selected = tower.id === this.selectedTowerId
      if (selected) {
        // standing on sacred ground? show the blessing's reach (M10-S6)
        for (const s of SITES) {
          if (Math.hypot(tower.pos.x - s.pos.x, tower.pos.y - s.pos.y) <= s.radius) {
            g.lineStyle(1.5, 0xd9c879, 0.5)
            g.strokeCircle(s.pos.x, s.pos.y, s.radius)
            g.fillStyle(0xd9c879, 0.04)
            g.fillCircle(s.pos.x, s.pos.y, s.radius)
          }
        }
      }
      if (selected || showDebug) {
        const eff = this.towerEff(tower) // folded ONLY when actually drawn (this loop runs every frame)
        const range = eff.range
        const slow = TOWER_STATS[tower.god].slowAura
        const buff = TOWER_STATS[tower.god].auraBuff
        // simple solid range circles — dashes/breathing read as noise (2026-07-01 playtest)
        if (slow) {
          // Aphrodite's charm field — themed fill so the area reads, but only while selected
          g.fillStyle(0x6fd0e8, 0.1)
          g.fillCircle(tower.pos.x, tower.pos.y, range)
          g.lineStyle(1.5, 0x6fd0e8, selected ? 0.85 : 0.45)
          g.strokeCircle(tower.pos.x, tower.pos.y, range)
        } else if (buff) {
          g.fillStyle(0xd9c879, 0.08)
          g.fillCircle(tower.pos.x, tower.pos.y, range)
          g.lineStyle(1.5, 0xd9c879, selected ? 0.85 : 0.45)
          g.strokeCircle(tower.pos.x, tower.pos.y, range)
        } else {
          if (selected) {
            g.fillStyle(0xf5d061, 0.04) // a whisper of interior fill so coverage reads without occluding
            g.fillCircle(tower.pos.x, tower.pos.y, range)
          }
          g.lineStyle(1.5, selected ? 0xf5d061 : 0x6a7aa8, selected ? 0.85 : 0.5)
          g.strokeCircle(tower.pos.x, tower.pos.y, range)
        }
        // mobile gods: also trace the orbit path so its sweep is legible
        const m = TOWER_STATS[tower.god].mobile
        if (m) {
          g.lineStyle(1, 0xc7b3ff, 0.45)
          g.strokeCircle(tower.center.x, tower.center.y, m.orbitRadius)
        }
        if (showDebug) {
          const target = selectTarget(
            { pos: tower.pos, range, canHitAir: eff.canHitAir },
            this.enemies,
            this.enemyPos,
            tower.targeting,
          )
          if (target) {
            const tp = this.enemyPos(target)
            g.lineStyle(1, 0xf5d061, 0.7)
            g.lineBetween(tower.pos.x, tower.pos.y, tp.x, tp.y)
          }
        }
      }
    }

    // chunky underslung HP bar on each damaged enemy (pixel-crisp fillRects — the old anti-aliased
    // radial arc fought the crisp sprite look). Sits by the feet, next to the ground shadow.
    for (const e of this.enemies) {
      if (e.hp >= e.maxHp || e.kind === 'boss') continue
      const p = this.enemyPos(e)
      const frac = Math.max(0, e.hp / e.maxHp)
      const w = enemyRadius(e) * 2 // width stays HITBOX-honest
      const h = 3
      const x = p.x - w / 2
      const y = p.y + this.enemyArtPx(e) / 2 + 5 // but the bar hangs below the ART, not inside it
      g.fillStyle(0x000000, 0.7)
      g.fillRect(x - 1, y - 1, w + 2, h + 2)
      g.fillStyle(frac > 0.5 ? 0x6be36b : frac > 0.25 ? 0xe8b04a : 0xd2402f, 1)
      g.fillRect(x, y, Math.max(1, Math.round(w * frac)), h)
    }

    this.renderBossBars(g)
  }

  /** A prominent floating health bar above each live boss, with a white "damage ghost" chip segment. */
  private renderBossBars(g: Phaser.GameObjects.Graphics): void {
    for (const e of this.enemies) {
      if (e.kind !== 'boss') continue
      const p = this.enemyPos(e)
      const frac = Math.max(0, Math.min(1, e.hp / e.maxHp))
      // the ghost lags the real fill and drains toward it — recent damage reads as a bright chip
      const ghost = Math.max(frac, (this.lastBossFrac.get(e.id) ?? frac) - 0.008)
      this.lastBossFrac.set(e.id, ghost)
      const w = enemyRadius(e) * 2 + 36
      const h = 7
      const x = p.x - w / 2
      const y = p.y - this.enemyArtPx(e) / 2 - 12
      g.fillStyle(0x000000, 0.55)
      g.fillRect(x - 1, y - 1, w + 2, h + 2)
      g.fillStyle(0x3a1014, 1)
      g.fillRect(x, y, w, h)
      if (ghost > frac) {
        g.fillStyle(0xffffff, 0.6)
        g.fillRect(x, y, w * ghost, h)
      }
      g.fillStyle(frac > 0.5 ? 0xf5d061 : frac > 0.25 ? 0xe8843a : 0xd2402f, 1)
      g.fillRect(x, y, w * frac, h)
      // 25% notch ticks — reading boss HP at a glance, BTD6-style
      g.fillStyle(0x000000, 0.55)
      for (const q of [0.25, 0.5, 0.75]) g.fillRect(x + w * q, y, 1, h)
    }
  }

  // ── placement ──
  /** Can this god be placed here? Adds water-gating (Poseidon) on top of the pure canPlace. */
  private canPlaceGod(god: GodKind, pos: Vec2): boolean {
    const stats = TOWER_STATS[god]
    const terrain = stats.requiresWater ? 'water' : undefined
    if (!canPlace(pos, stats.footprint, { towers: this.towerFootprints(), terrain }).ok) return false
    if (stats.requiresWater && !this.onWater(pos)) return false
    return true
  }

  private onWater(pos: Vec2): boolean {
    for (const o of OBSTACLES) {
      if (o.terrain !== 'water') continue
      const s = o.shape
      if (s.kind === 'circle' && Math.hypot(pos.x - s.x, pos.y - s.y) <= s.r) return true
      if (s.kind === 'poly' && pointInPoly(pos, s.points)) return true
    }
    return false
  }

  private renderGhost(): void {
    const g = this.ghost
    g.clear()
    const placingGod = useGameStore.getState().placingGod
    if (!placingGod) {
      this.ghostSprite?.setVisible(false)
      return
    }
    const stats = TOWER_STATS[placingGod]
    const ok = this.canPlaceGod(placingGod, this.pointer) && this.run.canAfford(stats.cost)
    const tint = ok ? 0x6be36b : 0xff5566
    // sacred ground: placing inside a site's blessing shows its soft gold ring (M10-S6)
    for (const s of SITES) {
      if (Math.hypot(this.pointer.x - s.pos.x, this.pointer.y - s.pos.y) <= s.radius) {
        g.lineStyle(1.5, 0xd9c879, 0.5)
        g.strokeCircle(s.pos.x, s.pos.y, s.radius)
        g.fillStyle(0xd9c879, 0.05)
        g.fillCircle(s.pos.x, s.pos.y, s.radius)
      }
    }
    // the range ring + a faint footprint marker, coloured by validity
    g.lineStyle(1.5, tint, 0.85)
    g.strokeCircle(this.pointer.x, this.pointer.y, stats.range)
    g.fillStyle(tint, 0.18)
    g.fillCircle(this.pointer.x, this.pointer.y, stats.footprint)
    // preview the actual tower under the cursor (the tower WITH its ring, not a bare circle)
    const key = this.textures.exists(`${placingGod}_south`)
      ? `${placingGod}_south`
      : hasSprite(placingGod)
        ? placingGod
        : null
    if (!key) {
      this.ghostSprite?.setVisible(false)
      return
    }
    if (!this.ghostSprite) this.ghostSprite = this.add.image(0, 0, key).setDepth(11)
    this.ghostSprite
      .setTexture(key)
      .setPosition(this.pointer.x, this.pointer.y)
      .setVisible(true)
      .setAlpha(0.75)
      .setTint(ok ? 0xffffff : 0xff8888) // natural when placeable; reddened when blocked
    this.ghostSprite.setScale(TOWER_SPRITE_PX / Math.max(this.ghostSprite.width, this.ghostSprite.height))
  }

  /** Click: place the god being placed, otherwise select/deselect a placed tower. */
  private onPointerDown(p: Phaser.Input.Pointer): void {
    const store = useGameStore.getState()
    const pos = { x: p.worldX, y: p.worldY }
    const placingGod = store.placingGod
    if (placingGod) {
      const stats = TOWER_STATS[placingGod]
      if (!this.canPlaceGod(placingGod, pos)) {
        this.flashDenied(pos) // a silent no-op reads as an input bug — answer the click
        return // invalid spot: keep placing
      }
      if (!this.run.purchase(stats.cost)) {
        this.flashDenied(pos)
        store.denyGold() // the TopBar gold chip shakes — "you can't afford this"
        return // too poor: keep placing
      }
      this.placeTower(placingGod, pos)
      // shift-click chains placements (BTD6 muscle memory) — keep placing while gold lasts
      if (!(p.event as MouseEvent).shiftKey) store.cancelPlacing()
      return
    }
    this.selectTowerAt(pos)
  }

  /** A quick red "nope" ring at the cursor for denied placement/purchase clicks. */
  private flashDenied(pos: Vec2): void {
    const ring = this.add.circle(pos.x, pos.y, 14, 0x000000, 0).setStrokeStyle(2.5, 0xff5566, 0.9).setDepth(11)
    this.tweens.add({ targets: ring, scale: 1.7, alpha: 0, duration: 180, onComplete: () => ring.destroy() })
    if (this.ghostSprite?.visible) {
      const gs = this.ghostSprite
      const baseX = gs.x
      this.tweens.add({ targets: gs, x: baseX - 3, duration: 40, yoyo: true, repeat: 2 }) // a small headshake
    }
  }

  private selectTowerAt(pos: Vec2): void {
    let hit: Tower | null = null
    for (const t of this.towers) {
      const stats = TOWER_STATS[t.god]
      // a mobile god is hard to click while moving — select via its fixed HOME BASE at the center
      const c = stats.mobile ? t.center : t.pos
      const r = Math.max(stats.footprint + 6, TOWER_SPRITE_PX * 0.33) // click the BODY you see, not the tiny footprint
      if ((c.x - pos.x) ** 2 + (c.y - pos.y) ** 2 <= r * r) {
        hit = t
        break
      }
    }
    this.selectedTowerId = hit ? hit.id : null
    this.refreshSelected()
  }

  private deselectTower(): void {
    this.selectedTowerId = null
    useGameStore.getState().setSelectedTower(null)
  }

  /** Push the selected tower's upgrade/sell info to the store (after select / upgrade). */
  private refreshSelected(): void {
    const tower = this.selectedTowerId ? this.towers.find((t) => t.id === this.selectedTowerId) : null
    if (!tower) {
      useGameStore.getState().setSelectedTower(null)
      return
    }
    const pathInfo = (path: 'A' | 'B') => {
      const tier = path === 'A' ? tower.pathA : tower.pathB
      const nt = nextTier(tower.god, path, tier)
      return {
        name: UPGRADES[tower.god][path].name,
        tier,
        nextName: nt?.name ?? null,
        nextCost: nt?.cost ?? null,
        nextDesc: nt?.desc ?? null,
        locked: nt !== null && !canUpgradePath(tower, path),
      }
    }
    const stats = TOWER_STATS[tower.god]
    useGameStore.getState().setSelectedTower({
      id: tower.id,
      god: tower.god,
      sellValue: sellValue(tower),
      targeting: tower.targeting,
      // only gods that actually acquire a target expose a priority (not farms / auras / spike forges)
      targets: stats.damage > 0 && !stats.deployable,
      pathA: pathInfo('A'),
      pathB: pathInfo('B'),
    })
  }

  private upgradeSelectedTower(path: 'A' | 'B'): void {
    const tower = this.selectedTowerId ? this.towers.find((t) => t.id === this.selectedTowerId) : null
    if (!tower || !canUpgradePath(tower, path)) return
    const nt = nextTier(tower.god, path, path === 'A' ? tower.pathA : tower.pathB)
    if (!nt) return
    if (!this.run.purchase(nt.cost)) {
      useGameStore.getState().denyGold() // answered, not silent — the gold chip shakes
      return
    }
    if (path === 'A') tower.pathA++
    else tower.pathB++
    tower.invested += nt.cost // upgrade gold counts toward the sell refund (BTD6-style)
    this.syncTowerAscension(tower) // tier 3 = a visible ASCENDED form when its art exists
    this.refreshSelected()
  }

  /**
   * M10-S7: completing a path (tier 3) swaps the god to an ASCENDED sprite base — <god>_asc_a /
   * <god>_asc_b — when that art exists (BTD6-style: upgrades you can SEE). The cross-path rule
   * guarantees at most one path ever reaches 3, so the forms can't conflict. Missing art is a
   * silent no-op (the drop-in contract: characters land batch by batch).
   */
  private syncTowerAscension(tower: Tower): void {
    const ascKey = tower.pathA >= 3 ? `${tower.god}_asc_a` : tower.pathB >= 3 ? `${tower.god}_asc_b` : null
    if (!ascKey || !DirAnimSprite.hasDirectional(this, ascKey)) return
    const old = this.towerSprites.get(tower.id)
    if (!old || (old.getData?.('ascBase') as string) === ascKey) return
    const stats = TOWER_STATS[tower.god]
    const sizePx = stats.mobile ? Math.round(52 * SIZE_SCALE) : TOWER_SPRITE_PX
    this.tweens.killTweensOf(old)
    old.destroy()
    const art = new DirAnimSprite(this, ascKey, tower.pos.x, tower.pos.y, sizePx, 6)
    art.sprite.setData('baseScale', art.sprite.scaleX)
    art.sprite.setData('ascBase', ascKey)
    this.towerSprites.set(tower.id, art.sprite)
    this.towerArt.set(tower.id, art)
    // ascension flourish: a white flare + an expanding ring + the settle thunk
    const flare = this.add.circle(tower.pos.x, tower.pos.y, 10, 0xffffff, 0.9).setDepth(9).setBlendMode(Phaser.BlendModes.ADD)
    this.tweens.add({ targets: flare, scale: 4, alpha: 0, duration: 320, onComplete: () => flare.destroy() })
    const ring = this.add.circle(tower.pos.x, tower.pos.y, 18, 0x000000, 0).setStrokeStyle(2, 0xf5d061, 0.9).setDepth(9)
    this.tweens.add({ targets: ring, scale: 3, alpha: 0, duration: 420, onComplete: () => ring.destroy() })
    this.placeThunk(tower.id, tower.pos)
  }

  /** Set the selected tower's target priority (First / Last / Closest / Strongest). */
  private setSelectedTargeting(mode: TargetingMode): void {
    const tower = this.selectedTowerId ? this.towers.find((t) => t.id === this.selectedTowerId) : null
    if (!tower) return
    tower.targeting = mode
    this.refreshSelected()
  }

  /** Sell the selected tower: refund part of its TOTAL investment (base + upgrades) and remove it. */
  private sellSelectedTower(): void {
    const id = this.selectedTowerId
    if (!id) return
    const idx = this.towers.findIndex((t) => t.id === id)
    if (idx < 0) return
    const t = this.towers[idx]
    this.run.grantGold(sellValue(t))
    const sprite = this.towerSprites.get(id)
    if (sprite) this.tweens.killTweensOf(sprite) // the infinite idle-bob (and any tell) must die with it
    sprite?.destroy()
    this.towerSprites.delete(id)
    this.towerArt.delete(id)
    this.towerLastFire.delete(id)
    this.towerShadows.get(id)?.destroy()
    this.towerShadows.delete(id)
    this.effCache.delete(id)
    this.stepTargets.delete(id)
    this.homeBaseGfx.get(id)?.destroy() // remove a mobile god's home base with it
    this.homeBaseGfx.delete(id)
    this.charmedByTower.delete(id) // drop an Aphrodite's charm set
    this.spikes.delete(id) // remove a Hephaestus trap with its forge
    this.spikeGfx.get(id)?.destroy()
    this.spikeGfx.delete(id)
    this.towers.splice(idx, 1)
    this.deselectTower()
  }

  /** Demeter farms pay out gold when a wave clears (with a floating gold number). */
  private payDemeterIncome(): void {
    for (const t of this.towers) {
      if (t.god !== 'demeter') continue
      const income = demeterIncome(t, this.run.wave)
      if (income <= 0) continue
      this.run.grantGold(income)
      // play Demeter's harvest animation once on payout ("making money") — playOnce returns to idle by
      // itself when the cycle ends, so there's no stale timer to fire on a farm sold mid-harvest.
      this.towerArt.get(t.id)?.playOnce('attack')
      this.floatText(t.pos.x, t.pos.y - 20, `+${income}`, '#ffe066')
    }
  }

  /** A floating outlined number/label with a pop-in — the one shared style for all payouts/bounties. */
  private floatText(x: number, y: number, str: string, color: string): void {
    const txt = this.add
      .text(x, y, str, { fontFamily: 'Silkscreen, "Courier New", monospace', fontSize: '16px', color, fontStyle: 'bold' })
      .setOrigin(0.5)
      .setDepth(9)
      .setStroke('#000000', 4)
      .setShadow(0, 2, '#000000', 0, true, true)
      .setResolution(2)
    txt.setScale(0.5)
    this.tweens.add({ targets: txt, scale: 1, duration: 90, ease: 'Back.easeOut' })
    this.tweens.add({ targets: txt, y: y - 26, alpha: 0, delay: 90, duration: 700, onComplete: () => txt.destroy() })
  }

  /** Ambient life: an ember drifting up from the Tartarus rift, or a gold mote at the Olympus gate. */
  private spawnAmbient(kind: 'ember' | 'mote' | 'firefly', origin?: Vec2): void {
    if (this.inpaintShotMode) return // DEV: clean-terrain capture in progress
    if (this.ambientCount >= this.ambientCap) return // hard cap — atmosphere, not weather
    this.ambientCount++
    const src = origin ?? (kind === 'ember' ? OLYMPUS_PATH[0] : OLYMPUS_PATH[OLYMPUS_PATH.length - 1])
    const color =
      kind === 'ember' ? (Math.random() < 0.5 ? 0xd83a2a : 0xffb070) : kind === 'firefly' ? 0xc8e87a : 0xf5d061
    const p = this.add
      .circle(src.x + (Math.random() - 0.5) * 60, src.y - 6, 1 + Math.random(), color, 0.7)
      .setDepth(2.5)
      .setBlendMode(Phaser.BlendModes.ADD)
    this.tweens.add({
      targets: p,
      y: p.y - (60 + Math.random() * 40),
      x: p.x + (Math.random() - 0.5) * 28,
      alpha: 0,
      duration: 2500 + Math.random() * 1500,
      ease: 'Sine.easeOut',
      onComplete: () => {
        p.destroy()
        this.ambientCount--
      },
    })
  }

  /** The Minotaur's charge used to read as teleport-jank — give the burst a visible tell. */
  private syncChargeTell(enemy: Enemy): void {
    if (!enemy.charge || !enemy.baseSpeed) return
    const sprite = this.enemySprites.get(enemy.id)
    if (!sprite || !sprite.active) return
    const charging = enemy.speed > enemy.baseSpeed * 1.01
    if ((sprite.getData('charging') as boolean | undefined) === charging) return
    sprite.setData('charging', charging)
    if (charging) {
      this.cameras.main.shake(110, 0.003)
      const pos = this.enemyPos(enemy)
      this.burst(pos.x, pos.y + 8, 6, 0x8a7f6a, 20, 2, 260) // hooves kick up dust
      if (!(sprite instanceof Phaser.GameObjects.Arc)) sprite.setTint(0xff8a5a)
    } else if (!(sprite instanceof Phaser.GameObjects.Arc)) {
      if (this.charmedIds.has(enemy.id)) sprite.setTint(0xff9ec7)
      else sprite.clearTint()
    }
  }

  /**
   * An Image scaled so its longest side ≈ `size` px (aspect preserved), with its baseline scale stashed
   * in data so juice tweens can animate relative to it. The bridge from a dropped-in PNG to the scene.
   */
  private addSpriteScaled(key: string, x: number, y: number, size: number): Phaser.GameObjects.Image {
    const img = this.add.image(x, y, key)
    const s = size / Math.max(img.width, img.height)
    return img.setScale(s).setData('baseScale', s)
  }

  /** The REAL fire moment: restart the cast so frame 0 lands exactly on the shot, plus a quick lunge. */
  private towerAttackTell(tower: Tower, target: Enemy): void {
    this.towerLastFire.set(tower.id, this.time.now) // marks an actual shot → holds combat facing
    const art = this.towerArt.get(tower.id)
    if (!art || !art.sprite.active) return
    art.playOnce('attack') // the cast is now synced to shots, not to "a foe exists somewhere in range"
    // lunge with EXPLICIT from/to anchored to the stored baseline: overlapping tells at high fire rates
    // used to capture each other's inflated scale/offset and ratchet the sprite bigger / off-center.
    const base = (art.sprite.getData('baseScale') as number) ?? art.sprite.scaleX
    this.tweens.add({
      targets: art.sprite,
      scaleX: { from: base, to: base * 1.1 },
      scaleY: { from: base, to: base * 1.1 },
      duration: 80,
      yoyo: true,
    })
    if (!TOWER_STATS[tower.god].mobile) {
      // (mobile gods skip the x-lunge — updateMobileTowers owns their position every frame)
      const tx = this.enemyPos(target).x
      this.tweens.add({
        targets: art.sprite,
        x: { from: tower.pos.x, to: tower.pos.x + (tx < tower.pos.x ? -5 : 5) },
        duration: 80,
        yoyo: true,
      })
    }
  }

  /** Per-frame: face the current target (or travel direction) and advance animation frames. */
  private updateTowerAnims(dtMs: number): void {
    for (const tower of this.towers) {
      const art = this.towerArt.get(tower.id)
      if (!art) continue
      // Demeter is a farm (no attack) — she idles + plays her harvest animation on payout (payDemeterIncome).
      if (tower.god === 'demeter') {
        art.update(dtMs)
        continue
      }
      const stats = TOWER_STATS[tower.god]
      // Hephaestus works his ANVIL: he faces his trap (a fixed point) and swings only when a charge is
      // forged (produceSpike's playOnce). Tracking passing enemies reset his anim frame every turn —
      // the "spazzing" from the 2026-07-01 playtest.
      if (stats.deployable) {
        const spike = this.spikes.get(tower.id)
        if (spike) art.setFacing(dirToTarget(tower.pos, spike.pos))
        art.update(dtMs)
        continue
      }
      // FIRING gods play their cast via towerAttackTell's playOnce — frame 0 lands ON the shot instead
      // of a permanent in-range loop with no relation to when bolts appear. SUPPORT gods (Aphrodite's
      // charm, Athena's aura) have no shot, so "a foe in my field" keeps their working loop running.
      const support = stats.damage <= 0 && !stats.deployable
      // Reuse the fire loop's target pick this step; only towers it skipped (on cooldown / support)
      // re-acquire here — facing still needs a target every frame, but never a SECOND acquisition.
      let target = this.stepTargets.get(tower.id)
      if (target === undefined) {
        const eff = this.towerEff(tower)
        const aura = this.auraAt(tower.pos)
        target = selectTarget(
          { pos: tower.pos, range: eff.range, canHitAir: eff.canHitAir, canDetect: aura.detect },
          this.enemies,
          this.enemyPos,
          tower.targeting,
        )
      }
      if (target) {
        art.setFacing(dirToTarget(tower.pos, this.enemyPos(target)))
        if (support) this.towerLastFire.set(tower.id, this.time.now) // support: a held foe IS engagement
      } else if (stats.mobile) {
        // no foe in range: a mobile god faces his direction of travel (the orbit tangent — velocity of
        // (cosφ, sinφ)·r is φ+π/2) instead of moonwalking around the circle in his last combat facing
        art.setFacing(dir8(tower.orbitPhase + Math.PI / 2))
      }
      if (support) {
        // hold the working loop briefly after the last engaged frame so a flickering hold can't strobe it
        const engaged = this.time.now - (this.towerLastFire.get(tower.id) ?? -1e9) < ATTACK_HOLD_MS
        art.play(engaged ? 'attack' : 'idle')
      }
      art.update(dtMs)
    }
  }

  /**
   * A mobile god's HOME BASE marker — a shrine, NOT a mini copy of the god (a tiny second Hermes on
   * the ground read as ridiculous). Uses the dedicated `<god>_base` sprite (a PixelLab herm shrine for
   * Hermes) when it exists, else draws a simple marble dais in the god's color.
   */
  private makeHomeBase(god: GodKind): Phaser.GameObjects.Container {
    const baseKey = `${god}_base`
    if (this.textures.exists(baseKey)) {
      return this.add.container(0, 0, [this.addSpriteScaled(baseKey, 0, 0, Math.round(40 * SIZE_SCALE))])
    }
    // fallback dais: stacked stone ellipses + a gold trim ring + the god's color as the inlay
    const g = this.add.graphics()
    g.fillStyle(0x4a4a55, 1)
    g.fillEllipse(0, 4, 34, 14)
    g.fillStyle(0x9aa0ac, 1)
    g.fillEllipse(0, 0, 34, 14)
    g.lineStyle(2, 0xbfa03a, 0.9)
    g.strokeEllipse(0, 0, 26, 10)
    g.fillStyle(TOWER_STATS[god].color, 0.9)
    g.fillEllipse(0, 0, 10, 4)
    return this.add.container(0, 0, [g])
  }

  /** The standard god badge — a dropped-in sprite if present, else a colored disc with the god's initial. */
  private makeBadge(god: GodKind, radius = 16): Phaser.GameObjects.Container {
    const stats = TOWER_STATS[god]
    if (hasSprite(god)) {
      // dropped-in art: a scaled sprite in place of the disc+initial (same Container so callers are unchanged)
      return this.add.container(0, 0, [this.addSpriteScaled(god, 0, 0, radius * 2)])
    }
    const circle = this.add.circle(0, 0, radius, stats.color, 1).setStrokeStyle(2, 0xffffff)
    const label = this.add
      .text(0, 0, stats.name[0], {
        fontFamily: 'Silkscreen, Georgia, serif',
        fontSize: `${Math.round(radius * 1.1)}px`,
        fontStyle: 'bold',
        color: '#1a1407',
      })
      .setOrigin(0.5)
    return this.add.container(0, 0, [circle, label])
  }

  private placeTower(god: GodKind, pos: Vec2): void {
    const tower = createTower(god, pos)
    this.towers.push(tower)
    this.run.onTowerBuilt()
    const stats = TOWER_STATS[god]
    // Pixel gods: an 8-direction sprite that faces its target and casts when firing. No idle bob —
    // gods stand PLANTED on the ground (the bob read as "floating" on the flat map). Falls back to
    // the disc badge until a god's directional art (`<god>_south` …) is dropped in.
    if (!stats.mobile && DirAnimSprite.hasDirectional(this, god)) {
      const art = new DirAnimSprite(this, god, pos.x, pos.y, TOWER_SPRITE_PX, 6)
      art.sprite.setData('baseScale', art.sprite.scaleX) // the tell's lunge tweens anchor to this
      this.towerSprites.set(tower.id, art.sprite)
      this.towerArt.set(tower.id, art)
      // no ground-god shadow (M9-S3: fliers only — planted gods stand ON the terrain)
      this.placeThunk(tower.id, pos)
      return
    }
    if (stats.mobile) {
      // Mobile god: a fixed HOME BASE at the center (identity + click target), and the unit that
      // actually orbits/strikes. Clicking the base manages a god that won't sit still.
      const base = this.makeHomeBase(god).setPosition(tower.center.x, tower.center.y).setDepth(5)
      this.homeBaseGfx.set(tower.id, base)
      if (DirAnimSprite.hasDirectional(this, god)) {
        // pixel mobile god: the flier is his animated sprite — faces + casts while it orbits (a darting scout)
        const art = new DirAnimSprite(this, god, pos.x, pos.y, Math.round(52 * SIZE_SCALE), 6)
        art.sprite.setData('baseScale', art.sprite.scaleX)
        this.towerSprites.set(tower.id, art.sprite)
        this.towerArt.set(tower.id, art)
        this.addTowerShadow(tower.id, pos.x, pos.y + Math.round(18 * SIZE_SCALE), Math.round(40 * SIZE_SCALE)) // an airborne scout's small trailing shadow
      } else {
        const flier = this.add
          .container(pos.x, pos.y, [this.add.circle(0, 0, 7, stats.color, 1).setStrokeStyle(2, 0xffffff)])
          .setDepth(6)
        this.towerSprites.set(tower.id, flier)
      }
      this.placeThunk(tower.id, tower.center)
      return
    }
    const container = this.makeBadge(god).setPosition(pos.x, pos.y).setDepth(6)
    this.towerSprites.set(tower.id, container)
    this.placeThunk(tower.id, pos)
  }

  private addTowerShadow(towerId: string, x: number, y: number, sizePx: number): void {
    if (!this.groundTiled) return // shadows only read as grounded on real terrain
    this.towerShadows.set(towerId, this.add.ellipse(x, y, sizePx * 0.55, sizePx * 0.18, 0x000000, 0.3).setDepth(3.5))
  }

  /** Placement lands with WEIGHT: a settle-squash on the sprite, ground dust, an expanding ring, a tiny shake. */
  private placeThunk(towerId: string, pos: Vec2): void {
    const sprite = this.towerSprites.get(towerId)
    if (sprite && 'setScale' in sprite) {
      const base = ((sprite as Phaser.GameObjects.Sprite).getData?.('baseScale') as number) ?? sprite.scale ?? 1
      sprite.setScale(base * 0.8, base * 1.25)
      sprite.y = pos.y - 8
      this.tweens.add({ targets: sprite, scaleX: base, scaleY: base, y: pos.y, duration: 140, ease: 'Back.easeOut' })
    }
    // ground dust hugging the floor (flattened spread) + an expanding settle ring
    for (let i = 0; i < 7; i++) {
      const a = Math.random() * Math.PI * 2
      const d = 20 + Math.random() * 16
      const s = this.add.circle(pos.x, pos.y + 10, 2, 0x8a7f6a, 0.8).setDepth(5)
      this.tweens.add({
        targets: s,
        x: pos.x + Math.cos(a) * d,
        y: pos.y + 10 + Math.sin(a) * d * 0.35,
        alpha: 0,
        duration: 240,
        onComplete: () => s.destroy(),
      })
    }
    const ring = this.add.circle(pos.x, pos.y + 8, Math.round(16 * SIZE_SCALE), 0x000000, 0).setStrokeStyle(1.5, 0xd8cfa8, 0.7).setDepth(5)
    ring.setScale(0.3)
    this.tweens.add({ targets: ring, scale: 1.4, alpha: 0, duration: 260, onComplete: () => ring.destroy() })
    this.cameras.main.shake(60, 0.002)
  }
}
