import { app } from 'electron'
import { join } from 'path'
import * as fs from 'fs'
import type { RecentItem, Settings, UrlHistoryItem } from '../shared/types'

const dir = app.getPath('userData')

export const defaults: Settings = {
  theme: 'dark',
  language: 'ar',
  accent: '#10b981',
  volume: 0.9,
  rememberPosition: true,
  autoPlay: true,
  subtitleFontSize: 30,
  subtitleDelay: 0,
  snapshotDir: '',
  repeat: 'off',
  shuffle: false,
  showPlaylist: true,
  seekStep: 10,
  playbackRate: 1,
  keepPlaybackRate: false
}

const settingsFile = join(dir, 'settings.json')
const recentFile = join(dir, 'recent.json')
const positionsFile = join(dir, 'positions.json')
const urlHistoryFile = join(dir, 'url-history.json')

function readJson<T>(file: string, fallback: T): T {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as unknown
    if (Array.isArray(fallback)) {
      return (Array.isArray(parsed) ? parsed : fallback) as T
    }
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return { ...(fallback as object), ...(parsed as object) } as T
    }
    return fallback
  } catch {
    return fallback
  }
}

function writeJson(file: string, value: unknown): void {
  try {
    fs.mkdirSync(dir, { recursive: true })
    const temp = `${file}.tmp`
    fs.writeFileSync(temp, JSON.stringify(value, null, 2), 'utf8')
    fs.renameSync(temp, file)
  } catch (err) {
    console.error('writeJson failed', file, err)
  }
}

let settings: Settings = readJson<Settings>(settingsFile, { ...defaults })
let positions: Record<string, number> = readJson<Record<string, number>>(positionsFile, {})

export function getSettings(): Settings {
  return settings
}

export function saveSettings(patch: Partial<Settings>): Settings {
  settings = { ...settings, ...patch }
  writeJson(settingsFile, settings)
  return settings
}

export function getRecent(): RecentItem[] {
  return readJson<RecentItem[]>(recentFile, []).slice(0, 60)
}

export function addRecent(item: RecentItem): void {
  const list = readJson<RecentItem[]>(recentFile, []).filter((entry) => entry.path !== item.path)
  list.unshift(item)
  writeJson(recentFile, list.slice(0, 60))
}

export function clearRecent(): void {
  writeJson(recentFile, [])
}

export function getPosition(path: string): number {
  return positions[path] ?? 0
}

export function getPositions(): Record<string, number> {
  return { ...positions }
}

export function savePosition(path: string, seconds: number): void {
  if (!settings.rememberPosition) return
  if (!Number.isFinite(seconds) || seconds < 3) return
  positions[path] = Math.floor(seconds)
  const keys = Object.keys(positions)
  if (keys.length > 500) {
    for (const key of keys.slice(0, keys.length - 500)) delete positions[key]
  }
  writeJson(positionsFile, positions)
}

export function forgetPosition(path: string): void {
  delete positions[path]
  writeJson(positionsFile, positions)
}

const URL_HISTORY_LIMIT = 30

export function getUrlHistory(): UrlHistoryItem[] {
  return readJson<UrlHistoryItem[]>(urlHistoryFile, [])
    .filter((entry) => entry && typeof entry.url === 'string' && entry.url.length > 0)
    .sort((a, b) => (b.lastUsed ?? 0) - (a.lastUsed ?? 0))
    .slice(0, URL_HISTORY_LIMIT)
}

export function addUrlHistory(url: string, name: string): UrlHistoryItem[] {
  const trimmed = String(url || '').trim()
  if (!trimmed) return getUrlHistory()
  const list = readJson<UrlHistoryItem[]>(urlHistoryFile, []).filter(
    (entry) => entry && typeof entry.url === 'string' && entry.url !== trimmed
  )
  list.unshift({ url: trimmed, name: String(name || trimmed).slice(0, 200), lastUsed: Date.now() })
  writeJson(urlHistoryFile, list.slice(0, URL_HISTORY_LIMIT))
  return getUrlHistory()
}

export function clearUrlHistory(): void {
  writeJson(urlHistoryFile, [])
}
