import { app } from 'electron'
import { spawn, type ChildProcess } from 'child_process'
import { createHash } from 'crypto'
import * as fs from 'fs'
import * as path from 'path'
import { ffmpegPath, hasFfmpeg, probe } from './ffmpeg'
import { isRemoteUrl } from './url'

/**
 * تشغيل تلقائي للصيغ غير المدعومة أصلاً في Chromium.
 *
 * الاستراتيجية: نسخ المسارات المتوافقة (h264/aac...) وإعادة ترميز ما سواها
 * إلى MP4/M4A مؤقت. الناتج يُخزَّن مؤقتاً حسب بصمة الملف لتفادي تكرار العمل.
 */

const CACHE_VERSION = 'compat-v1'
const CACHE_MAX_AGE = 14 * 24 * 60 * 60 * 1000

const VIDEO_COPY = new Set(['h264', 'vp9', 'av1'])
const AUDIO_COPY = new Set(['aac', 'mp3', 'opus', 'flac'])

const running = new Map<string, ChildProcess>()
const canceled = new Set<string>()
let pruned = false

function cacheDir(): string {
  return path.join(app.getPath('temp'), 'tayf-cache')
}

function normalizeCodec(codec: string): string {
  return codec.trim().toLowerCase().split(/[\s(]/)[0]
}

function isHlsSource(file: string): boolean {
  try {
    return new URL(file).pathname.toLowerCase().endsWith('.m3u8')
  } catch {
    return /\.m3u8(\?|#|$)/i.test(file)
  }
}

function cacheKey(file: string): string {
  if (isRemoteUrl(file)) {
    // الروابط لا تملك بصمة ملف — البصمة من الرابط نفسه.
    return createHash('sha1').update(`${CACHE_VERSION}|remote|${file}`).digest('hex')
  }
  let stamp = ''
  try {
    const stat = fs.statSync(file)
    stamp = `${stat.size}:${Math.floor(stat.mtimeMs)}`
  } catch {
    /* ignore */
  }
  return createHash('sha1').update(`${CACHE_VERSION}|${file}|${stamp}`).digest('hex')
}

function pruneCache(): void {
  if (pruned) return
  pruned = true
  const dir = cacheDir()
  try {
    const now = Date.now()
    for (const entry of fs.readdirSync(dir)) {
      const full = path.join(dir, entry)
      try {
        if (now - fs.statSync(full).mtimeMs > CACHE_MAX_AGE) fs.unlinkSync(full)
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* cache not created yet */
  }
}

export function cancelPrepare(id: string): boolean {
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

function parseTime(line: string): number | null {
  const match = /time=(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(line)
  if (!match) return null
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3])
}

export interface PrepareResult {
  ok: boolean
  path?: string
  error?: string
  canceled?: boolean
}

export async function preparePlayback(
  id: string,
  file: string,
  onProgress: (percent: number, line?: string) => void
): Promise<PrepareResult> {
  if (!hasFfmpeg()) {
    return { ok: false, error: 'ffmpeg غير متوفر لإصلاح التوافق' }
  }

  const remote = isRemoteUrl(file)
  let info
  try {
    info = await probe(file)
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }

  // البث المباشر بلا مدة معروفة لا يمكن "تجهيزه" كملف — نرفضه بدلاً من حجب الواجهة.
  if (remote && (!Number.isFinite(info.duration) || info.duration <= 0)) {
    return { ok: false, error: 'البث المباشر غير محدود المدة غير مدعوم' }
  }

  const video = info.streams.find((stream) => stream.type === 'video')
  const audio = info.streams.find((stream) => stream.type === 'audio')

  if (!video && !audio) {
    return { ok: false, error: 'لا يحتوي الملف على مسار صوت أو صورة' }
  }

  const videoCodec = video ? normalizeCodec(video.codec) : ''
  const audioCodec = audio ? normalizeCodec(audio.codec) : ''
  const copyVideo = Boolean(video) && VIDEO_COPY.has(videoCodec)
  const copyAudio = Boolean(audio) && AUDIO_COPY.has(audioCodec)

  pruneCache()
  const dir = cacheDir()
  try {
    fs.mkdirSync(dir, { recursive: true })
  } catch (err) {
    return { ok: false, error: String(err) }
  }

  const ext = video ? 'mp4' : 'm4a'
  const output = path.join(dir, `${cacheKey(file)}.${ext}`)
  try {
    if (fs.existsSync(output) && fs.statSync(output).size > 0) {
      onProgress(100)
      return { ok: true, path: output }
    }
  } catch {
    /* ignore */
  }

  const part = `${output}.part`
  const hls = remote && isHlsSource(file)
  const args = ['-hide_banner', '-nostdin', '-y']
  if (remote) args.push('-protocol_whitelist', 'file,http,https,tcp,tls,crypto')
  args.push('-i', file)

  if (video) {
    args.push('-map', '0:v:0?', '-map', '0:a:0?')
    if (copyVideo) args.push('-c:v', 'copy')
    else args.push('-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p')

    if (audio) {
      if (copyAudio) {
        args.push('-c:a', 'copy')
        if (hls) args.push('-bsf:a', 'aac_adtstoasc')
      } else {
        args.push('-c:a', 'aac', '-b:a', '192k', '-ac', '2')
      }
    } else {
      args.push('-an')
    }
    args.push('-sn', '-dn', '-movflags', '+faststart', '-f', 'mp4', part)
  } else {
    args.push('-vn', '-sn', '-dn', '-c:a', 'aac', '-b:a', '192k', '-ac', '2', '-movflags', '+faststart', '-f', 'mp4', part)
  }

  const total = info.duration

  return new Promise<PrepareResult>((resolve) => {
    let finished = false
    const finish = (result: PrepareResult): void => {
      if (finished) return
      finished = true
      running.delete(id)
      canceled.delete(id)
      if (!result.ok) {
        try {
          fs.unlinkSync(part)
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
      if (stderr.length > 120_000) stderr = stderr.slice(-60_000)
      for (const line of text.split(/\r?\n|\r/)) {
        const time = parseTime(line)
        if (time !== null && total > 0) {
          onProgress(Math.max(0, Math.min(99, (time / total) * 100)), line.trim())
        }
      }
    })

    child.on('error', (err) => finish({ ok: false, error: err.message }))
    child.on('close', (code) => {
      if (canceled.has(id)) {
        finish({ ok: false, canceled: true })
        return
      }
      if (code !== 0) {
        const tail = stderr
          .split(/\r?\n|\r/)
          .filter((line) => line.trim() && !line.includes('frame=') && !line.includes('size='))
          .slice(-5)
          .join('\n')
        finish({ ok: false, error: tail || `ffmpeg exited with code ${code}` })
        return
      }
      try {
        fs.renameSync(part, output)
      } catch (err) {
        finish({ ok: false, error: String(err) })
        return
      }
      onProgress(100)
      finish({ ok: true, path: output })
    })
  })
}
