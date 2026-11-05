import { app } from 'electron'
import { execFile, spawn, type ChildProcess } from 'child_process'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import type { MediaInfo, ToolRequest, ToolResult } from '../shared/types'

const isWin = process.platform === 'win32'
const exe = isWin ? 'ffmpeg.exe' : 'ffmpeg'

function unpacked(p: string): string {
  return app.isPackaged ? p.replace('app.asar', 'app.asar.unpacked') : p
}

let cachedPath: string | null | undefined

function candidates(): string[] {
  const list: string[] = []
  if (process.env.TAYF_FFMPEG) list.push(process.env.TAYF_FFMPEG)
  if (process.resourcesPath) list.push(path.join(process.resourcesPath, 'bin', exe))
  list.push(path.join(app.getAppPath(), 'resources', 'bin', exe))
  list.push(path.join(process.cwd(), 'resources', 'bin', exe))
  return list
}

/** مسار ffmpeg: متغير البيئة، ثم الحزمة المرفقة، ثم الوحدة الاختيارية، ثم PATH. */
export function ffmpegPath(): string {
  if (cachedPath !== undefined) return cachedPath || 'ffmpeg'
  for (const candidate of candidates()) {
    try {
      if (candidate && fs.existsSync(candidate)) {
        cachedPath = candidate
        return candidate
      }
    } catch {
      /* ignore */
    }
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('ffmpeg-static') as string | null
    if (mod && fs.existsSync(unpacked(mod))) {
      cachedPath = unpacked(mod)
      return cachedPath
    }
  } catch {
    /* optional */
  }
  cachedPath = null
  return 'ffmpeg'
}

export function hasFfmpeg(): boolean {
  const resolved = ffmpegPath()
  if (resolved === 'ffmpeg') return false
  try {
    return fs.existsSync(resolved)
  } catch {
    return false
  }
}

interface ParsedInfo extends MediaInfo {}

/** تحليل مخرجات `ffmpeg -i` لاستخراج معلومات الوسائط دون الحاجة إلى ffprobe. */
export function parseFfmpegInfo(text: string, size = 0): MediaInfo {
  const info: ParsedInfo = {
    duration: 0,
    size,
    formatName: '',
    bitrate: 0,
    streams: []
  }

  const formatMatch = /Input #0,\s*(.+?),\s*from\s+'/.exec(text)
  if (formatMatch) info.formatName = formatMatch[1].trim()

  const durationMatch = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(text)
  if (durationMatch) {
    info.duration =
      Number(durationMatch[1]) * 3600 + Number(durationMatch[2]) * 60 + Number(durationMatch[3])
  }

  const bitrateMatch = /Duration:.*?bitrate:\s*(\d+(?:\.\d+)?)\s*kb\/s/i.exec(text)
  if (bitrateMatch) info.bitrate = Math.round(Number(bitrateMatch[1]) * 1000)

  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*Stream #0:(\d+)(?:\[[^\]]*\])?(?:\(([^)]+)\))?:\s*(Video|Audio|Subtitle|Data|Attachment):\s*([^,]+)(.*)$/.exec(
      line
    )
    if (!match) continue
    const type = match[3].toLowerCase()
    const codec = match[4].trim()
    const rest = match[5] || ''
    const language = match[2]?.trim() || undefined
    const stream: MediaInfo['streams'][number] = { type, codec, language }

    if (type === 'video') {
      const dims = /(\d{2,5})x(\d{2,5})/.exec(rest)
      if (dims) {
        stream.width = Number(dims[1])
        stream.height = Number(dims[2])
      }
    }
    if (type === 'audio') {
      const hz = /(\d{3,6})\s*Hz/.exec(rest)
      if (hz) stream.sampleRate = hz[1]
      if (/stereo/i.test(rest)) stream.channels = 2
      else if (/mono/i.test(rest)) stream.channels = 1
      else if (/5\.1/i.test(rest)) stream.channels = 6
      else if (/7\.1/i.test(rest)) stream.channels = 8
      else {
        const ch = /(\d+)\s*channels?/i.exec(rest)
        if (ch) stream.channels = Number(ch[1])
      }
    }
    const kbps = /(\d+(?:\.\d+)?)\s*kb\/s/i.exec(rest)
    if (kbps) stream.bitrate = Math.round(Number(kbps[1]) * 1000)

    info.streams.push(stream)
  }

  if (info.bitrate === 0) {
    const sum = info.streams.reduce((acc, s) => acc + (s.bitrate ?? 0), 0)
    if (sum > 0) info.bitrate = sum
  }

  return info
}

export function probe(file: string): Promise<MediaInfo> {
  return new Promise((resolve, reject) => {
    if (!hasFfmpeg()) {
      reject(new Error('ffmpeg غير متوفر. تأكد من وجود resources/bin/ffmpeg.exe'))
      return
    }
    execFile(
      ffmpegPath(),
      ['-hide_banner', '-nostdin', '-i', file],
      { maxBuffer: 16 * 1024 * 1024, windowsHide: true, timeout: 30_000 },
      (_err, _stdout, stderr) => {
        const text = stderr || ''
        if (!text.trim()) {
          reject(new Error('تعذّر قراءة معلومات الملف'))
          return
        }
        if (/No such file or directory|Invalid data found|Permission denied/i.test(text)) {
          reject(new Error('ملف غير صالح أو غير قابل للقراءة'))
          return
        }
        if (
          /Connection (refused|reset|timed out)|HTTP error|Failed to open|timed out|No route to host|Network is unreachable|Could not resolve host|Name or service not known|Temporary failure in name resolution|No route to host|Server returned 4\d\d|Server returned 5\d\d|403 Forbidden|404 Not Found/i.test(
            text
          )
        ) {
          reject(new Error('تعذّر الاتصال بالرابط أو تعذر الوصول إليه'))
          return
        }
        let size = 0
        try {
          size = fs.statSync(file).size
        } catch {
          /* ignore */
        }
        const info = parseFfmpegInfo(text, size)
        if (!info.formatName && info.streams.length === 0) {
          reject(new Error('صيغة غير مدعومة'))
          return
        }
        resolve(info)
      }
    )
  })
}

const running = new Map<string, ChildProcess>()
const canceled = new Set<string>()

export function cancelTool(id: string): boolean {
  const child = running.get(id)
  if (!child) return false
  canceled.add(id)
  try {
    child.kill()
  } catch {
    /* ignore */
  }
  running.delete(id)
  return true
}

function baseName(input: string): string {
  return path.basename(input, path.extname(input))
}

function outName(input: string, ext: string): string {
  if (/^https?:\/\//i.test(input)) {
    // لا معنى لمسار مجلد من رابط — نقترح اسماً ملفاً فقط.
    try {
      const url = new URL(input)
      const base = path.basename(decodeURIComponent(url.pathname)) || 'media'
      const stem = base.replace(/\.[^.]+$/, '') || 'media'
      return `${stem}_tayf.${ext}`
    } catch {
      return `media_tayf.${ext}`
    }
  }
  return path.join(path.dirname(input), `${baseName(input)}_tayf.${ext}`)
}

interface Built {
  args: string[]
  ext: string
  cleanup?: string
}

function seconds(value: unknown, fallback = 0): number {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

export function buildArgs(req: ToolRequest): Built {
  const options = req.options || {}
  const start = seconds(options.start)
  const end = seconds(options.end)
  const length = end > start ? end - start : 0
  const crf = String(options.crf ?? 23)
  const input = req.input

  switch (req.kind) {
    case 'gif': {
      const fps = Math.max(1, Math.min(30, Math.round(seconds(options.fps, 12)) || 12))
      const width = Math.max(120, Math.min(1280, Math.round(seconds(options.width, 480)) || 480))
      const filters = `fps=${fps},scale=${width}:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=256[p];[s1][p]paletteuse=dither=sierra2_4a`
      return {
        ext: 'gif',
        args: [
          '-hide_banner',
          '-nostdin',
          '-y',
          ...(start > 0 ? ['-ss', String(start)] : []),
          ...(length > 0 ? ['-t', String(length)] : []),
          '-i', input,
          '-vf', filters,
          '-loop', '0',
          '@OUT@'
        ]
      }
    }
    case 'clip': {
      const copy = Boolean(options.copy)
      const ext = String(options.ext || path.extname(input).replace('.', '') || 'mp4').replace('.', '')
      return {
        ext,
        args: [
          '-hide_banner',
          '-nostdin',
          '-y',
          ...(start > 0 ? ['-ss', String(start)] : []),
          ...(length > 0 ? ['-t', String(length)] : []),
          '-i', input,
          ...(copy
            ? ['-c', 'copy', '-avoid_negative_ts', 'make_zero']
            : [
                '-c:v', 'libx264',
                '-preset', 'veryfast',
                '-crf', crf,
                '-c:a', 'aac',
                '-b:a', '192k'
              ]),
          '@OUT@'
        ]
      }
    }
    case 'convert': {
      const format = String(options.format || 'mp4').replace('.', '')
      const recipes: Record<string, string[]> = {
        mp4: ['-c:v', 'libx264', '-preset', 'medium', '-crf', crf, '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart'],
        mkv: ['-c:v', 'libx264', '-preset', 'medium', '-crf', crf, '-c:a', 'aac', '-b:a', '192k'],
        webm: ['-c:v', 'libvpx-vp9', '-crf', crf, '-b:v', '0', '-c:a', 'libopus', '-b:a', '128k'],
        mp3: ['-vn', '-c:a', 'libmp3lame', '-q:a', '2'],
        wav: ['-vn', '-c:a', 'pcm_s16le'],
        flac: ['-vn', '-c:a', 'flac'],
        gif: [
          '-vf',
          'fps=12,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=256[p];[s1][p]paletteuse=dither=sierra2_4a',
          '-loop', '0'
        ],
        png: ['-frames:v', '1'],
        jpg: ['-frames:v', '1', '-q:v', '2']
      }
      return {
        ext: format,
        args: [
          '-hide_banner',
          '-nostdin',
          '-y',
          ...(start > 0 ? ['-ss', String(start)] : []),
          '-i', input,
          ...(recipes[format] || recipes.mp4),
          '@OUT@'
        ]
      }
    }
    case 'join': {
      const listFile = path.join(os.tmpdir(), `tayf-join-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`)
      const lines = (req.inputs || []).map((p) => `file '${p.replace(/\\/g, '/').replace(/'/g, "'\\''")}'`)
      fs.writeFileSync(listFile, lines.join('\n'), 'utf8')
      const format = String(options.format || 'mp4').replace('.', '')
      const hasRemote = (req.inputs || []).some((p) => /^https?:\/\//i.test(p))
      return {
        ext: format,
        cleanup: listFile,
        args: [
          '-hide_banner',
          '-nostdin',
          '-y',
          ...(hasRemote ? ['-protocol_whitelist', 'file,http,https,tcp,tls,crypto'] : []),
          '-f', 'concat',
          '-safe', '0',
          '-i', listFile,
          ...(options.reencode
            ? ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', crf, '-c:a', 'aac', '-b:a', '192k']
            : ['-c', 'copy']),
          '@OUT@'
        ]
      }
    }
    default:
      throw new Error('أداة غير معروفة')
  }
}

function parseTime(line: string): number | null {
  const match = /time=(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(line)
  if (!match) return null
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3])
}

export async function runTool(
  id: string,
  req: ToolRequest,
  output: string,
  onProgress: (percent: number, line?: string) => void
): Promise<ToolResult> {
  let built: Built
  try {
    built = buildArgs(req)
  } catch (err) {
    return { ok: false, error: String(err) }
  }

  if (!hasFfmpeg()) {
    return { ok: false, error: 'ffmpeg غير متوفر. أعد تثبيت التطبيق أو ضع ffmpeg.exe في مجلد resources/bin' }
  }

  let total = 0
  try {
    if (req.kind === 'join') {
      const infos = await Promise.all((req.inputs || []).map((file) => probe(file).catch(() => null)))
      total = infos.reduce((sum, item) => sum + (item?.duration ?? 0), 0)
    } else {
      const info = await probe(req.input).catch(() => null)
      total = info?.duration ?? 0
    }
  } catch {
    total = 0
  }
  if (total <= 0) {
    const start = seconds(req.options?.start)
    const end = seconds(req.options?.end)
    total = end > start ? end - start : 0
  }

  const args = built.args.map((arg) => (arg === '@OUT@' ? output : arg))

  return new Promise((resolve) => {
    let finished = false
    const finish = (result: ToolResult): void => {
      if (finished) return
      finished = true
      running.delete(id)
      canceled.delete(id)
      if (built.cleanup) {
        try {
          fs.unlinkSync(built.cleanup)
        } catch {
          /* ignore */
        }
      }
      resolve(result)
    }

    let child: ChildProcess
    try {
      child = spawn(ffmpegPath(), args, { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] })
    } catch (err) {
      finish({ ok: false, error: String(err) })
      return
    }

    running.set(id, child)
    let stderr = ''
    child.stderr?.on('data', (chunk: Buffer) => {
      const text = chunk.toString()
      stderr += text
      if (stderr.length > 200_000) stderr = stderr.slice(-100_000)
      for (const line of text.split(/\r?\n|\r/)) {
        const time = parseTime(line)
        if (time !== null && total > 0) {
          onProgress(Math.max(0, Math.min(99, (time / total) * 100)), line.trim())
        } else if (line.trim()) {
          onProgress(-1, line.trim())
        }
      }
    })
    child.on('error', (err) => finish({ ok: false, error: err.message }))
    child.on('close', (code) => {
      if (canceled.has(id)) {
        finish({ ok: false, canceled: true, error: 'أُلغيت العملية' })
        return
      }
      if (code === 0) {
        onProgress(100)
        finish({ ok: true, output })
      } else {
        const tail = stderr
          .split(/\r?\n|\r/)
          .filter((line) => line.trim() && !line.includes('frame=') && !line.includes('size='))
          .slice(-6)
          .join('\n')
        finish({ ok: false, error: tail || `ffmpeg exited with code ${code}` })
      }
    })
  })
}

export function suggestOutput(req: ToolRequest): string {
  if (req.kind === 'join') {
    const first = req.inputs?.[0] || 'joined'
    return outName(first, String(req.options?.format || 'mp4').replace('.', ''))
  }
  if (req.kind === 'clip') {
    const ext = String(req.options?.ext || path.extname(req.input).replace('.', '') || 'mp4').replace('.', '')
    return outName(req.input, ext || 'mp4')
  }
  if (req.kind === 'gif') return outName(req.input, 'gif')
  return outName(req.input, String(req.options?.format || 'mp4').replace('.', ''))
}
