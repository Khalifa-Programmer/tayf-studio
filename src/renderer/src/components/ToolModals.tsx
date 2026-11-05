import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactElement, ReactNode } from 'react'
import type { MediaInfo, MediaItem, ProgressEvent, ToolKind, ToolRequest, ToolResult } from '../../../shared/types'
import type { TFunction } from '../i18n'
import { cn, formatBitrate, formatBytes, formatTime } from '../utils'
import {
  Alert,
  Camera,
  CheckCircle,
  Convert,
  External,
  Film,
  Folder,
  Gif,
  Info,
  Layers,
  Loader,
  Play,
  Plus,
  Scissors,
  Trash,
  X
} from './Icons'

interface ShellProps {
  title: string
  description: string
  badge: ReactNode
  onClose: () => void
  children: ReactNode
  footer: ReactNode
  wide?: boolean
  t: TFunction
}

export function Shell({ title, description, badge, onClose, children, footer, wide, t }: ShellProps): ReactElement {
  useEffect(() => {
    const handler = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      event.preventDefault()
      onClose()
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [onClose])

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div
        className={cn(
          'panel fade-in flex max-h-[88vh] w-full flex-col overflow-hidden rounded-2xl border shadow-2xl',
          wide ? 'max-w-2xl' : 'max-w-lg'
        )}
        style={{ boxShadow: 'var(--shadow)' }}
      >
        <div className="flex items-start gap-3 border-b px-5 py-4" style={{ borderColor: 'var(--border)' }}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
            {badge}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-extrabold">{title}</h2>
            <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--muted)]">{description}</p>
          </div>
          <button type="button" className="btn-icon h-8 w-8" title={t('close')} onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        <div className="flex items-center justify-between gap-2 border-t px-5 py-3" style={{ borderColor: 'var(--border)' }}>
          {footer}
        </div>
      </div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }): ReactElement {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-[10.5px] font-bold text-[var(--muted)]">
        <span>{label}</span>
        {hint ? <span className="font-medium opacity-80">{hint}</span> : null}
      </span>
      {children}
    </label>
  )
}

function NumberInput(props: {
  value: number
  min?: number
  max?: number
  step?: number
  onChange: (value: number) => void
}): ReactElement {
  return (
    <input
      type="number"
      className="field h-9 w-full text-[12px] tabular-nums"
      value={Number.isFinite(props.value) ? Math.round(props.value * 10) / 10 : 0}
      min={props.min ?? 0}
      max={props.max}
      step={props.step ?? 0.5}
      onChange={(event) => props.onChange(Number(event.target.value))}
    />
  )
}

function Toggle({
  checked,
  onChange,
  label
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
}): ReactElement {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-xl border px-3 py-2 text-start transition-colors"
      style={{ borderColor: checked ? 'var(--accent)' : 'var(--border)', background: 'var(--panel-2)' }}
    >
      <span className="text-[11.5px] font-semibold">{label}</span>
      <span
        className={cn('relative h-5 w-9 rounded-full transition-colors', checked ? 'bg-[var(--accent)]' : 'bg-[var(--border)]')}
      >
        <span
          className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-[inset-inline-start] duration-200"
          style={{ insetInlineStart: checked ? 'calc(100% - 18px)' : 2 }}
        />
      </span>
    </button>
  )
}

const FORMATS = ['mp4', 'mkv', 'webm', 'mp3', 'wav', 'flac', 'gif', 'png']

interface ToolModalProps {
  kind: ToolKind
  item: MediaItem | null
  files: MediaItem[]
  currentTime: number
  duration: number
  ffmpegReady: boolean
  onClose: () => void
  onPlayOutput: (path: string) => void
  onReveal: (path: string) => void
  onOpenPath: (path: string) => void
  t: TFunction
}

export function ToolModal(props: ToolModalProps): ReactElement {
  const { t, kind, item, duration } = props
  const allowedDuration = Number.isFinite(duration) && duration > 0 ? duration : Math.max(60, props.currentTime + 30)
  const initialStart = Math.max(0, Math.min(props.currentTime, allowedDuration))
  const initialEnd = Math.min(allowedDuration, initialStart + 10)

  const idRef = useRef(`tool-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  const [start, setStart] = useState(initialStart)
  const [end, setEnd] = useState(initialEnd)
  const [fps, setFps] = useState(12)
  const [width, setWidth] = useState(480)
  const [format, setFormat] = useState(kind === 'convert' ? 'mp4' : kind === 'join' ? 'mp4' : 'mp4')
  const [crf, setCrf] = useState(23)
  const [copy, setCopy] = useState(false)
  const [reencode, setReencode] = useState(false)
  const [joinInputs, setJoinInputs] = useState<string[]>(() => {
    const videos = props.files.filter((file) => file.type === 'video').map((file) => file.path)
    if (videos.length > 1) return videos
    return item ? [item.path] : []
  })
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [line, setLine] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState<ToolResult | null>(null)

  useEffect(() => {
    const unsubscribe = window.tayfAPI.onProgress((event: ProgressEvent) => {
      if (event.id !== idRef.current) return
      if (event.percent >= 0) setProgress(event.percent)
      if (event.line) setLine(event.line)
    })
    return unsubscribe
  }, [])

  const meta = {
    gif: { title: t('toolGif'), desc: t('gifDesc'), icon: <Gif size={20} /> },
    clip: { title: t('toolClip'), desc: t('clipDesc'), icon: <Scissors size={20} /> },
    convert: { title: t('toolConvert'), desc: t('convertDesc'), icon: <Convert size={20} /> },
    join: { title: t('toolJoin'), desc: t('joinDesc'), icon: <Film size={20} /> }
  }[kind]

  const setStartSafe = (value: number): void => {
    const next = Math.max(0, Math.min(value, allowedDuration))
    setStart(next)
    if (end <= next) setEnd(Math.min(allowedDuration, next + 5))
  }

  const addJoinFiles = async (): Promise<void> => {
    const picked = await window.tayfAPI.pickFiles()
    if (picked.length === 0) return
    setJoinInputs((current) => {
      const merged = [...current]
      for (const file of picked) if (!merged.includes(file)) merged.push(file)
      return merged
    })
  }

  const moveJoin = (index: number, delta: number): void => {
    setJoinInputs((current) => {
      const next = [...current]
      const target = index + delta
      if (target < 0 || target >= next.length) return current
      const [entry] = next.splice(index, 1)
      next.splice(target, 0, entry)
      return next
    })
  }

  const buildRequest = (): ToolRequest | null => {
    if (kind === 'join') {
      if (joinInputs.length < 2) {
        setError(t('joinNeedFiles'))
        return null
      }
      return {
        kind,
        input: joinInputs[0],
        inputs: joinInputs,
        options: { format, reencode }
      }
    }
    if (!item) {
      setError(t('noMedia'))
      return null
    }
    if (kind === 'convert') {
      return {
        kind,
        input: item.path,
        options: {
          format,
          crf,
          ...(format === 'png' || format === 'jpg' ? { start } : {})
        }
      }
    }
    if (end <= start) {
      setError(t('endAfterStart'))
      return null
    }
    if (kind === 'gif') {
      return { kind, input: item.path, options: { start, end, fps, width } }
    }
    return {
      kind,
      input: item.path,
      options: {
        start,
        end,
        copy,
        crf,
        ext: copy ? item.path.split('.').pop() || 'mp4' : 'mp4'
      }
    }
  }

  const run = async (): Promise<void> => {
    setError('')
    setResult(null)
    setLine('')
    const request = buildRequest()
    if (!request) return
    setRunning(true)
    setProgress(0)
    try {
      const response = await window.tayfAPI.runTool(idRef.current, request)
      if (response.canceled) {
        setError(t('toolCanceled'))
      } else if (!response.ok) {
        setError(response.error || t('toolFailed'))
      } else {
        setResult(response)
        setProgress(100)
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setRunning(false)
    }
  }

  const cancel = async (): Promise<void> => {
    await window.tayfAPI.cancelTool(idRef.current)
  }

  const progressValue = Math.max(0, Math.min(100, progress ?? 0))
  const gifTooLong = kind === 'gif' && end - start > 15
  const canRun = props.ffmpegReady && !running && (kind === 'join' ? joinInputs.length >= 2 : Boolean(item))

  return (
    <Shell
      title={meta.title}
      description={meta.desc}
      badge={meta.icon}
      onClose={running ? () => undefined : props.onClose}
      wide={kind === 'join'}
      t={t}
      footer={
        <>
          <div className="flex items-center gap-2 text-[10px] text-[var(--muted)]">
            {result ? <CheckCircle size={14} style={{ color: 'var(--accent)' }} /> : null}
            {running ? (
              <>
                <Loader size={14} className="animate-spin" />
                {t('running')}
              </>
            ) : result ? (
              t('toolDone')
            ) : (
              t('chooseOutputHint')
            )}
          </div>
          <div className="flex items-center gap-2">
            {running ? (
              <button type="button" className="btn-ghost h-9 px-4 text-[11px] font-bold" onClick={cancel}>
                {t('cancel')}
              </button>
            ) : (
              <button type="button" className="btn-ghost h-9 px-4 text-[11px] font-bold" onClick={props.onClose}>
                {t('close')}
              </button>
            )}
            <button
              type="button"
              className="btn-primary h-9 px-5 text-[11px] font-extrabold disabled:opacity-40"
              onClick={run}
              disabled={!canRun}
            >
              {t('runTool')}
            </button>
          </div>
        </>
      }
    >
      {!props.ffmpegReady ? (
        <div className="mb-3 flex gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-[11px] leading-relaxed text-amber-200">
          <Alert size={16} className="mt-0.5 shrink-0" />
          <div>
            <div className="font-bold">{t('noFfmpeg')}</div>
            <div className="opacity-80">{t('noFfmpegHint')}</div>
          </div>
        </div>
      ) : null}

      {kind === 'join' ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold text-[var(--muted)]">
              {t('selectedFiles')} · {joinInputs.length}
            </span>
            <div className="flex items-center gap-1.5">
              <button type="button" className="btn-ghost flex h-7 items-center gap-1 px-2 text-[10px] font-bold" onClick={addJoinFiles}>
                <Plus size={12} />
                {t('addFiles')}
              </button>
              <button
                type="button"
                className="btn-ghost flex h-7 items-center gap-1 px-2 text-[10px] font-bold hover:!text-red-400"
                onClick={() => setJoinInputs([])}
                disabled={joinInputs.length === 0}
              >
                <Trash size={12} />
                {t('clearFiles')}
              </button>
            </div>
          </div>
          <div className="scroll-thin max-h-52 space-y-1 overflow-y-auto rounded-xl border p-1.5" style={{ borderColor: 'var(--border)' }}>
            {joinInputs.length === 0 ? (
              <div className="py-6 text-center text-[11px] text-[var(--muted)]">{t('joinNeedFiles')}</div>
            ) : (
              joinInputs.map((file, index) => (
                <div key={file} className="flex items-center gap-1.5 rounded-lg bg-[var(--panel-2)] px-2 py-1.5">
                  <span className="w-4 text-center text-[9px] font-bold text-[var(--muted)]">{index + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-[11px]" title={file}>
                    {file.split(/[\\/]/).pop()}
                  </span>
                  <button type="button" className="btn-icon h-6 w-6 text-[9px]" onClick={() => moveJoin(index, -1)} title={t('moveUp')}>
                    ↑
                  </button>
                  <button type="button" className="btn-icon h-6 w-6 text-[9px]" onClick={() => moveJoin(index, 1)} title={t('moveDown')}>
                    ↓
                  </button>
                  <button
                    type="button"
                    className="btn-icon h-6 w-6 hover:!text-red-400"
                    onClick={() => setJoinInputs((current) => current.filter((_, i) => i !== index))}
                    title={t('remove')}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
          <p className="text-[10px] leading-relaxed text-[var(--muted)]">{t('joinHint')}</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('targetFormat')}>
              <select className="field h-9 w-full text-[12px]" value={format} onChange={(event) => setFormat(event.target.value)}>
                <option value="mp4">MP4</option>
                <option value="mkv">MKV</option>
                <option value="webm">WebM</option>
              </select>
            </Field>
            <div className="flex items-end">
              <Toggle checked={reencode} onChange={setReencode} label={t('reencode')} />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl border px-3 py-2" style={{ borderColor: 'var(--border)', background: 'var(--panel-2)' }}>
            <div className="text-[9.5px] font-bold uppercase tracking-wide text-[var(--muted)]">{t('sourceFile')}</div>
            <div className="truncate text-[11.5px] font-semibold" title={item?.path}>
              {item?.name || '—'}
            </div>
          </div>

          {kind === 'gif' || kind === 'clip' ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t('startTime')} hint={formatTime(start)}>
                  <NumberInput value={start} min={0} max={allowedDuration} onChange={setStartSafe} />
                </Field>
                <Field label={t('endTime')} hint={formatTime(end)}>
                  <NumberInput
                    value={end}
                    min={0}
                    max={allowedDuration}
                    onChange={(value) => setEnd(Math.max(0, Math.min(value, allowedDuration)))}
                  />
                </Field>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  className="btn-ghost h-7 px-2 text-[10px] font-bold"
                  onClick={() => setStartSafe(props.currentTime)}
                >
                  {t('fromCurrent')}
                </button>
                {[5, 10, 30].map((seconds) => (
                  <button
                    key={seconds}
                    type="button"
                    className="btn-ghost h-7 px-2 text-[10px] font-bold"
                    onClick={() => setEnd(Math.min(allowedDuration, start + seconds))}
                  >
                    +{seconds}{t('secondsUnit')}
                  </button>
                ))}
                <span className="ml-auto self-center text-[10px] text-[var(--muted)]">
                  {t('durationLabel')}: {formatTime(Math.max(0, end - start))}
                </span>
              </div>
            </>
          ) : null}

          {kind === 'gif' ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t('fps')} hint={`${fps}`}>
                  <input
                    type="range"
                    min={5}
                    max={30}
                    step={1}
                    value={fps}
                    onChange={(event) => setFps(Number(event.target.value))}
                    className="h-8 w-full"
                    style={{ '--fill': `${((fps - 5) / 25) * 100}%` } as CSSProperties}
                  />
                </Field>
                <Field label={t('width')} hint={`${width}px`}>
                  <select className="field h-9 w-full text-[12px]" value={width} onChange={(event) => setWidth(Number(event.target.value))}>
                    {[320, 480, 640, 800].map((value) => (
                      <option key={value} value={value}>
                        {value}px
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              {gifTooLong ? (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[10px] text-amber-200">
                  {t('gifSizeHint')}
                </div>
              ) : null}
            </>
          ) : null}

          {kind === 'clip' ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t('quality')} hint={`CRF ${crf}`}>
                  <input
                    type="range"
                    min={16}
                    max={30}
                    step={1}
                    value={crf}
                    onChange={(event) => setCrf(Number(event.target.value))}
                    className="h-8 w-full"
                    style={{ '--fill': `${((30 - crf) / 14) * 100}%` } as CSSProperties}
                    disabled={copy}
                  />
                </Field>
                <Field label={t('targetFormat')}>
                  <select
                    className="field h-9 w-full text-[12px]"
                    value={copy ? 'source' : 'mp4'}
                    onChange={(event) => {
                      if (event.target.value === 'source') setCopy(true)
                      else setCopy(false)
                    }}
                    disabled={copy}
                  >
                    <option value="mp4">MP4</option>
                    <option value="source">{t('lossless')}</option>
                  </select>
                </Field>
              </div>
              <Toggle checked={copy} onChange={setCopy} label={t('copyStreams')} />
              <p className="text-[10px] leading-relaxed text-[var(--muted)]">{copy ? t('copyHint') : t('clipHint')}</p>
            </>
          ) : null}

          {kind === 'convert' ? (
            <>
              <div className="grid grid-cols-4 gap-1.5">
                {FORMATS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFormat(value)}
                    className={cn(
                      'rounded-lg border py-2 text-[11px] font-bold uppercase transition-colors',
                      format === value
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                        : 'border-[var(--border)] bg-[var(--panel-2)] hover:bg-[var(--elevated)]'
                    )}
                  >
                    {value}
                  </button>
                ))}
              </div>
              {['mp4', 'mkv', 'webm'].includes(format) ? (
                <Field label={t('quality')} hint={`CRF ${crf} · ${t('qualityHint')}`}>
                  <input
                    type="range"
                    min={16}
                    max={32}
                    step={1}
                    value={crf}
                    onChange={(event) => setCrf(Number(event.target.value))}
                    className="h-8 w-full"
                    style={{ '--fill': `${((32 - crf) / 16) * 100}%` } as CSSProperties}
                  />
                </Field>
              ) : null}
              {format === 'png' || format === 'jpg' ? (
                <Field label={t('currentPosition')} hint={formatTime(props.currentTime)}>
                  <div className="text-[10px] text-[var(--muted)]">{t('convertHint')}</div>
                </Field>
              ) : null}
            </>
          ) : null}
        </div>
      )}

      {running || progress !== null ? (
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-[10px] font-bold text-[var(--muted)]">
            <span>{t('progress')}</span>
            <span className="tabular-nums">{Math.round(progressValue)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--border)]">
            <div className="h-full rounded-full transition-all" style={{ width: `${progressValue}%`, background: 'var(--accent)' }} />
          </div>
          {line && running ? <div className="mt-1 truncate text-[9px] text-[var(--muted)]">{line}</div> : null}
        </div>
      ) : null}

      {error ? (
        <div className="mt-3 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-[10.5px] leading-relaxed text-red-300">
          {error}
        </div>
      ) : null}

      {result?.output ? (
        <div className="mt-3 rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--panel-2)' }}>
          <div className="mb-1 flex items-center gap-1.5 text-[10.5px] font-bold text-[var(--accent)]">
            <CheckCircle size={14} />
            {t('outputFile')}
          </div>
          <div className="mb-2 truncate text-[10px] text-[var(--muted)]" title={result.output}>
            {result.output}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              className="btn-primary flex h-7 items-center gap-1 px-2.5 text-[10px] font-bold"
              onClick={() => props.onPlayOutput(result.output as string)}
            >
              <Play size={12} />
              {t('playOutput')}
            </button>
            <button
              type="button"
              className="btn-ghost flex h-7 items-center gap-1 px-2.5 text-[10px] font-bold"
              onClick={() => props.onOpenPath(result.output as string)}
            >
              <External size={12} />
              {t('openOutput')}
            </button>
            <button
              type="button"
              className="btn-ghost flex h-7 items-center gap-1 px-2.5 text-[10px] font-bold"
              onClick={() => props.onReveal(result.output as string)}
            >
              <Folder size={12} />
              {t('showOutput')}
            </button>
          </div>
        </div>
      ) : null}
    </Shell>
  )
}

interface InfoModalProps {
  item: MediaItem
  onClose: () => void
  t: TFunction
}

export function InfoModal({ item, onClose, t }: InfoModalProps): ReactElement {
  const [info, setInfo] = useState<MediaInfo | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    setInfo(null)
    setError('')
    window.tayfAPI
      .probe(item.path)
      .then((result) => {
        if (!alive) return
        if ('error' in result) setError(result.error)
        else setInfo(result)
      })
      .catch((err) => alive && setError(String(err)))
    return () => {
      alive = false
    }
  }, [item.path])

  const streamLabel = (type: string): string => {
    if (type === 'video') return t('streamVideo')
    if (type === 'audio') return t('streamAudio')
    if (type === 'subtitle') return t('streamSubtitle')
    return t('streamOther')
  }

  return (
    <Shell
      title={t('mediaInfo')}
      description={item.name}
      badge={<Info size={20} />}
      onClose={onClose}
      wide
      t={t}
      footer={
        <>
          <span className="truncate text-[9.5px] text-[var(--muted)]" title={item.path}>
            {item.path}
          </span>
          <button type="button" className="btn-ghost h-9 px-4 text-[11px] font-bold" onClick={onClose}>
            {t('close')}
          </button>
        </>
      }
    >
      {!info && !error ? (
        <div className="flex items-center justify-center gap-2 py-10 text-[11px] text-[var(--muted)]">
          <Loader size={16} className="animate-spin" />
          {t('loading')}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-[11px] text-red-300">
          {t('probeFailed')}: {error}
        </div>
      ) : null}

      {info ? (
        <div className="space-y-4">
          <section>
            <h3 className="mb-2 text-[10px] font-extrabold uppercase tracking-widest text-[var(--accent)]">
              {t('generalInfo')}
            </h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[
                [t('formatLabel'), info.formatName || '—'],
                [t('durationLabel'), formatTime(info.duration)],
                [t('fileSize'), formatBytes(info.size)],
                [t('bitrate'), formatBitrate(info.bitrate)],
                [t('streams'), String(info.streams.length)],
                [t('fileLabel'), item.type]
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border px-2.5 py-2" style={{ borderColor: 'var(--border)' }}>
                  <div className="text-[9px] font-bold text-[var(--muted)]">{label}</div>
                  <div className="truncate text-[11px] font-semibold" title={value}>
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-[10px] font-extrabold uppercase tracking-widest text-[var(--accent)]">
              {t('streams')}
            </h3>
            {info.streams.length === 0 ? (
              <div className="text-[11px] text-[var(--muted)]">{t('noStreams')}</div>
            ) : (
              <div className="space-y-2">
                {info.streams.map((stream, index) => (
                  <div
                    key={`${stream.type}-${index}`}
                    className="rounded-xl border px-3 py-2"
                    style={{ borderColor: 'var(--border)', background: 'var(--panel-2)' }}
                  >
                    <div className="mb-1.5 flex items-center gap-1.5">
                      <span className="rounded-md bg-[var(--accent-soft)] px-1.5 py-0.5 text-[9px] font-extrabold text-[var(--accent)]">
                        {streamLabel(stream.type)}
                      </span>
                      <span className="text-[11px] font-bold">{stream.codec || '—'}</span>
                      {stream.language ? (
                        <span className="text-[9px] text-[var(--muted)]">({stream.language})</span>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[9.5px] text-[var(--muted)]">
                      {stream.width && stream.height ? (
                        <span>
                          {t('resolution')}: {stream.width}×{stream.height}
                        </span>
                      ) : null}
                      {stream.bitrate ? (
                        <span>
                          {t('bitrate')}: {formatBitrate(stream.bitrate)}
                        </span>
                      ) : null}
                      {stream.sampleRate ? (
                        <span>
                          {t('sampleRate')}: {stream.sampleRate} Hz
                        </span>
                      ) : null}
                      {stream.channels ? (
                        <span>
                          {t('channels')}: {stream.channels}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="flex items-center gap-1.5 text-[9px] text-[var(--muted)]">
            <Camera size={11} />
            {t('engine')}: {info.streams.some((stream) => stream.type === 'video') ? 'FFmpeg' : 'FFmpeg'}
          </div>
        </div>
      ) : null}
    </Shell>
  )
}

export const ToolIcons = { Gif, Scissors, Convert, Film, Layers }
