import { useEffect, useRef, useState } from 'react'
import type { DragEvent, ReactElement, SyntheticEvent } from 'react'
import type { MediaItem, Settings } from '../../../shared/types'
import type { TFunction } from '../i18n'
import { cn, isRemoteUrl, mediaUrl } from '../utils'
import {
  Alert,
  External,
  Folder,
  Globe,
  Image,
  Loader,
  Music,
  Pause,
  Play,
  Rotate,
  Sparkles,
  ZoomIn,
  ZoomOut
} from './Icons'

interface PlayerProps {
  item: MediaItem | null
  settings: Settings
  subtitleText: string
  subtitleEnabled: boolean
  resumeAt: number
  volume: number
  muted: boolean
  mini: boolean
  imageZoom: number
  imageRotation: number
  playbackPath: string | null
  preparing: number | null
  onElement: (element: HTMLMediaElement | null) => void
  onTimeUpdate: (time: number) => void
  onDuration: (duration: number) => void
  onPlayingChange: (playing: boolean) => void
  onEnded: () => void
  onError: (message: string) => void
  onDropFiles: (paths: string[]) => void
  onTogglePlay: () => void
  onOpenFile: () => void
  onOpenFolder: () => void
  onOpenUrl: () => void
  onToggleFullscreen: () => void
  onZoom: (delta: number) => void
  onRotate: () => void
  onResetImage: () => void
  onOpenSystem: () => void
  onCancelPrepare: () => void
  t: TFunction
}

export default function Player(props: PlayerProps): ReactElement {
  const { item, settings, t } = props
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const dragDepth = useRef(0)
  const appliedResume = useRef<string>('')
  const [dragOver, setDragOver] = useState(false)
  const [waiting, setWaiting] = useState(false)
  const [failed, setFailed] = useState(false)

  const src = item ? mediaUrl(props.playbackPath || item.path) : ''
  // روابط الشبكة غالباً لا ترسل رؤوس CORS — لا نطلب مصادقة/مشاركة لتفادي فشل التشغيل.
  const crossOrigin = isRemoteUrl(src) ? undefined : 'anonymous'

  useEffect(() => {
    appliedResume.current = ''
    setFailed(false)
    setWaiting(false)
  }, [src])

  useEffect(() => {
    setFailed(false)
    setWaiting(false)
    const element = item?.type === 'audio' ? audioRef.current : videoRef.current
    props.onElement(element)
    return () => props.onElement(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, item?.type])

  useEffect(() => {
    const element = item?.type === 'audio' ? audioRef.current : videoRef.current
    if (!element) return
    element.volume = Math.max(0, Math.min(1, props.volume))
    element.muted = props.muted
  }, [props.volume, props.muted, src, item?.type])

  const handleLoaded = (element: HTMLMediaElement): void => {
    setWaiting(false)
    props.onDuration(Number.isFinite(element.duration) ? element.duration : 0)
    if (
      item &&
      props.resumeAt > 2 &&
      appliedResume.current !== item.path &&
      (!Number.isFinite(element.duration) || props.resumeAt < element.duration - 3)
    ) {
      appliedResume.current = item.path
      try {
        element.currentTime = props.resumeAt
      } catch {
        /* ignore */
      }
    }
  }

  const onDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault()
    event.stopPropagation()
    dragDepth.current = 0
    setDragOver(false)
    const paths = Array.from(event.dataTransfer.files)
      .map((file) => window.tayfAPI.getPathForFile(file))
      .filter(Boolean)
    if (paths.length > 0) props.onDropFiles(paths)
  }

  const stageHandlers = {
    onDragEnter: (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      dragDepth.current += 1
      setDragOver(true)
    },
    onDragOver: (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      event.dataTransfer.dropEffect = 'copy'
    },
    onDragLeave: (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      dragDepth.current = Math.max(0, dragDepth.current - 1)
      if (dragDepth.current === 0) setDragOver(false)
    },
    onDrop
  }

  const mediaEvents = {
    onLoadedMetadata: (event: SyntheticEvent<HTMLMediaElement>) => handleLoaded(event.currentTarget),
    onDurationChange: (event: SyntheticEvent<HTMLMediaElement>) =>
      props.onDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0),
    onTimeUpdate: (event: SyntheticEvent<HTMLMediaElement>) => props.onTimeUpdate(event.currentTarget.currentTime),
    onPlay: () => props.onPlayingChange(true),
    onPause: () => props.onPlayingChange(false),
    onWaiting: () => setWaiting(true),
    onPlaying: () => setWaiting(false),
    onCanPlay: () => setWaiting(false),
    onEnded: () => props.onEnded(),
    onError: () => {
      setFailed(true)
      setWaiting(false)
      props.onError(t('playbackError'))
    }
  }

  return (
    <div
      className={cn('stage relative flex min-h-0 flex-1 items-center justify-center overflow-hidden', props.mini && 'rounded-none')}
      {...stageHandlers}
    >
      {!item ? (
        <div className="flex max-w-md flex-col items-center gap-5 px-8 text-center">
          <div
            className="flex h-20 w-20 items-center justify-center rounded-3xl text-black shadow-2xl"
            style={{ background: 'linear-gradient(135deg, var(--accent), #38bdf8)' }}
          >
            <Sparkles size={38} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">{t('appName')}</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">{t('tagline')}</p>
          </div>
          <p className="text-[13px] text-[var(--muted)]">{t('dropHint')}</p>
          <div className="flex items-center gap-2">
            <button type="button" className="btn-primary px-5 py-2 text-sm" onClick={props.onOpenFile}>
              {t('openFile')}
            </button>
            <button type="button" className="btn-ghost px-4 py-2 text-sm" onClick={props.onOpenFolder}>
              {t('openFolder')}
            </button>
            <button
              type="button"
              className="btn-ghost inline-flex items-center gap-2 px-4 py-2 text-sm"
              onClick={props.onOpenUrl}
              data-testid="open-url-start"
            >
              <Globe size={16} />
              {t('openUrl')}
            </button>
          </div>
          <div className="text-[10px] tracking-wide text-[var(--muted)]">{t('supportedFormats')}</div>
        </div>
      ) : null}

      {item?.type === 'video' ? (
        <video
          key={src}
          ref={videoRef}
          src={src}
          className="max-h-full max-w-full bg-black object-contain"
          style={{ width: '100%', height: '100%' }}
          crossOrigin={crossOrigin}
          playsInline
          autoPlay={settings.autoPlay}
          preload="auto"
          onClick={props.onTogglePlay}
          onDoubleClick={props.onToggleFullscreen}
          {...mediaEvents}
        />
      ) : null}

      {item?.type === 'audio' ? (
        <div className="flex w-full max-w-lg flex-col items-center gap-6 rounded-3xl border border-[var(--border)] bg-[var(--panel)]/85 p-8 shadow-2xl backdrop-blur">
          <div className="relative flex h-36 w-36 items-center justify-center rounded-full bg-[var(--accent-soft)]">
            <Music size={56} style={{ color: 'var(--accent)' }} />
            <span className="absolute inset-0 animate-ping rounded-full border border-[var(--accent)]/30" />
          </div>
          <div className="min-w-0 text-center">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
              {t('nowPlaying')}
            </div>
            <h2 className="truncate text-lg font-bold" title={item.name}>
              {item.name}
            </h2>
          </div>
          <div className="flex h-10 items-end gap-1.5">
            {[0.35, 0.7, 0.5, 0.95, 0.6, 0.8, 0.4, 0.75, 0.55].map((height, index) => (
              <span
                key={index}
                className="eq-bar w-1.5 rounded-full"
                style={{
                  height: `${height * 100}%`,
                  background: 'var(--accent)',
                  animationDelay: `${index * 0.11}s`
                }}
              />
            ))}
          </div>
          <audio
            key={src}
            ref={audioRef}
            src={src}
            className="hidden"
            crossOrigin={crossOrigin}
            autoPlay={settings.autoPlay}
            preload="auto"
            {...mediaEvents}
          />
        </div>
      ) : null}

      {item?.type === 'image' ? (
        <div className="relative flex h-full w-full items-center justify-center overflow-hidden p-4">
          <img
            key={item.path}
            src={mediaUrl(item.path)}
            alt={item.name}
            draggable={false}
            className="max-h-full max-w-full rounded-lg object-contain shadow-2xl transition-transform duration-200"
            style={{ transform: `scale(${props.imageZoom}) rotate(${props.imageRotation}deg)` }}
          />
          <div className="absolute start-4 top-4 flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--panel)]/85 p-1 backdrop-blur">
            <button
              type="button"
              className="btn-icon h-8 w-8"
              title={t('zoomOut')}
              onClick={() => props.onZoom(-0.2)}
            >
              <ZoomOut size={16} />
            </button>
            <span className="w-12 text-center text-[11px] font-semibold text-[var(--muted)]">
              {Math.round(props.imageZoom * 100)}%
            </span>
            <button type="button" className="btn-icon h-8 w-8" title={t('zoomIn')} onClick={() => props.onZoom(0.2)}>
              <ZoomIn size={16} />
            </button>
            <div className="mx-1 h-5 w-px bg-[var(--border)]" />
            <button type="button" className="btn-icon h-8 w-8" title={t('rotate')} onClick={props.onRotate}>
              <Rotate size={16} />
            </button>
            <button
              type="button"
              className="btn-icon h-8 w-8"
              title={t('resetImage')}
              onClick={props.onResetImage}
            >
              <Image size={16} />
            </button>
          </div>
        </div>
      ) : null}

      {item?.type === 'video' && props.subtitleEnabled && props.subtitleText ? (
        <div
          className="subtitle-layer"
          style={{
            fontSize: `${Math.max(14, settings.subtitleFontSize)}px`,
            padding: '0.15em 0.6em',
            borderRadius: 8,
            background: 'rgba(0,0,0,0.35)',
            width: 'fit-content',
            margin: '0 auto'
          }}
        >
          {props.subtitleText}
        </div>
      ) : null}

      {waiting && item ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-xs font-semibold text-white backdrop-blur">
            <Loader size={15} className="animate-spin" />
            {t('buffering')}
          </div>
        </div>
      ) : null}

      {failed && item && props.preparing === null ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 p-6 text-center backdrop-blur-sm">
          <Alert size={34} style={{ color: '#f59e0b' }} />
          <div className="text-sm font-bold">{t('playbackError')}</div>
          <div className="max-w-sm text-xs text-white/70">{t('unsupportedFormat')}</div>
          <button type="button" className="btn-primary mt-1 px-4 py-2 text-xs" onClick={props.onOpenSystem}>
            <span className="inline-flex items-center gap-2">
              <External size={14} />
              {t('openWithSystem')}
            </span>
          </button>
        </div>
      ) : null}

      {item && props.preparing !== null ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/75 p-6 backdrop-blur-sm">
          <div
            className="w-full max-w-sm rounded-2xl border p-5 text-center"
            style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}
          >
            <div className="mb-2 flex items-center justify-center gap-2 text-[13px] font-extrabold">
              <Loader size={16} className="animate-spin" style={{ color: 'var(--accent)' }} />
              {t('compatTitle')}
            </div>
            <div className="mb-2 text-[10px] leading-relaxed text-[var(--muted)]">{t('compatHint')}</div>
            <div className="mb-1 flex items-center justify-between text-[10px] font-bold text-[var(--muted)]">
              <span>{t('progress')}</span>
              <span className="tabular-nums">{Math.round(props.preparing)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--border)]">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${Math.max(0, Math.min(100, props.preparing))}%`, background: 'var(--accent)' }}
              />
            </div>
            <button
              type="button"
              className="btn-ghost mt-4 h-8 px-4 text-[10.5px] font-bold"
              onClick={props.onCancelPrepare}
            >
              {t('cancelPrepare')}
            </button>
          </div>
        </div>
      ) : null}

      {dragOver ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 border-4 border-dashed border-[var(--accent)]/70 bg-black/60 text-center backdrop-blur-sm">
          <Folder size={44} style={{ color: 'var(--accent)' }} />
          <div className="text-lg font-extrabold">{t('dropHere')}</div>
          <div className="text-xs text-white/70">{t('dropHint')}</div>
        </div>
      ) : null}
    </div>
  )
}
