import { useEffect, useRef } from 'react'
import type Phaser from 'phaser'
import { createGame } from '../game/PhaserGame'

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

  return <div ref={parentRef} className="absolute inset-0" />
}
