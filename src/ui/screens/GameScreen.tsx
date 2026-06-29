import { GameCanvas } from '../GameCanvas'
import { TopBar } from '../hud/TopBar'
import { RightRail } from '../hud/RightRail'
import { PlacingHint } from '../hud/PlacingHint'
import { WaveControls } from '../hud/WaveControls'
import { TowerInspector } from '../hud/TowerInspector'
import { FateDraftModal } from '../hud/FateDraftModal'
import { RunOverModal } from '../hud/RunOverModal'
import { PantheonTreePanel } from '../hud/PantheonTreePanel'
import { LeaderboardOverlay } from '../hud/LeaderboardOverlay'
import { DevPanel } from '../hud/DevPanel'

/**
 * Real game UI: a full-width top bar, then a row of [ game canvas | right tower rail ].
 * The rail is a flex sibling, so it can never crop or cover the play field. The run-loop overlays
 * (wave button, Fate Draft, run-over) live over the canvas.
 */
export function GameScreen() {
  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-slate-950">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1">
          <GameCanvas />
          <DevPanel />
          <PlacingHint />
          <WaveControls />
          <TowerInspector />
          <FateDraftModal />
          <RunOverModal />
          <PantheonTreePanel />
          <LeaderboardOverlay />
        </div>
        <RightRail />
      </div>
    </div>
  )
}
