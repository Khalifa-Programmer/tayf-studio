export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function formatTime(seconds: number, forceHours = false): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0
  const total = Math.floor(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  if (h > 0 || forceHours) return `${String(h).padStart(2, '0')}:${mm}:${ss}`
  return `${mm}:${ss}`
}

export function formatTimeLong(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '00:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`
}

export function formatBytes(bytes?: number): string {
  if (!bytes || !Number.isFinite(bytes) || bytes <= 0) return '—'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value >= 100 || unit === 0 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`
}

export function formatBitrate(bps?: number): string {
  if (!bps || !Number.isFinite(bps) || bps <= 0) return '—'
  if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(1)} Mbps`
  return `${Math.round(bps / 1000)} kbps`
}

export function isRemoteUrl(value: string): boolean {
  return /^https?:\/\//i.test(String(value || '').trim())
}

export function mediaUrl(filePath: string): string {
  if (isRemoteUrl(filePath)) return filePath
  return `tayf://local/?p=${encodeURIComponent(filePath)}`
}

export function baseName(filePath: string): string {
  const parts = filePath.split(/[\\/]/)
  return parts[parts.length - 1] || filePath
}

export function baseNameNoExt(filePath: string): string {
  const name = baseName(filePath)
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(0, dot) : name
}

export function folderName(filePath: string): string {
  const parts = filePath.split(/[\\/]/)
  parts.pop()
  return parts.join('\\') || filePath
}

export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ')
}

export function fb(condition: boolean, whenTrue: string, whenFalse = ''): string {
  return condition ? whenTrue : whenFalse
}

export function shortPath(filePath: string, max = 48): string {
  if (filePath.length <= max) return filePath
  return `${filePath.slice(0, Math.floor(max / 2))}…${filePath.slice(-Math.floor(max / 2) + 1)}`
}
