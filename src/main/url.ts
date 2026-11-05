import { createHash } from 'crypto'
import type { MediaItem } from '../shared/types'

/**
 * ظپطھط­ ط±ظˆط§ط¨ط· ط§ظ„ظˆط³ط§ط¦ط· ط¹ط¨ط± ط§ظ„ط´ط¨ظƒط© (ظ…ط«ظ„ "ظپطھط­ ط±ط§ط¨ط·" ظپظٹ QQPlayer).
 *
 * ط§ظ„ظ‚ظˆط§ط¹ط¯:
 *  - ط§ظ„ط¨ط±ظˆطھظˆظƒظˆظ„ http/https ظپظ‚ط·.
 *  - ظ†ظˆط¹ ط§ظ„ظˆط³ظٹط· ظٹظڈط³طھظ†طھط¬ ظ…ظ† Content-Type ط«ظ… ظ…ظ† ط§ظ…طھط¯ط§ط¯ ط§ظ„ط±ط§ط¨ط·طŒ ظˆط£ط®ظٹط±ط§ظ‹ ظٹظڈظپطھط±ط¶ ظپظٹط¯ظٹظˆ.
 *  - ط§ظ„ط¨ط« ط§ظ„ظ…ط¨ط§ط´ط± ط؛ظٹط± ط§ظ„ظ…ط­ط¯ظˆط¯ (duration â‰¤ 0) طھظڈط±ظپط¶ ظپظٹ ط·ط¨ظ‚ط© ط§ظ„طھط¬ظ‡ظٹط² (compat).
 */

const VIDEO_EXT = new Set(['.mp4', '.mkv', '.webm', '.avi', '.mov', '.wmv', '.flv', '.m4v', '.mpg', '.mpeg', '.ts', '.m2ts', '.mts', '.3gp', '.3g2', '.rm', '.rmvb', '.vob', '.ogv', '.asf', '.f4v', '.m3u8'])
const AUDIO_EXT = new Set(['.mp3', '.flac', '.wav', '.ogg', '.oga', '.m4a', '.aac', '.wma', '.opus', '.ape', '.alac', '.amr', '.ac3', '.dts', '.mid', '.midi'])
const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.svg', '.bmp', '.tif', '.tiff', '.ico', '.heic', '.jfif'])

export function isRemoteUrl(value: string): boolean {
  return /^https?:\/\//i.test(String(value || '').trim())
}

export interface ParsedRemote {
  url: string
  name: string
  ext: string
}

function kindFromExt(ext: string): MediaItem['type'] | null {
  const lower = ext.toLowerCase()
  if (VIDEO_EXT.has(lower)) return 'video'
  if (AUDIO_EXT.has(lower)) return 'audio'
  if (IMAGE_EXT.has(lower)) return 'image'
  return null
}

function kindFromContentType(raw: string): MediaItem['type'] | 'not-media' | null {
  const value = raw.toLowerCase().split(';')[0].trim()
  if (!value) return null
  if (value.startsWith('video/')) return 'video'
  if (value.startsWith('audio/')) return 'audio'
  if (value.startsWith('image/')) return 'image'
  // ظ‚ظˆط§ط¦ظ… HLS: طھظڈط¹ط§ظ„ط¬ ط¹ط¨ط± ط®ط· ط§ظ„طھط­ظˆظٹظ„ ط§ظ„ط¯ط§ط®ظ„ظٹ (ffmpeg).
  if (/mpegurl|m3u8|vnd\.apple\.mpegurl/.test(value)) return 'video'
  if (value === 'application/octet-stream' || value === 'binary/octet-stream') return null
  if (value.startsWith('text/html') || value.startsWith('text/plain') || value.startsWith('application/json') || value.startsWith('application/xml')) {
    return 'not-media'
  }
  return null
}

function sanitizeName(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|\u0000-\u001f-]/g, '_').trim()
  return cleaned.slice(0, 120)
}

/** ظٹط³طھط®ط±ط¬ ط§ط³ظ…ط§ظ‹ ظ…ظ‚ط±ظˆط،ط§ظ‹ ظ…ظ† ط§ظ„ط±ط§ط¨ط·: ط¢ط®ط± ظ…ظ‚ط·ط¹ ظ…ظ† ط§ظ„ظ…ط³ط§ط± ط¨ط¹ط¯ ظپظƒ ط§ظ„طھط±ظ…ظٹط²طŒ ظˆط¥ظ„ط§ ط§ط³ظ… ط§ظ„ظ…ط¶ظٹظپ. */
export function nameFromUrl(url: URL): string {
  const segments = url.pathname.split('/').filter(Boolean)
  for (let index = segments.length - 1; index >= 0; index -= 1) {
    try {
      const decoded = decodeURIComponent(segments[index])
      if (decoded && decoded !== '.' && decoded !== '..') {
        const cleaned = sanitizeName(decoded)
        if (cleaned) return cleaned
      }
    } catch {
      /* ignore malformed encoding */
    }
  }
  return sanitizeName(url.host) || 'media'
}

export function cacheKeyForRemote(url: string): string {
  return createHash('sha1').update(`remote|${url}`).digest('hex')
}

function parseRemoteUrl(raw: string): ParsedRemote | { error: string } {
  const trimmed = String(raw || '').trim()
  if (!trimmed) return { error: 'ط£ط¯ط®ظ„ ط±ط§ط¨ط·ط§ظ‹ ط£ظˆظ„ط§ظ‹' }
  if (trimmed.length > 2048) return { error: 'ط§ظ„ط±ط§ط¨ط· ط·ظˆظٹظ„ ط¬ط¯ط§ظ‹' }
  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return { error: 'ط§ظ„ط±ط§ط¨ط· ط؛ظٹط± طµط§ظ„ط­' }
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { error: 'ط§ظ„ط¨ط±ظˆطھظˆظƒظˆظ„ ط؛ظٹط± ظ…ط¯ط¹ظˆظ… â€” ط§ط³طھط®ط¯ظ… http ط£ظˆ https ظپظ‚ط·' }
  }
  if (!url.hostname) return { error: 'ط§ظ„ط±ط§ط¨ط· ط؛ظٹط± طµط§ظ„ط­' }
  const segments = url.pathname.split('/').filter(Boolean)
  const last = segments.length > 0 ? segments[segments.length - 1] : ''
  const dot = last.lastIndexOf('.')
  const ext = dot > 0 ? last.slice(dot).toLowerCase() : ''
  return { url: url.toString(), name: nameFromUrl(url), ext }
}

interface HeadResult {
  ok: boolean
  status: number
  contentType: string
  contentLength: number
}

async function probeHeaders(url: string): Promise<HeadResult> {
  const attempt = async (method: 'HEAD' | 'GET'): Promise<HeadResult> => {
    const response = await fetch(url, {
      method,
      redirect: 'follow',
      signal: AbortSignal.timeout(10_000),
      headers: method === 'GET' ? { Range: 'bytes=0-0' } : undefined
    })
    // ظ„ط§ ظ†ظ‚ط±ط£ ط§ظ„ط¬ط³ظ… ظƒط§ظ…ظ„ط§ظ‹: ظ†ط؛ظ„ظ‚ ط§ظ„طھط¯ظپظ‚ ظ„طھظپط§ط¯ظٹ طھظ†ط²ظٹظ„ ط؛ظٹط± ط¶ط±ظˆط±ظٹ.
    try {
      await response.body?.cancel()
    } catch {
      /* ignore */
    }
    const contentType = (response.headers.get('content-type') || '').toLowerCase()
    const lengthHeader = response.headers.get('content-length') || response.headers.get('content-range') || ''
    let contentLength = 0
    const rangeMatch = /\/(\d+)\s*$/.exec(lengthHeader)
    if (rangeMatch) contentLength = Number(rangeMatch[1])
    else if (/^\d+$/.test(lengthHeader.trim())) contentLength = Number(lengthHeader.trim())
    return { ok: response.status >= 200 && response.status < 300, status: response.status, contentType, contentLength }
  }

  try {
    const head = await attempt('HEAD')
    if (head.ok) return head
    // ط¨ط¹ط¶ ط§ظ„ط®ظˆط§ط¯ظ… ظ„ط§ طھط¯ط¹ظ… HEAD (405/501) â€” ظ†ط¬ط±ط¨ ط·ظ„ط¨ط§ظ‹ ط¬ط²ط¦ظٹط§ظ‹ GET ط¨ط¯ظ„ط§ظ‹ ظ…ظ†ظ‡ط§.
    if (head.status === 405 || head.status === 501 || head.status === 403) {
      try {
        const ranged = await attempt('GET')
        if (ranged.ok) return ranged
      } catch {
        /* fall through */
      }
    }
    return head
  } catch {
    // ظپط´ظ„ ط´ط¨ظƒط©/ظ…ظ‡ظ„ط©: ظ†ط±ط¬ط¹ ظ†طھظٹط¬ط© ط؛ظٹط± ظ†ط§ط¬ط­ط© ظ„ظٹظڈط¹طھظ…ط¯ ط¹ظ„ظ‰ ط§ظ„ط§ظ…طھط¯ط§ط¯ ظپظ‚ط·.
    return { ok: false, status: 0, contentType: '', contentLength: 0 }
  }
}

export interface ResolvedRemote {
  item?: MediaItem
  error?: string
}

export async function resolveRemoteUrl(raw: string): Promise<ResolvedRemote> {
  const parsed = parseRemoteUrl(raw)
  if ('error' in parsed) return { error: parsed.error }

  const extKind = kindFromExt(parsed.ext)
  const head = await probeHeaders(parsed.url)
  const headerKind = head.ok ? kindFromContentType(head.contentType) : null

  if (headerKind === 'not-media') {
    return { error: 'ط§ظ„ط±ط§ط¨ط· ظ„ط§ ظٹط´ظٹط± ط¥ظ„ظ‰ ظ…ظ„ظپ ظˆط³ط§ط¦ط· (طµظپط­ط© ظˆظٹط¨ ط£ظˆ ظ…ط³طھظ†ط¯)' }
  }

  const type = headerKind ?? extKind ?? 'video'
  const item: MediaItem = {
    name: parsed.name,
    path: parsed.url,
    type,
    ...(head.ok && head.contentLength > 0 ? { size: head.contentLength } : {})
  }
  return { item }
}
