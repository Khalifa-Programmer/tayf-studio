export type MediaKind = 'video' | 'audio' | 'image'

export interface MediaItem {
  name: string
  path: string
  type: MediaKind
  size?: number
  duration?: number
}

export interface Settings {
  theme: 'dark' | 'light'
  language: 'ar' | 'en'
  accent: string
  volume: number
  rememberPosition: boolean
  autoPlay: boolean
  subtitleFontSize: number
  subtitleDelay: number
  snapshotDir: string
  repeat: 'off' | 'one' | 'all'
  shuffle: boolean
  showPlaylist: boolean
  seekStep: number
  playbackRate: number
  keepPlaybackRate: boolean
}

export interface UrlHistoryItem {
  url: string
  name: string
  lastUsed: number
}

export interface ResolveUrlResult {
  item?: MediaItem
  error?: string
}

export interface RecentItem {
  path: string
  name: string
  type: MediaKind
  position: number
  duration: number
  lastPlayed: number
}

export interface MediaInfo {
  duration: number
  size: number
  formatName: string
  bitrate: number
  streams: Array<{
    type: string
    codec: string
    width?: number
    height?: number
    sampleRate?: string
    channels?: number
    bitrate?: number
    language?: string
  }>
}

export type ToolKind = 'gif' | 'clip' | 'convert' | 'join'

export interface ToolRequest {
  kind: ToolKind
  input: string
  inputs?: string[]
  output?: string
  options: Record<string, string | number | boolean>
}

export interface ToolResult {
  ok: boolean
  output?: string
  error?: string
  canceled?: boolean
}

export interface ProgressEvent {
  id: string
  percent: number
  line?: string
}

export interface PrepareResult {
  ok: boolean
  path?: string
  error?: string
  canceled?: boolean
}

export interface SubtitlePayload {
  path: string
  name: string
  kind: 'srt' | 'vtt' | 'ass'
  text: string
}

export interface OpenMediaResult {
  files: MediaItem[]
  currentPath: string | null
}

export interface AppVersion {
  app: string
  electron: string
  chrome: string
  ffmpeg: boolean
}

export interface TayfAPI {
  openMedia(): Promise<OpenMediaResult>
  openFolder(): Promise<OpenMediaResult>
  fromPaths(paths: string[]): Promise<OpenMediaResult>
  pickFiles(): Promise<string[]>
  probe(file: string): Promise<MediaInfo | { error: string }>
  preparePlayback(id: string, file: string): Promise<PrepareResult>
  cancelPrepare(id: string): Promise<boolean>
  getPathForFile(file: File): string

  openSubtitle(): Promise<SubtitlePayload | { error: string } | null>
  readSubtitle(file: string): Promise<SubtitlePayload | { error: string }>
  findSubtitles(video: string): Promise<string[]>
  listSubtitles(video: string): Promise<string[]>

  getSettings(): Promise<Settings>
  setSettings(patch: Partial<Settings>): Promise<Settings>

  getRecent(): Promise<RecentItem[]>
  addRecent(item: RecentItem): Promise<void>
  clearRecent(): Promise<void>
  getUrlHistory(): Promise<UrlHistoryItem[]>
  addUrlHistory(url: string, name: string): Promise<UrlHistoryItem[]>
  clearUrlHistory(): Promise<void>
  resolveUrl(url: string): Promise<ResolveUrlResult>
  getPosition(file: string): Promise<number>
  getPositions(): Promise<Record<string, number>>
  setPosition(file: string, seconds: number): Promise<void>
  forgetPosition(file: string): Promise<void>

  minimize(): Promise<void>
  toggleMaximize(): Promise<boolean>
  close(): Promise<void>
  toggleFullscreen(): Promise<boolean>
  setAlwaysOnTop(value: boolean): Promise<boolean>
  setMiniMode(value: boolean): Promise<void>

  reveal(file: string): Promise<void>
  openPath(file: string): Promise<void>
  openExternal(url: string): Promise<void>
  saveSnapshot(dataUrl: string, name: string): Promise<{ ok: boolean; path?: string; error?: string }>
  pickSnapshotDir(): Promise<string | null>

  runTool(id: string, request: ToolRequest): Promise<ToolResult>
  cancelTool(id: string): Promise<boolean>
  toolsReady(): Promise<{ ffmpeg: boolean }>
  getVersion(): Promise<AppVersion>
  getInitialFile(): Promise<string | null>

  onProgress(cb: (event: ProgressEvent) => void): () => void
  onPrepareProgress(cb: (event: ProgressEvent) => void): () => void
  onWindowState(cb: (state: { maximized: boolean }) => void): () => void
  onExternalOpen(cb: (path: string) => void): () => void
}

declare global {
  interface Window {
    tayfAPI: TayfAPI
  }
}
