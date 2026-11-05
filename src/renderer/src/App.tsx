import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ReactElement } from 'react'
import type {
  AppVersion,
  MediaItem,
  OpenMediaResult,
  RecentItem,
  Settings,
  SubtitlePayload,
  ToolKind
} from '../../shared/types'
import { makeT } from './i18n'
import { activeCue, parseSubtitle, type SubtitleCue } from './subtitles'
import { baseNameNoExt, clamp, formatTime, isRemoteUrl } from './utils'
import TitleBar from './components/TitleBar'
import Player from './components/Player'
import Controls from './components/Controls'
import Playlist from './components/Playlist'
import SettingsModal from './components/SettingsModal'
import UrlModal from './components/UrlModal'
import { InfoModal, ToolModal } from './components/ToolModals'
import { Alert, CheckCircle, X } from './components/Icons'

const DEFAULT_SETTINGS: Settings = {
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

const SUBTITLE_EXT = ['.srt', '.vtt', '.ass', '.ssa', '.sub']

type ModalKind = 'settings' | 'info' | 'url' | ToolKind | null

interface ToastItem {
  id: number
  text: string
  tone: 'ok' | 'error'
}

function isToolKind(value: ModalKind): value is ToolKind {
  return value === 'gif' || value === 'clip' || value === 'convert' || value === 'join'
}

function isSubtitlePath(filePath: string): boolean {
  const lower = filePath.toLowerCase()
  return SUBTITLE_EXT.some((ext) => lower.endsWith(ext))
}

function hexToSoft(hex: string, alpha = 0.16): string {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim())
  if (!match) return `rgba(16, 185, 129, ${alpha})`
  return `rgba(${Number.parseInt(match[1], 16)}, ${Number.parseInt(match[2], 16)}, ${Number.parseInt(match[3], 16)}, ${alpha})`
}

export default function App(): ReactElement {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [files, setFiles] = useState<MediaItem[]>([])
  const [index, setIndex] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(DEFAULT_SETTINGS.volume)
  const [muted, setMuted] = useState(false)
  const [rate, setRate] = useState(1)
  const [playlistOpen, setPlaylistOpen] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [mini, setMini] = useState(false)
  const [pinned, setPinned] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)
  const [cues, setCues] = useState<SubtitleCue[]>([])
  const [subtitleName, setSubtitleName] = useState('')
  const [subtitleEnabled, setSubtitleEnabled] = useState(true)
  const [resumeAt, setResumeAt] = useState(0)
  const [imageZoom, setImageZoom] = useState(1)
  const [imageRotation, setImageRotation] = useState(0)
  const [modal, setModal] = useState<ModalKind>(null)
  const [recent, setRecent] = useState<RecentItem[]>([])
  const [version, setVersion] = useState<AppVersion | null>(null)
  const [ffmpegReady, setFfmpegReady] = useState(false)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [loaded, setLoaded] = useState(false)
  const [playbackPath, setPlaybackPath] = useState<string | null>(null)
  const [preparing, setPreparing] = useState<number | null>(null)

  const mediaElRef = useRef<HTMLMediaElement | null>(null)
  const positionsRef = useRef<Record<string, number>>({})
  const currentPathRef = useRef('')
  const currentItemRef = useRef<MediaItem | null>(null)
  const filesRef = useRef<MediaItem[]>([])
  const indexRef = useRef(-1)
  const settingsRef = useRef(settings)
  const volumeRef = useRef(volume)
  const mutedRef = useRef(muted)
  const rateRef = useRef(rate)
  const durationRef = useRef(0)
  const fullscreenRef = useRef(false)
  const errorPathRef = useRef('')
  const persistTimer = useRef<number | undefined>(undefined)
  const pendingPatch = useRef<Partial<Settings>>({})
  const prepareIdRef = useRef('')
  const compatTriedRef = useRef<Set<string>>(new Set())

  const currentItem = index >= 0 ? files[index] ?? null : null
  const t = useMemo(() => makeT(settings.language), [settings.language])

  currentItemRef.current = currentItem
  filesRef.current = files
  indexRef.current = index
  settingsRef.current = settings
  volumeRef.current = volume
  mutedRef.current = muted
  rateRef.current = rate
  durationRef.current = duration
  fullscreenRef.current = isFullscreen

  const pushToast = (text: string, tone: 'ok' | 'error' = 'ok'): void => {
    const id = Date.now() + Math.random()
    setToasts((previous) => [...previous, { id, text, tone }])
    window.setTimeout(() => {
      setToasts((previous) => previous.filter((toast) => toast.id !== id))
    }, 3600)
  }

  const refreshRecent = (): void => {
    window.tayfAPI
      .getRecent()
      .then(setRecent)
      .catch(() => undefined)
  }

  const recordRecent = (item: MediaItem, position: number, length: number): void => {
    window.tayfAPI
      .addRecent({
        path: item.path,
        name: item.name,
        type: item.type,
        position: Math.max(0, Math.floor(position)),
        duration: Math.max(0, Math.floor(length)),
        lastPlayed: Date.now()
      })
      .then(refreshRecent)
      .catch(() => undefined)
  }

  const saveCurrentPosition = (): void => {
    const element = mediaElRef.current
    const item = currentItemRef.current
    if (!element || !item || !settingsRef.current.rememberPosition) return
    if (!Number.isFinite(element.currentTime) || element.currentTime < 3) return
    positionsRef.current[item.path] = element.currentTime
    window.tayfAPI.setPosition(item.path, element.currentTime).catch(() => undefined)
  }

  const cancelPreparation = (notify = false): void => {
    if (!prepareIdRef.current) return
    void window.tayfAPI.cancelPrepare(prepareIdRef.current)
    prepareIdRef.current = ''
    setPreparing(null)
    if (notify) pushToast(t('compatCanceled'))
  }

  const tryCompatiblePlayback = async (): Promise<void> => {
    const item = currentItemRef.current
    if (!item || item.type === 'image') return
    if (compatTriedRef.current.has(item.path)) return
    if (!ffmpegReady) {
      pushToast(t('compatFailed'), 'error')
      return
    }
    compatTriedRef.current.add(item.path)
    const element = mediaElRef.current
    if (element && Number.isFinite(element.currentTime) && element.currentTime > 1) {
      setResumeAt(element.currentTime)
    }
    const id = `prepare-${Date.now()}-${Math.random().toString(36).slice(2)}`
    prepareIdRef.current = id
    setPreparing(0)
    pushToast(t('compatPreparing'))
    try {
      const result = await window.tayfAPI.preparePlayback(id, item.path)
      if (prepareIdRef.current !== id) return
      prepareIdRef.current = ''
      if (!result.ok || !result.path) {
        setPreparing(null)
        if (!result.canceled) {
          pushToast(result.error ? `${t('compatFailed')}: ${result.error}` : t('compatFailed'), 'error')
        }
        return
      }
      setPlaybackPath(result.path)
      setPreparing(null)
      pushToast(t('compatReady'))
    } catch (err) {
      if (prepareIdRef.current !== id) return
      prepareIdRef.current = ''
      setPreparing(null)
      pushToast(String(err), 'error')
    }
  }

  const activate = (list: MediaItem[], target: number): void => {
    const item = list[target]
    if (!item) return
    saveCurrentPosition()
    cancelPreparation()
    setPlaybackPath(null)
    compatTriedRef.current.delete(item.path)
    currentPathRef.current = item.path
    errorPathRef.current = ''
    const position = settingsRef.current.rememberPosition ? positionsRef.current[item.path] ?? 0 : 0
    setIndex(target)
    setCurrentTime(0)
    setDuration(0)
    setPlaying(false)
    setResumeAt(position)
    setCues([])
    setSubtitleName('')
    setSubtitleEnabled(true)
    setImageZoom(1)
    setImageRotation(0)
    const preferredRate = settingsRef.current.keepPlaybackRate ? settingsRef.current.playbackRate : 1
    setRate(preferredRate)
    rateRef.current = preferredRate
    if (mediaElRef.current) {
      mediaElRef.current.playbackRate = preferredRate
      mediaElRef.current.currentTime = 0
    }
    recordRecent(item, position, 0)
  }

  const applyOpen = (result: OpenMediaResult): void => {
    if (!result.files.length) {
      pushToast(t('noSupportedFiles'), 'error')
      return
    }
    const target = result.currentPath ? result.files.findIndex((file) => file.path === result.currentPath) : 0
    setFiles(result.files)
    activate(result.files, Math.max(0, target))
    pushToast(t('openedFiles', { count: result.files.length }))
  }

  const openDialog = async (): Promise<void> => {
    try {
      applyOpen(await window.tayfAPI.openMedia())
    } catch (err) {
      pushToast(String(err), 'error')
    }
  }

  const openFolderDialog = async (mode: 'replace' | 'append'): Promise<void> => {
    try {
      const result = await window.tayfAPI.openFolder()
      if (mode === 'replace') {
        applyOpen(result)
        return
      }
      if (!result.files.length) {
        pushToast(t('noSupportedFiles'), 'error')
        return
      }
      const merged = [...filesRef.current]
      for (const file of result.files) if (!merged.some((entry) => entry.path === file.path)) merged.push(file)
      setFiles(merged)
      if (!currentItemRef.current) activate(merged, 0)
      else pushToast(t('addedToQueue'))
    } catch (err) {
      pushToast(String(err), 'error')
    }
  }

  const openUrl = async (raw: string): Promise<string | null> => {
    try {
      const result = await window.tayfAPI.resolveUrl(raw)
      if (result.error || !result.item) return result.error || t('urlOpenFailed')
      const item = result.item
      const existing = filesRef.current.findIndex((file) => file.path === item.path)
      const list = existing >= 0 ? filesRef.current : [...filesRef.current, item]
      setFiles(list)
      activate(list, existing >= 0 ? existing : list.length - 1)
      setModal(null)
      return null
    } catch (err) {
      return err instanceof Error ? err.message : String(err)
    }
  }

  const addPaths = async (paths: string[], switchToFirst: boolean): Promise<void> => {
    if (paths.length === 0) return
    try {
      const result = await window.tayfAPI.fromPaths(paths)
      if (!result.files.length) {
        pushToast(t('noSupportedFiles'), 'error')
        return
      }
      const current = filesRef.current
      const merged = [...current]
      for (const file of result.files) if (!merged.some((entry) => entry.path === file.path)) merged.push(file)
      setFiles(merged)
      if (switchToFirst || current.length === 0) {
        const target = merged.findIndex((entry) => entry.path === result.files[0].path)
        activate(merged, Math.max(0, target))
      } else {
        pushToast(t('addedToQueue'))
      }
    } catch (err) {
      pushToast(String(err), 'error')
    }
  }

  const pickAndAdd = async (): Promise<void> => {
    const picked = await window.tayfAPI.pickFiles()
    if (picked.length > 0) await addPaths(picked, false)
  }

  const applySubtitlePayload = (payload: SubtitlePayload): void => {
    setCues(parseSubtitle(payload.text, payload.kind))
    setSubtitleName(payload.name)
    setSubtitleEnabled(true)
    pushToast(t('subtitleLoaded', { name: payload.name }))
  }

  const loadSubtitlePath = async (filePath: string): Promise<void> => {
    try {
      const payload = await window.tayfAPI.readSubtitle(filePath)
      if ('error' in payload) pushToast(payload.error, 'error')
      else applySubtitlePayload(payload)
    } catch (err) {
      pushToast(String(err), 'error')
    }
  }

  const addSubtitle = async (): Promise<void> => {
    const payload = await window.tayfAPI.openSubtitle()
    if (!payload) return
    if ('error' in payload) pushToast(payload.error, 'error')
    else applySubtitlePayload(payload)
  }

  const handleDrop = async (paths: string[]): Promise<void> => {
    const subtitles = paths.filter(isSubtitlePath)
    const media = paths.filter((path) => !isSubtitlePath(path))
    if (subtitles.length > 0) {
      if (currentItemRef.current?.type === 'video') await loadSubtitlePath(subtitles[0])
      else pushToast(t('noMedia'), 'error')
    }
    if (media.length > 0) await addPaths(media, true)
  }

  const togglePlay = (): void => {
    const element = mediaElRef.current
    if (!element) {
      if (filesRef.current.length === 0) void openDialog()
      return
    }
    if (element.paused || element.ended) {
      element.play().catch(() => pushToast(t('playbackError'), 'error'))
    } else {
      element.pause()
    }
  }

  const seekTo = (value: number): void => {
    const element = mediaElRef.current
    if (!element) return
    const max = Number.isFinite(element.duration) ? element.duration : durationRef.current
    const next = clamp(value, 0, Math.max(0, max || 0))
    try {
      element.currentTime = next
      setCurrentTime(next)
    } catch {
      /* not ready */
    }
  }

  const seekBy = (delta: number): void => {
    const element = mediaElRef.current
    if (!element) return
    seekTo(element.currentTime + delta)
  }

  // خطوة إطار واحد (~1/30 ثانية) — تتوقف وسائط HTML لا تملك معدل إطارات معروف.
  const stepFrame = (direction: 1 | -1): void => {
    const element = mediaElRef.current
    if (!element) return
    if (currentItemRef.current?.type !== 'video') return
    if (!element.paused) element.pause()
    const max = Number.isFinite(element.duration) ? element.duration : durationRef.current
    const next = clamp(element.currentTime + direction / 30, 0, Math.max(0, max || 0))
    try {
      element.currentTime = next
      setCurrentTime(next)
    } catch {
      /* not ready */
    }
  }

  const goNext = (): void => {
    const list = filesRef.current
    if (list.length === 0) return
    const current = indexRef.current
    if (settingsRef.current.shuffle && list.length > 1) {
      let target = current
      while (target === current) target = Math.floor(Math.random() * list.length)
      activate(list, target)
      return
    }
    if (current < list.length - 1) activate(list, current + 1)
    else if (settingsRef.current.repeat === 'all') activate(list, 0)
  }

  const goPrevious = (): void => {
    const list = filesRef.current
    if (list.length === 0) return
    const current = indexRef.current
    if (current > 0) activate(list, current - 1)
    else if (settingsRef.current.repeat === 'all') activate(list, list.length - 1)
  }

  const handleEnded = (): void => {
    saveCurrentPosition()
    const item = currentItemRef.current
    if (item) recordRecent(item, durationRef.current, durationRef.current)
    if (settingsRef.current.repeat === 'one') {
      const element = mediaElRef.current
      if (element) {
        element.currentTime = 0
        element.play().catch(() => undefined)
      }
      return
    }
    const list = filesRef.current
    const current = indexRef.current
    const repeat = settingsRef.current.repeat
    if (settingsRef.current.shuffle && list.length > 1) {
      goNext()
      return
    }
    if (current < list.length - 1) activate(list, current + 1)
    else if (repeat === 'all') activate(list, 0)
    else setPlaying(false)
  }

  const removeAt = (target: number): void => {
    const list = filesRef.current
    if (target < 0 || target >= list.length) return
    saveCurrentPosition()
    const nextFiles = list.filter((_, position) => position !== target)
    setFiles(nextFiles)
    if (nextFiles.length === 0) {
      cancelPreparation()
      setPlaybackPath(null)
      setPreparing(null)
      setIndex(-1)
      setCurrentTime(0)
      setDuration(0)
      setPlaying(false)
      setCues([])
      setResumeAt(0)
      currentPathRef.current = ''
      return
    }
    if (target === indexRef.current) {
      activate(nextFiles, Math.min(target, nextFiles.length - 1))
    } else if (target < indexRef.current) {
      setIndex(indexRef.current - 1)
    }
    pushToast(t('removedFromQueue'))
  }

  const clearQueue = (): void => {
    saveCurrentPosition()
    cancelPreparation()
    setPlaybackPath(null)
    setPreparing(null)
    setFiles([])
    setIndex(-1)
    setCurrentTime(0)
    setDuration(0)
    setPlaying(false)
    setCues([])
    setResumeAt(0)
    setImageZoom(1)
    setImageRotation(0)
    currentPathRef.current = ''
  }

  const changeVolume = (value: number): void => {
    const next = clamp(value, 0, 1)
    setVolume(next)
    volumeRef.current = next
    if (next > 0 && muted) {
      setMuted(false)
      mutedRef.current = false
    }
    const element = mediaElRef.current
    if (element) {
      element.volume = next
      if (next > 0) element.muted = false
    }
    updateSettings({ volume: next })
  }

  const toggleMute = (): void => {
    const next = !mutedRef.current
    setMuted(next)
    mutedRef.current = next
    if (mediaElRef.current) mediaElRef.current.muted = next
  }

  const changeRate = (value: number): void => {
    setRate(value)
    rateRef.current = value
    if (mediaElRef.current) mediaElRef.current.playbackRate = value
    updateSettings({ playbackRate: value })
  }

  const updateSettings = (patch: Partial<Settings>): void => {
    const next = { ...settingsRef.current, ...patch }
    settingsRef.current = next
    setSettings(next)
    if (patch.volume !== undefined) {
      setVolume(patch.volume)
      volumeRef.current = patch.volume
      if (mediaElRef.current) {
        mediaElRef.current.volume = patch.volume
        if (patch.volume > 0) {
          mediaElRef.current.muted = false
          setMuted(false)
          mutedRef.current = false
        }
      }
    }
    if (patch.showPlaylist !== undefined) setPlaylistOpen(patch.showPlaylist)
    pendingPatch.current = { ...pendingPatch.current, ...patch }
    window.clearTimeout(persistTimer.current)
    persistTimer.current = window.setTimeout(() => {
      const payload = pendingPatch.current
      pendingPatch.current = {}
      window.tayfAPI.setSettings(payload).catch(() => undefined)
    }, 350)
  }

  const resetSettings = (): void => {
    settingsRef.current = { ...DEFAULT_SETTINGS }
    setSettings({ ...DEFAULT_SETTINGS })
    setVolume(DEFAULT_SETTINGS.volume)
    volumeRef.current = DEFAULT_SETTINGS.volume
    setPlaylistOpen(DEFAULT_SETTINGS.showPlaylist)
    setRate(DEFAULT_SETTINGS.playbackRate)
    rateRef.current = DEFAULT_SETTINGS.playbackRate
    if (mediaElRef.current) mediaElRef.current.playbackRate = DEFAULT_SETTINGS.playbackRate
    setMuted(false)
    mutedRef.current = false
    if (mediaElRef.current) {
      mediaElRef.current.volume = DEFAULT_SETTINGS.volume
      mediaElRef.current.muted = false
    }
    pendingPatch.current = {}
    window.tayfAPI.setSettings({ ...DEFAULT_SETTINGS }).catch(() => undefined)
    pushToast(t('settingsSaved'))
  }

  const cycleRepeat = (): void => {
    const order: Settings['repeat'][] = ['off', 'all', 'one']
    const next = order[(order.indexOf(settingsRef.current.repeat) + 1) % order.length]
    updateSettings({ repeat: next })
  }

  const adjustSubtitleDelay = (delta: number): void => {
    const next = Math.round((settingsRef.current.subtitleDelay + delta) * 10) / 10
    updateSettings({ subtitleDelay: clamp(next, -30, 30) })
  }

  const toggleSubtitle = (): void => {
    if (cues.length === 0) {
      if (currentItemRef.current?.type === 'video') void addSubtitle()
      return
    }
    setSubtitleEnabled((value) => !value)
  }

  const snapshot = async (): Promise<void> => {
    const item = currentItemRef.current
    const element = mediaElRef.current
    if (!item || item.type !== 'video' || !element) return
    const video = element as HTMLVideoElement
    if (!video.videoWidth || !video.videoHeight) {
      pushToast(t('snapshotFailed'), 'error')
      return
    }
    try {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const context = canvas.getContext('2d')
      if (!context) throw new Error('canvas')
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL('image/png')
      const result = await window.tayfAPI.saveSnapshot(dataUrl, baseNameNoExt(item.name))
      if (result.ok && result.path) pushToast(t('snapshotSaved', { path: result.path }))
      else pushToast(result.error || t('snapshotFailed'), 'error')
    } catch {
      pushToast(t('snapshotFailed'), 'error')
    }
  }

  const toggleFullscreen = async (): Promise<void> => {
    try {
      if (mini) {
        setMini(false)
        await window.tayfAPI.setMiniMode(false)
      }
      setIsFullscreen(await window.tayfAPI.toggleFullscreen())
    } catch {
      /* ignore */
    }
  }

  const toggleMini = async (): Promise<void> => {
    const next = !mini
    try {
      if (isFullscreen) {
        await window.tayfAPI.toggleFullscreen()
        setIsFullscreen(false)
      }
      await window.tayfAPI.setMiniMode(next)
      setMini(next)
    } catch {
      /* ignore */
    }
  }

  const togglePin = async (): Promise<void> => {
    const next = !pinned
    await window.tayfAPI.setAlwaysOnTop(next)
    setPinned(next)
  }

  const pickSnapshotDir = async (): Promise<void> => {
    const dir = await window.tayfAPI.pickSnapshotDir()
    if (!dir) return
    updateSettings({ snapshotDir: dir })
    pushToast(t('snapshotDirSet', { path: dir }))
  }

  const clearRecent = (): void => {
    window.tayfAPI.clearRecent().then(() => {
      setRecent([])
      pushToast(t('done'))
    })
  }

  const openRecent = async (item: RecentItem): Promise<void> => {
    if (isRemoteUrl(item.path)) {
      const failure = await openUrl(item.path)
      if (failure) pushToast(failure, 'error')
      return
    }
    await addPaths([item.path], true)
  }

  const onElement = (element: HTMLMediaElement | null): void => {
    mediaElRef.current = element
    if (!element) return
    element.volume = volumeRef.current
    element.muted = mutedRef.current
    element.playbackRate = rateRef.current
  }

  const onPlayingChange = (value: boolean): void => {
    setPlaying(value)
    if (!value) {
      saveCurrentPosition()
      const item = currentItemRef.current
      if (item) recordRecent(item, mediaElRef.current?.currentTime ?? 0, durationRef.current)
    }
  }

  const onError = (): void => {
    const item = currentItemRef.current
    if (!item || errorPathRef.current === item.path) return
    errorPathRef.current = item.path
    void tryCompatiblePlayback()
  }

  const closeModal = (): void => setModal(null)

  /* اختصارات لوحة المفاتيح */
  const keyboard = useRef({
    togglePlay,
    seekBy,
    stepFrame,
    changeVolume,
    toggleMute,
    toggleFullscreen,
    snapshot,
    openDialog,
    openUrlModal: () => setModal('url'),
    goNext,
    goPrevious,
    toggleSubtitle,
    adjustSubtitleDelay
  })
  keyboard.current = {
    togglePlay,
    seekBy,
    stepFrame,
    changeVolume,
    toggleMute,
    toggleFullscreen,
    snapshot,
    openDialog,
    openUrlModal: () => setModal('url'),
    goNext,
    goPrevious,
    toggleSubtitle,
    adjustSubtitleDelay
  }

  useEffect(() => {
    const handler = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement | null
      if (target && typeof target.closest === 'function' && target.closest('input, textarea, select, [contenteditable="true"]')) return
      const actions = keyboard.current
      if (event.ctrlKey || event.metaKey) {
        const key = event.key.toLowerCase()
        if (key === 'o') {
          event.preventDefault()
          void actions.openDialog()
        } else if (key === 'u') {
          event.preventDefault()
          actions.openUrlModal()
        }
        return
      }
      switch (event.code) {
        case 'Space':
          event.preventDefault()
          actions.togglePlay()
          break
        case 'ArrowRight':
          event.preventDefault()
          actions.seekBy(settingsRef.current.seekStep)
          break
        case 'ArrowLeft':
          event.preventDefault()
          actions.seekBy(-settingsRef.current.seekStep)
          break
        case 'ArrowUp':
          event.preventDefault()
          actions.changeVolume(volumeRef.current + 0.05)
          break
        case 'ArrowDown':
          event.preventDefault()
          actions.changeVolume(volumeRef.current - 0.05)
          break
        case 'KeyM':
          actions.toggleMute()
          break
        case 'KeyF':
        case 'F11':
          event.preventDefault()
          void actions.toggleFullscreen()
          break
        case 'Escape':
          if (fullscreenRef.current) void actions.toggleFullscreen()
          break
        case 'KeyS':
          void actions.snapshot()
          break
        case 'KeyO':
          void actions.openDialog()
          break
        case 'KeyN':
          actions.goNext()
          break
        case 'KeyP':
          actions.goPrevious()
          break
        case 'KeyL':
          updateSettings({ showPlaylist: !settingsRef.current.showPlaylist })
          break
        case 'KeyV':
          actions.toggleSubtitle()
          break
        case 'BracketLeft':
          actions.adjustSubtitleDelay(-0.1)
          break
        case 'BracketRight':
          actions.adjustSubtitleDelay(0.1)
          break
        case 'Comma':
          actions.stepFrame(-1)
          break
        case 'Period':
          actions.stepFrame(1)
          break
        default:
          break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = settings.theme
    root.dir = settings.language === 'ar' ? 'rtl' : 'ltr'
    root.lang = settings.language
    root.style.setProperty('--accent', settings.accent)
    root.style.setProperty('--accent-soft', hexToSoft(settings.accent))
  }, [settings.theme, settings.accent, settings.language])

  useEffect(() => {
    let alive = true
    void (async () => {
      const [loadedSettings, loadedRecent, loadedVersion, tools, positions] = await Promise.all([
        window.tayfAPI.getSettings().catch(() => DEFAULT_SETTINGS),
        window.tayfAPI.getRecent().catch(() => [] as RecentItem[]),
        window.tayfAPI.getVersion().catch(() => null),
        window.tayfAPI.toolsReady().catch(() => ({ ffmpeg: false })),
        window.tayfAPI.getPositions().catch(() => ({}))
      ])
      if (!alive) return
      settingsRef.current = loadedSettings
      setSettings(loadedSettings)
      setVolume(loadedSettings.volume)
      volumeRef.current = loadedSettings.volume
      setPlaylistOpen(loadedSettings.showPlaylist)
      setRecent(loadedRecent)
      setVersion(loadedVersion)
      setFfmpegReady(tools.ffmpeg)
      positionsRef.current = positions
      setLoaded(true)
      if (!tools.ffmpeg) pushToast(makeT(loadedSettings.language)('ffmpegMissingToast'), 'error')
      const initial = await window.tayfAPI.getInitialFile().catch(() => null)
      if (alive && initial) void addPaths([initial], true)
    })()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const unsubscribeState = window.tayfAPI.onWindowState((state) => setIsMaximized(state.maximized))
    const unsubscribeOpen = window.tayfAPI.onExternalOpen((filePath) => {
      void addPaths([filePath], true)
    })
    const unsubscribePrepare = window.tayfAPI.onPrepareProgress((event) => {
      if (event.id !== prepareIdRef.current) return
      setPreparing(Math.max(0, event.percent))
    })
    return () => {
      unsubscribeState()
      unsubscribeOpen()
      unsubscribePrepare()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const item = currentItem
    let alive = true
    setCues([])
    setSubtitleName('')
    if (!item || item.type !== 'video') return
    void (async () => {
      try {
        const found = await window.tayfAPI.findSubtitles(item.path)
        if (!alive || found.length === 0) return
        const payload = await window.tayfAPI.readSubtitle(found[0])
        if (!alive || 'error' in payload) return
        setCues(parseSubtitle(payload.text, payload.kind))
        setSubtitleName(payload.name)
        setSubtitleEnabled(true)
      } catch {
        /* ignore */
      }
    })()
    return () => {
      alive = false
    }
  }, [currentItem?.path])

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (mediaElRef.current && !mediaElRef.current.paused) saveCurrentPosition()
    }, 5000)
    const beforeUnload = (): void => saveCurrentPosition()
    window.addEventListener('beforeunload', beforeUnload)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('beforeunload', beforeUnload)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const subtitleText = useMemo(() => {
    if (!subtitleEnabled || currentItem?.type !== 'video' || cues.length === 0) return ''
    return activeCue(cues, currentTime - settings.subtitleDelay)?.text ?? ''
  }, [subtitleEnabled, currentItem?.type, cues, currentTime, settings.subtitleDelay])

  const title = currentItem ? currentItem.name : ''

  return (
    <div dir={settings.language === 'ar' ? 'rtl' : 'ltr'} className="app-shell" style={{ position: 'relative' }}>
      {!isFullscreen ? (
        <TitleBar
          title={title}
          isMaximized={isMaximized}
          pinned={pinned}
          mini={mini}
          seekStep={settings.seekStep}
          onOpenFile={() => void openDialog()}
          onOpenFolder={() => void openFolderDialog('replace')}
          onOpenUrl={() => setModal('url')}
          onTool={(kind) => setModal(kind)}
          onInfo={() => currentItem && setModal('info')}
          onSettings={() => setModal('settings')}
          onTogglePin={() => void togglePin()}
          onToggleMini={() => void toggleMini()}
          onMinimize={() => void window.tayfAPI.minimize()}
          onToggleMaximize={() => {
            void window.tayfAPI.toggleMaximize().then(setIsMaximized)
          }}
          onClose={() => void window.tayfAPI.close()}
          onFrameStep={stepFrame}
          onSeekStep={(value) => updateSettings({ seekStep: value })}
          t={t}
        />
      ) : null}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <main className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          <Player
            item={currentItem}
            settings={settings}
            subtitleText={subtitleText}
            subtitleEnabled={subtitleEnabled}
            resumeAt={resumeAt}
            volume={volume}
            muted={muted}
            mini={mini}
            imageZoom={imageZoom}
            imageRotation={imageRotation}
            playbackPath={playbackPath}
            preparing={preparing}
            onElement={onElement}
            onTimeUpdate={setCurrentTime}
            onDuration={(value) => {
              setDuration(value)
              durationRef.current = value
            }}
            onPlayingChange={onPlayingChange}
            onEnded={handleEnded}
            onError={onError}
            onDropFiles={(paths) => void handleDrop(paths)}
            onTogglePlay={togglePlay}
            onOpenFile={() => void openDialog()}
            onOpenFolder={() => void openFolderDialog('replace')}
            onOpenUrl={() => setModal('url')}
            onToggleFullscreen={() => void toggleFullscreen()}
            onZoom={(delta) => setImageZoom((value) => clamp(value + delta, 0.2, 6))}
            onRotate={() => setImageRotation((value) => (value + 90) % 360)}
            onResetImage={() => {
              setImageZoom(1)
              setImageRotation(0)
            }}
            onOpenSystem={() => currentItem && void window.tayfAPI.openPath(currentItem.path)}
            onCancelPrepare={() => cancelPreparation(true)}
            t={t}
          />
          <Controls
            item={currentItem}
            playing={playing}
            currentTime={currentTime}
            duration={duration}
            volume={volume}
            muted={muted}
            rate={rate}
            repeat={settings.repeat}
            shuffle={settings.shuffle}
            playlistOpen={playlistOpen}
            mini={mini}
            isFullscreen={isFullscreen}
            subtitleEnabled={subtitleEnabled}
            hasSubtitle={cues.length > 0}
            subtitleDelay={settings.subtitleDelay}
            seekStep={settings.seekStep}
            onTogglePlay={togglePlay}
            onPrevious={goPrevious}
            onNext={goNext}
            onSeek={seekTo}
            onSeekBy={seekBy}
            onVolume={changeVolume}
            onToggleMute={toggleMute}
            onRate={changeRate}
            onCycleRepeat={cycleRepeat}
            onToggleShuffle={() => updateSettings({ shuffle: !settings.shuffle })}
            onSnapshot={() => void snapshot()}
            onToggleSubtitle={toggleSubtitle}
            onAddSubtitle={() => void addSubtitle()}
            onSubtitleDelay={adjustSubtitleDelay}
            onTogglePlaylist={() => updateSettings({ showPlaylist: !playlistOpen })}
            onToggleFullscreen={() => void toggleFullscreen()}
            onToggleMini={() => void toggleMini()}
            t={t}
          />
        </main>

        {playlistOpen && !mini && !isFullscreen ? (
          <Playlist
            files={files}
            currentPath={currentItem?.path ?? null}
            recent={recent}
            locale={settings.language}
            onSelect={(target) => activate(filesRef.current, target)}
            onSelectRecent={(item) => void openRecent(item)}
            onRemove={removeAt}
            onClear={clearQueue}
            onAddFiles={() => void pickAndAdd()}
            onAddFolder={() => void openFolderDialog('append')}
            onReveal={(filePath) => void window.tayfAPI.reveal(filePath)}
            onClearRecent={clearRecent}
            onClose={() => updateSettings({ showPlaylist: false })}
            t={t}
          />
        ) : null}
      </div>

      {modal === 'settings' ? (
        <SettingsModal
          settings={settings}
          recentCount={recent.length}
          version={version}
          onPatch={updateSettings}
          onPickSnapshotDir={() => void pickSnapshotDir()}
          onClearRecent={clearRecent}
          onReset={resetSettings}
          onClose={closeModal}
          t={t}
        />
      ) : null}

      {modal === 'url' ? <UrlModal onOpen={openUrl} onClose={closeModal} t={t} /> : null}

      {modal === 'info' && currentItem ? <InfoModal item={currentItem} onClose={closeModal} t={t} /> : null}

      {isToolKind(modal) ? (
        <ToolModal
          key={modal}
          kind={modal}
          item={currentItem}
          files={files}
          currentTime={currentTime}
          duration={duration}
          ffmpegReady={ffmpegReady}
          onClose={closeModal}
          onPlayOutput={(output) => {
            closeModal()
            void addPaths([output], true)
          }}
          onReveal={(filePath) => void window.tayfAPI.reveal(filePath)}
          onOpenPath={(filePath) => void window.tayfAPI.openPath(filePath)}
          t={t}
        />
      ) : null}

      {!loaded ? (
        <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center bg-[var(--bg)]">
          <div className="flex flex-col items-center gap-3">
            <span
              className="flex h-14 w-14 items-center justify-center rounded-2xl text-black"
              style={{ background: 'linear-gradient(135deg, var(--accent), #38bdf8)' }}
            >
              <CheckCircle size={26} />
            </span>
            <span className="text-[11px] font-semibold text-[var(--muted)]">{t('loading')}</span>
          </div>
        </div>
      ) : null}

      <div className="pointer-events-none fixed bottom-24 left-1/2 z-[90] flex -translate-x-1/2 flex-col items-center gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="fade-in pointer-events-auto flex max-w-[70vw] items-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-semibold shadow-2xl"
            style={{
              borderColor: toast.tone === 'error' ? 'rgba(239,68,68,.45)' : 'var(--border)',
              background: 'var(--panel)',
              color: toast.tone === 'error' ? '#fca5a5' : 'var(--text)'
            }}
          >
            {toast.tone === 'error' ? (
              <Alert size={14} style={{ color: '#f87171' }} />
            ) : (
              <CheckCircle size={14} style={{ color: 'var(--accent)' }} />
            )}
            <span className="truncate" title={toast.text}>
              {toast.text}
            </span>
            <button
              type="button"
              className="btn-icon h-5 w-5 shrink-0"
              onClick={() => setToasts((previous) => previous.filter((entry) => entry.id !== toast.id))}
            >
              <X size={11} />
            </button>
          </div>
        ))}
      </div>

      <style>{`
        .eq-bar { animation: eqPulse 1.05s ease-in-out infinite alternate; transform-origin: bottom; }
        @keyframes eqPulse { from { transform: scaleY(0.35); opacity: .55 } to { transform: scaleY(1); opacity: 1 } }
        ${subtitleName ? '' : ''}
        ${''}
      `}</style>
    </div>
  )
}
