import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

// Architecture guard: src/core is the framework-agnostic heart of the game.
// It must never depend on Phaser, React, or Zustand so it stays unit-testable
// and portable. This test fails the build if that boundary is ever crossed.

const CORE_DIR = join(process.cwd(), 'src', 'core')
const FORBIDDEN = ['phaser', 'react', 'react-dom', 'zustand']

function collectSourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...collectSourceFiles(full))
    else if (/\.tsx?$/.test(entry)) out.push(full)
  }
  return out
}

describe('architecture: src/core purity', () => {
  it('does not import phaser, react, or zustand', () => {
    const violations: string[] = []
    for (const file of collectSourceFiles(CORE_DIR)) {
      const src = readFileSync(file, 'utf8')
      for (const pkg of FORBIDDEN) {
        const re = new RegExp(`(?:from|import)\\s+['"]${pkg}(?:/[^'"]*)?['"]`)
        if (re.test(src)) violations.push(`${file} imports "${pkg}"`)
      }
    }
    expect(violations, `src/core must stay framework-agnostic:\n${violations.join('\n')}`).toEqual([])
  })
})
