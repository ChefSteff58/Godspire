import { useGameStore } from '../../state/gameStore'
import { spriteUrl } from '../../game/assets/manifest'
import { uiUrl } from '../assets/uiKit'
import { TitleLightning } from './TitleLightning'
import { AccountBadge } from '../account/AccountBadge'

/**
 * The front door. Pure React/CSS (no Phaser — the game mounts only after Play): a Tartarus-glow
 * backdrop with CSS-keyframe embers, the GODSPIRE logotype in Silkscreen (which also forces the
 * pixel font loaded before any canvas text ever renders), flanking hero sprites from the manifest,
 * and Play / Pantheon / Ranks. Pantheon + Ranks work from here — both overlays are mounted at the
 * App root and only need the session, not a running game.
 */
export function TitleScreen() {
  const startGame = useGameStore((s) => s.startGame)
  const openPantheon = useGameStore((s) => s.openPantheon)
  const openLeaderboard = useGameStore((s) => s.openLeaderboard)
  const zeus = spriteUrl('zeus')
  const minotaur = spriteUrl('minotaur')

  // deterministic ember field (no re-shuffle between renders)
  const embers = Array.from({ length: 14 }, (_, i) => ({
    left: `${(i * 37) % 100}%`,
    delay: `${(i * 0.9) % 6}s`,
    duration: `${5 + ((i * 13) % 40) / 10}s`,
    size: 2 + ((i * 7) % 3),
    color: i % 3 === 0 ? '#ffb070' : '#d83a2a',
  }))

  return (
    <div className="relative flex h-dvh w-full flex-col items-center justify-center overflow-hidden bg-shrine-abyss">
      {/* account chip — a returning player can sign in from the front door (guest → load saved account) */}
      <div className="absolute left-4 top-4 z-20">
        <AccountBadge />
      </div>
      {/* backdrop: the rift's ember glow rising from below, Olympus gold above */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 90% 45% at 50% 108%, rgba(216,58,42,0.35), rgba(74,18,27,0.18) 55%, transparent 75%),' +
            'radial-gradient(ellipse 70% 35% at 50% -12%, rgba(245,208,97,0.12), transparent 70%)',
        }}
      />
      {/* embers — the CSS twin of the in-game ambient system */}
      {embers.map((e, i) => (
        <span
          key={i}
          className="ember pointer-events-none absolute bottom-0 rounded-full"
          style={{
            left: e.left,
            width: e.size,
            height: e.size,
            background: e.color,
            animationDelay: e.delay,
            animationDuration: e.duration,
          }}
        />
      ))}

      <div className="relative flex items-end gap-8">
        {/* crackling sky behind the logo block — Zeus announces the game (M9-S7) */}
        <TitleLightning className="pointer-events-none absolute -inset-x-24 -top-40 bottom-0 h-[calc(100%+10rem)] w-[calc(100%+12rem)]" />
        {zeus && <img src={zeus} alt="" className="relative h-28 w-28 object-contain [image-rendering:pixelated]" />}
        <div className="relative text-center">
          {uiUrl('logo_emblem') && (
            <img
              src={uiUrl('logo_emblem')}
              alt=""
              className="mx-auto mb-2 h-16 w-16 object-contain [image-rendering:pixelated]"
            />
          )}
          <h1
            className="font-pixel text-6xl font-bold tracking-wide text-amber-300"
            style={{ textShadow: '3px 3px 0 #7a1020, 6px 6px 0 #14121a' }}
          >
            GODSPIRE
          </h1>
          <p className="font-pixel mt-2 text-sm text-shrine-marble/60">Hold the gates of Olympus</p>
        </div>
        {minotaur && <img src={minotaur} alt="" className="relative h-28 w-28 object-contain [image-rendering:pixelated]" />}
      </div>

      {/* uniform stacked menu column — extensible for future entries (Settings, Codex, …) */}
      <div className="relative mt-10 flex w-64 flex-col gap-2.5">
        <button
          onClick={startGame}
          className="pixel-btn pixel-btn--gold arcade-raise font-pixel w-full rounded bg-amber-400 px-6 py-3 text-lg font-bold text-slate-900 shadow-lg shadow-amber-500/30"
        >
          ⚔️ Play
        </button>
        <button
          onClick={openPantheon}
          className="pixel-btn arcade-raise font-pixel w-full rounded bg-shrine-stone px-6 py-2.5 text-sm font-bold text-amber-200"
        >
          🏛️ Pantheon
        </button>
        <button
          onClick={openLeaderboard}
          className="pixel-btn arcade-raise font-pixel w-full rounded bg-shrine-stone px-6 py-2.5 text-sm font-bold text-amber-200"
        >
          🏆 Ranks
        </button>
      </div>
    </div>
  )
}
