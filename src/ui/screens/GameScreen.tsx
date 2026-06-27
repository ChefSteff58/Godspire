import { GameCanvas } from '../GameCanvas'
import { TopBar } from '../hud/TopBar'
import { RightRail } from '../hud/RightRail'
import { PlacingHint } from '../hud/PlacingHint'

/**
 * Real game UI: a full-width top bar, then a row of [ game canvas | right tower rail ].
 * The rail is a flex sibling, so it can never crop or cover the play field.
 */
export function GameScreen() {
  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-slate-950">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1">
          <GameCanvas />
          <PlacingHint />
        </div>
        <RightRail />
      </div>
    </div>
  )
}
