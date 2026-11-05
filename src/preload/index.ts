import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type {
  AppVersion,
  MediaInfo,
  MediaItem,
  OpenMediaResult,
  PrepareResult,
  ProgressEvent,
  RecentItem,
  ResolveUrlResult,
  Settings,
  SubtitlePayload,
  ToolRequest,
  ToolResult,
  UrlHistoryItem
} from '../shared/types'

const api = {
  openMedia: (): Promise<OpenMediaResult> => ipcRenderer.invoke('dialog:openMedia'),
  openFolder: (): Promise<OpenMediaResult> => ipcRenderer.invoke('dialog:openFolder'),
  fromPaths: (paths: string[]): Promise<OpenMediaResult> => ipcRenderer.invoke('media:fromPaths', paths),
  pickFiles: (): Promise<string[]> => ipcRenderer.invoke('dialog:pickFiles'),
  probe: (file: string): Promise<MediaInfo | { error: string }> => ipcRenderer.invoke('media:probe', file),
  preparePlayback: (id: string, file: string): Promise<PrepareResult> => ipcRenderer.invoke('media:prepare', id, file),
  cancelPrepare: (id: string): Promise<boolean> => ipcRenderer.invoke('media:cancelPrepare', id),
  getPathForFile: (file: File): string => webUtils.getPathForFile(file),

  openSubtitle: (): Promise<SubtitlePayload | { error: string } | null> => ipcRenderer.invoke('dialog:openSubtitle'),
  readSubtitle: (file: string): Promise<SubtitlePayload | { error: string }> => ipcRenderer.invoke('subtitle:read', file),
  findSubtitles: (video: string): Promise<string[]> => ipcRenderer.invoke('subtitle:find', video),
  listSubtitles: (video: string): Promise<string[]> => ipcRenderer.invoke('subtitle:list', video),

  getSettings: (): Promise<Settings> => ipcRenderer.invoke('settings:get'),
  setSettings: (patch: Partial<Settings>): Promise<Settings> => ipcRenderer.invoke('settings:set', patch),

  getRecent: (): Promise<RecentItem[]> => ipcRenderer.invoke('recent:get'),
  addRecent: (item: RecentItem): Promise<void> => ipcRenderer.invoke('recent:add', item),
  clearRecent: (): Promise<void> => ipcRenderer.invoke('recent:clear'),
  getUrlHistory: (): Promise<UrlHistoryItem[]> => ipcRenderer.invoke('url:history'),
  addUrlHistory: (url: string, name: string): Promise<UrlHistoryItem[]> =>
    ipcRenderer.invoke('url:addHistory', url, name),
  clearUrlHistory: (): Promise<void> => ipcRenderer.invoke('url:clearHistory'),
  resolveUrl: (url: string): Promise<ResolveUrlResult> => ipcRenderer.invoke('url:resolve', url),
  getPosition: (file: string): Promise<number> => ipcRenderer.invoke('position:get', file),
  getPositions: (): Promise<Record<string, number>> => ipcRenderer.invoke('position:all'),
  setPosition: (file: string, seconds: number): Promise<void> => ipcRenderer.invoke('position:set', file, seconds),
  forgetPosition: (file: string): Promise<void> => ipcRenderer.invoke('position:forget', file),

  minimize: (): Promise<void> => ipcRenderer.invoke('window:minimize'),
  toggleMaximize: (): Promise<boolean> => ipcRenderer.invoke('window:toggleMaximize'),
  close: (): Promise<void> => ipcRenderer.invoke('window:close'),
  toggleFullscreen: (): Promise<boolean> => ipcRenderer.invoke('window:toggleFullscreen'),
  setAlwaysOnTop: (value: boolean): Promise<boolean> => ipcRenderer.invoke('window:alwaysOnTop', value),
  setMiniMode: (value: boolean): Promise<void> => ipcRenderer.invoke('window:miniMode', value),

  reveal: (file: string): Promise<void> => ipcRenderer.invoke('shell:reveal', file),
  openPath: (file: string): Promise<void> => ipcRenderer.invoke('shell:openPath', file),
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke('shell:openExternal', url),
  saveSnapshot: (dataUrl: string, name: string) => ipcRenderer.invoke('snapshot:save', dataUrl, name),
  pickSnapshotDir: (): Promise<string | null> => ipcRenderer.invoke('dialog:pickSnapshotDir'),

  runTool: (id: string, request: ToolRequest): Promise<ToolResult> => ipcRenderer.invoke('tools:run', id, request),
  cancelTool: (id: string): Promise<boolean> => ipcRenderer.invoke('tools:cancel', id),
  toolsReady: (): Promise<{ ffmpeg: boolean }> => ipcRenderer.invoke('tools:ready'),
  getVersion: (): Promise<AppVersion> => ipcRenderer.invoke('app:version'),
  getInitialFile: (): Promise<string | null> => ipcRenderer.invoke('app:initialFile'),

  onProgress: (cb: (event: ProgressEvent) => void): (() => void) => {
    const listener = (_e: unknown, payload: ProgressEvent): void => cb(payload)
    ipcRenderer.on('tools:progress', listener)
    return () => ipcRenderer.removeListener('tools:progress', listener)
  },
  onPrepareProgress: (cb: (event: ProgressEvent) => void): (() => void) => {
    const listener = (_e: unknown, payload: ProgressEvent): void => cb(payload)
    ipcRenderer.on('media:prepare-progress', listener)
    return () => ipcRenderer.removeListener('media:prepare-progress', listener)
  },
  onWindowState: (cb: (state: { maximized: boolean }) => void): (() => void) => {
    const listener = (_e: unknown, payload: { maximized: boolean }): void => cb(payload)
    ipcRenderer.on('window:state', listener)
    return () => ipcRenderer.removeListener('window:state', listener)
  },
  onExternalOpen: (cb: (path: string) => void): (() => void) => {
    const listener = (_e: unknown, payload: string): void => cb(payload)
    ipcRenderer.on('media:externalOpen', listener)
    return () => ipcRenderer.removeListener('media:externalOpen', listener)
  }
}

contextBridge.exposeInMainWorld('tayfAPI', api)
