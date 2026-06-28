import { useEffect, useRef } from 'react'
import type Phaser from 'phaser'
import { createGame } from '../game/PhaserGame'
import { useGameStore } from '../state/gameStore'

/**
 * The single place React and Phaser touch the DOM. The ref guard + destroy(true)
 * cleanup make this safe even if mounted twice (e.g. React StrictMode in dev).
 */
export function GameCanvas() {
  const parentRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)

  useEffect(() => {
    if (gameRef.current || !parentRef.current) return
    gameRef.current = createGame(parentRef.current)

    return () => {
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
  }, [])

  // Drag-and-drop: releasing a god drag OUTSIDE the canvas (e.g. back over the rail) cancels it.
  // A release over the canvas is handled by Phaser's own pointerup (which fires first via bubbling),
  // so this never pre-empts a valid drop.
  useEffect(() => {
    const onUp = (e: PointerEvent) => {
      const store = useGameStore.getState()
      if (!store.placingGod) return
      if (!parentRef.current?.contains(e.target as Node)) store.cancelPlacing()
    }
    window.addEventListener('pointerup', onUp)
    return () => window.removeEventListener('pointerup', onUp)
  }, [])

  return <div ref={parentRef} className="absolute inset-0" />
}
