import { useEffect, useRef } from 'react'
import { boltPoints, type Bolt } from '../../game/render/fx'

/**
 * Crackling title lightning (M9-S7) — a DPR-scaled canvas behind the logo. Random strikes every
 * 1.2–3.2s (30% double-strike), each a midpoint-displacement bolt (the same pure fx.ts math the
 * in-game Zeus uses) drawn in 3 passes with a flickering envelope that re-brightens before dying.
 * Pauses while the tab is hidden; prefers-reduced-motion gets one static faint bolt.
 */
export function TitleLightning({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.scale(dpr, dpr)

    const drawBolt = (bolt: Bolt, alpha: number) => {
      const passes: [number, string][] = [
        [7, `rgba(140,180,255,${0.22 * alpha})`],
        [3.5, `rgba(191,227,255,${0.6 * alpha})`],
        [1.5, `rgba(255,255,255,${alpha})`],
      ]
      for (const [width, style] of passes) {
        ctx.lineWidth = width
        ctx.strokeStyle = style
        ctx.beginPath()
        ctx.moveTo(bolt.main[0].x, bolt.main[0].y)
        for (let i = 1; i < bolt.main.length; i++) ctx.lineTo(bolt.main[i].x, bolt.main[i].y)
        ctx.stroke()
      }
      ctx.lineWidth = 1
      ctx.strokeStyle = `rgba(191,227,255,${0.45 * alpha})`
      for (const fork of bolt.forks) {
        ctx.beginPath()
        ctx.moveTo(fork[0].x, fork[0].y)
        for (let i = 1; i < fork.length; i++) ctx.lineTo(fork[i].x, fork[i].y)
        ctx.stroke()
      }
    }

    const newBolt = () =>
      boltPoints(
        { x: w * (0.15 + Math.random() * 0.7), y: -6 },
        { x: w * (0.25 + Math.random() * 0.5), y: h * (0.55 + Math.random() * 0.4) },
        5,
        0.16,
      )

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      drawBolt(newBolt(), 0.35) // one still bolt — presence without motion
      return
    }

    interface Strike {
      bolt: Bolt
      born: number
    }
    let strikes: Strike[] = []
    let nextAt = performance.now() + 600
    let raf = 0

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      if (document.hidden) return
      if (now >= nextAt) {
        strikes.push({ bolt: newBolt(), born: now })
        if (Math.random() < 0.3) strikes.push({ bolt: newBolt(), born: now + 80 })
        nextAt = now + 1200 + Math.random() * 2000
      }
      ctx.clearRect(0, 0, w, h)
      strikes = strikes.filter((s) => now - s.born < 420)
      for (const s of strikes) {
        const age = now - s.born
        if (age < 0) continue
        // flicker envelope: hard flash → dip → re-brighten → die
        const t = age / 420
        const env = t < 0.12 ? 1 : t < 0.3 ? 0.35 : t < 0.45 ? 0.75 : Math.max(0, 1 - t) * 0.5
        drawBolt(s.bolt, env)
        if (age < 90) {
          // impact flash at the strike tip + a faint full-canvas wash
          const tip = s.bolt.main[s.bolt.main.length - 1]
          const g = ctx.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, 46)
          g.addColorStop(0, `rgba(220,235,255,${0.5 * (1 - age / 90)})`)
          g.addColorStop(1, 'rgba(220,235,255,0)')
          ctx.fillStyle = g
          ctx.fillRect(tip.x - 46, tip.y - 46, 92, 92)
          ctx.fillStyle = `rgba(160,190,255,${0.05 * (1 - age / 90)})`
          ctx.fillRect(0, 0, w, h)
        }
      }
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  return <canvas ref={ref} className={className} aria-hidden />
}
