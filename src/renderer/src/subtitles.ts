export interface SubtitleCue {
  start: number
  end: number
  text: string
}

const TIME_LINE =
  /(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})\s*-->\s*(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})/

function toSeconds(h: string, m: string, s: string, ms: string): number {
  return Number(h) * 3600 + Number(m) * 60 + Number(s) + Number(ms.padEnd(3, '0')) / 1000
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lrm;/gi, '\u200E')
    .replace(/&rlm;/gi, '\u200F')
}

function cleanSrtText(raw: string): string {
  const withBreaks = raw.replace(/<br\s*\/?>/gi, '\n')
  const withoutTags = withBreaks.replace(/<\/?[^>]+>/g, '')
  return decodeEntities(withoutTags)
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function parseSrtOrVtt(text: string): SubtitleCue[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const cues: SubtitleCue[] = []
  let index = 0

  while (index < lines.length) {
    const match = TIME_LINE.exec(lines[index])
    if (!match) {
      index++
      continue
    }
    const start = toSeconds(match[1], match[2], match[3], match[4])
    const end = toSeconds(match[5], match[6], match[7], match[8])
    index++
    const body: string[] = []
    while (index < lines.length && lines[index].trim() !== '') {
      if (TIME_LINE.test(lines[index])) break
      body.push(lines[index])
      index++
    }
    const content = cleanSrtText(body.join('\n'))
    if (content && end > start) cues.push({ start, end, text: content })
  }

  return cues.sort((a, b) => a.start - b.start)
}

function splitAssFields(payload: string, count: number): string[] {
  const fields: string[] = []
  let cursor = 0
  while (fields.length < count - 1) {
    const comma = payload.indexOf(',', cursor)
    if (comma === -1) break
    fields.push(payload.slice(cursor, comma))
    cursor = comma + 1
  }
  fields.push(payload.slice(cursor))
  return fields
}

function parseAssTime(value: string): number | null {
  const match = /^(\d+):(\d{2}):(\d{2})[.](\d{1,3})$/.exec(value.trim())
  if (!match) return null
  return toSeconds(match[1], match[2], match[3], match[4])
}

export function parseAss(text: string): SubtitleCue[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const cues: SubtitleCue[] = []
  let inEvents = false
  let format: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (/^\[events\]$/i.test(trimmed)) {
      inEvents = true
      continue
    }
    if (/^\[.*\]$/.test(trimmed)) {
      inEvents = false
      continue
    }
    if (!inEvents) continue

    if (/^format\s*:/i.test(trimmed)) {
      format = trimmed
        .slice(trimmed.indexOf(':') + 1)
        .split(',')
        .map((field) => field.trim().toLowerCase())
      continue
    }
    if (!/^dialogue\s*:/i.test(trimmed)) continue

    const fields = splitAssFields(trimmed.slice(trimmed.indexOf(':') + 1), format.length || 10)
    const startIndex = format.indexOf('start')
    const endIndex = format.indexOf('end')
    const textIndex = format.indexOf('text')
    if (startIndex === -1 || endIndex === -1 || textIndex === -1) continue

    const start = parseAssTime(fields[startIndex] ?? '')
    const end = parseAssTime(fields[endIndex] ?? '')
    if (start === null || end === null || end <= start) continue

    const body = (fields.slice(textIndex).join(',') || '')
      .replace(/\{[^}]*\}/g, '')
      .replace(/\\[Nn]/g, '\n')
      .replace(/\\h/g, ' ')
      .trim()

    if (body) cues.push({ start, end, text: body })
  }

  return cues.sort((a, b) => a.start - b.start)
}

export function parseSubtitle(text: string, kind: 'srt' | 'vtt' | 'ass'): SubtitleCue[] {
  if (kind === 'ass') return parseAss(text)
  return parseSrtOrVtt(text)
}

export function activeCue(cues: SubtitleCue[], time: number): SubtitleCue | null {
  if (cues.length === 0) return null
  let low = 0
  let high = cues.length - 1
  let index = -1
  while (low <= high) {
    const mid = (low + high) >> 1
    if (cues[mid].start <= time) {
      index = mid
      low = mid + 1
    } else {
      high = mid - 1
    }
  }
  if (index < 0) return null
  for (let i = index; i >= Math.max(0, index - 4); i--) {
    const cue = cues[i]
    if (time >= cue.start && time <= cue.end + 0.12) return cue
  }
  return null
}
