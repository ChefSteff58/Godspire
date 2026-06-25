import type { PlayerProgress } from '../../core/progress/types'
import { migrateProgress } from '../../core/progress/rules'

const PROGRESS_KEY = 'godspire:progress:v1'
const NAME_KEY = 'godspire:name:v1'

/** localStorage can throw (Safari private mode, blocked storage). Always guard. */
function hasStorage(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.localStorage
  } catch {
    return false
  }
}

export function readLocalProgress(): PlayerProgress | null {
  if (!hasStorage()) return null
  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY)
    if (!raw) return null
    return migrateProgress(JSON.parse(raw)) // migrate never throws; coerces corruption
  } catch {
    return null
  }
}

export function writeLocalProgress(p: PlayerProgress): void {
  if (!hasStorage()) return
  try {
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(p))
  } catch {
    /* ignore quota / availability errors — gameplay must never block on storage */
  }
}

export function clearLocalProgress(): void {
  if (!hasStorage()) return
  try {
    window.localStorage.removeItem(PROGRESS_KEY)
  } catch {
    /* ignore */
  }
}

export function readLocalName(): string | null {
  if (!hasStorage()) return null
  try {
    return window.localStorage.getItem(NAME_KEY)
  } catch {
    return null
  }
}

export function writeLocalName(name: string): void {
  if (!hasStorage()) return
  try {
    window.localStorage.setItem(NAME_KEY, name)
  } catch {
    /* ignore */
  }
}
