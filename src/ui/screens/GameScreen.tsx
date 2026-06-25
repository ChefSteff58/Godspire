import { GameCanvas } from '../GameCanvas'
import { Hud } from '../hud/Hud'

/** Stacks the Phaser canvas with the React HUD overlay on top. */
export function GameScreen() {
  return (
    <div className="relative h-dvh w-full overflow-hidden bg-slate-950">
      <GameCanvas />
      <Hud />
    </div>
  )
}
