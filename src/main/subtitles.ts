import * as fs from 'fs'
import * as path from 'path'
import * as iconv from 'iconv-lite'
import type { SubtitlePayload } from '../shared/types'

const SUB_EXT = ['.srt', '.vtt', '.ass', '.ssa', '.sub']
const MAX_SIZE = 24 * 1024 * 1024

function isUtf8(buffer: Buffer): boolean {
  try {
    return !iconv.decode(buffer, 'utf8').includes('\uFFFD')
  } catch {
    return false
  }
}

function looksUtf16Le(buffer: Buffer): boolean {
  const sample = buffer.subarray(0, Math.min(buffer.length, 4096))
  if (sample.length < 8) return false
  let zeros = 0
  for (let i = 1; i < sample.length; i += 2) if (sample[i] === 0) zeros++
  return zeros / Math.ceil(sample.length / 2) > 0.4
}

function scoreText(text: string): number {
  let score = 0
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0
    if (code === 0xfffd || (code < 9 && code !== 0)) score -= 6
    else if (code >= 0x0600 && code <= 0x06ff) score += 3
    else if (code >= 0x4e00 && code <= 0x9fff) score += 2
    else if (code >= 0x0900 && code <= 0x097f) score += 2
    else if (code >= 0x20 && code < 0x7f) score += 1
  }
  return score
}

function decode(buffer: Buffer): string {
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return iconv.decode(buffer.subarray(3), 'utf8')
  }
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return iconv.decode(buffer.subarray(2), 'utf16-le')
  }
  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    return iconv.decode(buffer.subarray(2), 'utf16-be')
  }
  if (isUtf8(buffer)) return iconv.decode(buffer, 'utf8')
  if (looksUtf16Le(buffer)) return iconv.decode(buffer, 'utf16-le')

  const candidates: Array<[string, string]> = [
    ['win1256', iconv.decode(buffer, 'win1256')],
    ['gb18030', iconv.decode(buffer, 'gb18030')],
    ['big5', iconv.decode(buffer, 'big5')],
    ['shift_jis', iconv.decode(buffer, 'shift_jis')],
    ['iso-8859-1', iconv.decode(buffer, 'iso-8859-1')]
  ]
  let best = candidates[0][1]
  let bestScore = Number.NEGATIVE_INFINITY
  for (const [, text] of candidates) {
    const score = scoreText(text)
    if (score > bestScore) {
      bestScore = score
      best = text
    }
  }
  return best
}

function kindOf(ext: string): SubtitlePayload['kind'] {
  if (ext === '.ass' || ext === '.ssa') return 'ass'
  if (ext === '.vtt') return 'vtt'
  return 'srt'
}

export function readSubtitle(filePath: string): SubtitlePayload {
  const stat = fs.statSync(filePath)
  if (!stat.isFile()) throw new Error('ليس ملفاً')
  if (stat.size > MAX_SIZE) throw new Error('ملف الترجمة كبير جداً')
  const buffer = fs.readFileSync(filePath)
  const text = decode(buffer).replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/^\uFEFF/, '')
  const ext = path.extname(filePath).toLowerCase()
  return {
    path: filePath,
    name: path.basename(filePath),
    kind: kindOf(ext),
    text
  }
}

function subtitleRank(file: string, base: string): number {
  const name = path.basename(file, path.extname(file)).toLowerCase()
  if (name === base) return 0
  if (/[._-](ar|ara|arabic|عربي|عربية)$/i.test(name)) return 1
  if (name.startsWith(base)) return 2
  return 3
}

export function findSubtitles(videoPath: string): string[] {
  const dir = path.dirname(videoPath)
  const base = path.basename(videoPath, path.extname(videoPath)).toLowerCase()
  const found: string[] = []
  try {
    for (const file of fs.readdirSync(dir)) {
      const ext = path.extname(file).toLowerCase()
      if (!SUB_EXT.includes(ext)) continue
      const name = path.basename(file, ext).toLowerCase()
      if (
        name === base ||
        name.startsWith(base + '.') ||
        name.startsWith(base + '_') ||
        name.startsWith(base + '-')
      ) {
        found.push(path.join(dir, file))
      }
    }
  } catch {
    /* ignore */
  }
  return found.sort((a, b) => subtitleRank(a, base) - subtitleRank(b, base) || a.localeCompare(b))
}

export function listSubtitles(videoPath: string): string[] {
  const dir = path.dirname(videoPath)
  try {
    return fs
      .readdirSync(dir)
      .filter((file) => SUB_EXT.includes(path.extname(file).toLowerCase()))
      .map((file) => path.join(dir, file))
      .sort((a, b) => a.localeCompare(b))
  } catch {
    return []
  }
}
