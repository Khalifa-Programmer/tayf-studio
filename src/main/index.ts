import { app, BrowserWindow, ipcMain, dialog, protocol, shell, Menu } from 'electron'
import { join, dirname, extname, basename } from 'path'
import * as fs from 'fs'
import { Readable } from 'stream'
import type { MediaItem, OpenMediaResult, RecentItem, Settings, ToolRequest } from '../shared/types'
import { findSubtitles, listSubtitles, readSubtitle } from './subtitles'
import { cancelTool, hasFfmpeg, probe, runTool, suggestOutput } from './ffmpeg'
import { cancelPrepare, preparePlayback } from './compat'
import {
  addRecent,
  addUrlHistory,
  clearRecent,
  clearUrlHistory,
  forgetPosition,
  getPosition,
  getPositions,
  getRecent,
  getSettings,
  getUrlHistory,
  savePosition,
  saveSettings
} from './store'
import { isRemoteUrl, resolveRemoteUrl } from './url'

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'tayf',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      corsEnabled: true,
      bypassCSP: true
    }
  }
])

// مشغّل وسائط: التشغيل التلقائي عند فتح ملف لا يحتاج تفاعلاً من المستخدم.
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')

const VIDEO = [
  '.mp4', '.mkv', '.webm', '.avi', '.mov', '.wmv', '.flv', '.m4v', '.mpg', '.mpeg',
  '.ts', '.m2ts', '.mts', '.3gp', '.3g2', '.rm', '.rmvb', '.vob', '.ogv', '.asf', '.f4v'
]
const AUDIO = [
  '.mp3', '.flac', '.wav', '.ogg', '.oga', '.m4a', '.aac', '.wma', '.opus', '.ape',
  '.alac', '.amr', '.ac3', '.dts', '.mid', '.midi'
]
const IMAGE = [
  '.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.svg', '.bmp', '.tif', '.tiff',
  '.ico', '.heic', '.jfif'
]

const MIME: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.mkv': 'video/x-matroska',
  '.webm': 'video/webm',
  '.avi': 'video/x-msvideo',
  '.mov': 'video/quicktime',
  '.wmv': 'video/x-ms-wmv',
  '.flv': 'video/x-flv',
  '.mpg': 'video/mpeg',
  '.mpeg': 'video/mpeg',
  '.ts': 'video/mp2t',
  '.m2ts': 'video/mp2t',
  '.ogv': 'video/ogg',
  '.3gp': 'video/3gpp',
  '.mp3': 'audio/mpeg',
  '.flac': 'audio/flac',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.oga': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.wma': 'audio/x-ms-wma',
  '.opus': 'audio/opus',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
  '.heic': 'image/heic'
}

function kindOf(ext: string): MediaItem['type'] | null {
  const lower = ext.toLowerCase()
  if (VIDEO.includes(lower)) return 'video'
  if (AUDIO.includes(lower)) return 'audio'
  if (IMAGE.includes(lower)) return 'image'
  return null
}

function toItem(fullPath: string): MediaItem | null {
  try {
    const stat = fs.statSync(fullPath)
    if (!stat.isFile()) return null
    const type = kindOf(extname(fullPath))
    if (!type) return null
    return { name: basename(fullPath), path: fullPath, type, size: stat.size }
  } catch {
    return null
  }
}

function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
}

function scanFolder(folder: string): MediaItem[] {
  try {
    return fs
      .readdirSync(folder)
      .map((file) => toItem(join(folder, file)))
      .filter((item): item is MediaItem => Boolean(item))
      .sort((a, b) => naturalCompare(a.name, b.name))
  } catch {
    return []
  }
}

function mediaFilters(): Electron.FileFilter[] {
  const strip = (list: string[]): string[] => list.map((entry) => entry.replace('.', ''))
  return [
    { name: 'كل الوسائط', extensions: [...strip(VIDEO), ...strip(AUDIO), ...strip(IMAGE)] },
    { name: 'الفيديو', extensions: strip(VIDEO) },
    { name: 'الصوت', extensions: strip(AUDIO) },
    { name: 'الصور', extensions: strip(IMAGE) }
  ]
}

function parseRange(header: string, size: number): { start: number; end: number } | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim())
  if (!match) return null
  let start = match[1] ? Number(match[1]) : Number.NaN
  let end = match[2] ? Number(match[2]) : Number.NaN
  if (Number.isNaN(start)) {
    if (Number.isNaN(end)) return null
    start = Math.max(0, size - end)
    end = size - 1
  } else if (Number.isNaN(end)) {
    end = size - 1
  }
  if (start < 0 || start > end || start >= size) return null
  return { start, end: Math.min(end, size - 1) }
}

let mainWindow: BrowserWindow | null = null
let normalBounds: Electron.Rectangle | null = null

function initialFileArg(): string | null {
  const arg = process.argv.find((value) => value && fs.existsSync(value) && kindOf(extname(value)))
  return arg || null
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 840,
    minWidth: 900,
    minHeight: 580,
    title: 'طيف ستوديو',
    backgroundColor: '#0b0f14',
    frame: false,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      spellcheck: false
    }
  })

  mainWindow.once('ready-to-show', () => mainWindow?.show())
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.on('maximize', () => mainWindow?.webContents.send('window:state', { maximized: true }))
  mainWindow.on('unmaximize', () => mainWindow?.webContents.send('window:state', { maximized: false }))

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.webContents.on('did-finish-load', () => {
    // الملف الأولي يُسحب من الواجهة عبر app:initialFile لتفادي سباق الاستماع.
  })
}

function registerIpc(): void {
  ipcMain.handle('dialog:openMedia', async (): Promise<OpenMediaResult> => {
    if (!mainWindow) return { files: [], currentPath: null }
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'اختر ملفات الوسائط',
      filters: mediaFilters(),
      properties: ['openFile', 'multiSelections']
    })
    if (canceled || filePaths.length === 0) return { files: [], currentPath: null }

    const selected = filePaths.map(toItem).filter((item): item is MediaItem => Boolean(item))
    if (selected.length === 1) {
      const siblings = scanFolder(dirname(selected[0].path))
      if (siblings.length > 1) {
        return { files: siblings, currentPath: selected[0].path }
      }
    }
    return { files: selected, currentPath: selected[0]?.path ?? null }
  })

  ipcMain.handle('dialog:openFolder', async (): Promise<OpenMediaResult> => {
    if (!mainWindow) return { files: [], currentPath: null }
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'اختر مجلداً',
      properties: ['openDirectory']
    })
    if (canceled || filePaths.length === 0) return { files: [], currentPath: null }
    const files = scanFolder(filePaths[0])
    return { files, currentPath: files[0]?.path ?? null }
  })

  ipcMain.handle('dialog:pickFiles', async (): Promise<string[]> => {
    if (!mainWindow) return []
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'اختر ملفات',
      filters: mediaFilters(),
      properties: ['openFile', 'multiSelections']
    })
    return canceled ? [] : filePaths
  })

  ipcMain.handle('media:fromPaths', async (_event, paths: string[]): Promise<OpenMediaResult> => {
    const files = (paths || []).map(toItem).filter((item): item is MediaItem => Boolean(item))
    return { files, currentPath: files[0]?.path ?? null }
  })

  ipcMain.handle('media:probe', async (_event, file: string) => {
    try {
      return await probe(file)
    } catch (err) {
      return { error: String(err instanceof Error ? err.message : err) }
    }
  })

  ipcMain.handle('media:prepare', async (event, id: string, file: string) =>
    preparePlayback(id, file, (percent, line) => {
      if (!event.sender.isDestroyed()) event.sender.send('media:prepare-progress', { id, percent, line })
    })
  )
  ipcMain.handle('media:cancelPrepare', (_event, id: string) => cancelPrepare(id))

  ipcMain.handle('dialog:openSubtitle', async () => {
    if (!mainWindow) return null
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'اختر ملف الترجمة',
      filters: [{ name: 'ملفات الترجمة', extensions: ['srt', 'vtt', 'ass', 'ssa', 'sub'] }]
    })
    if (canceled || filePaths.length === 0) return null
    try {
      return readSubtitle(filePaths[0])
    } catch (err) {
      return { error: String(err) }
    }
  })

  ipcMain.handle('subtitle:read', async (_event, file: string) => {
    try {
      return readSubtitle(file)
    } catch (err) {
      return { error: String(err) }
    }
  })
  ipcMain.handle('subtitle:find', (_event, video: string) => findSubtitles(video))
  ipcMain.handle('subtitle:list', (_event, video: string) => listSubtitles(video))

  ipcMain.handle('settings:get', () => getSettings())
  ipcMain.handle('settings:set', (_event, patch: Partial<Settings>) => saveSettings(patch))

  ipcMain.handle('recent:get', () => getRecent())
  ipcMain.handle('recent:add', (_event, item: RecentItem) => addRecent(item))
  ipcMain.handle('recent:clear', () => clearRecent())
  ipcMain.handle('url:history', () => getUrlHistory())
  ipcMain.handle('url:addHistory', (_event, url: string, name: string) =>
    addUrlHistory(String(url || ''), String(name || ''))
  )
  ipcMain.handle('url:clearHistory', () => clearUrlHistory())
  ipcMain.handle('url:resolve', async (_event, rawUrl: string) => {
    const result = await resolveRemoteUrl(String(rawUrl || ''))
    if (result.item) addUrlHistory(result.item.path, result.item.name)
    return result
  })
  ipcMain.handle('position:get', (_event, file: string) => getPosition(file))
  ipcMain.handle('position:all', () => getPositions())
  ipcMain.handle('position:set', (_event, file: string, seconds: number) => savePosition(file, seconds))
  ipcMain.handle('position:forget', (_event, file: string) => forgetPosition(file))

  ipcMain.handle('window:minimize', () => mainWindow?.minimize())
  ipcMain.handle('window:toggleMaximize', () => {
    if (!mainWindow) return false
    if (mainWindow.isMaximized()) mainWindow.unmaximize()
    else mainWindow.maximize()
    return mainWindow.isMaximized()
  })
  ipcMain.handle('window:close', () => mainWindow?.close())
  ipcMain.handle('window:toggleFullscreen', () => {
    if (!mainWindow) return false
    mainWindow.setFullScreen(!mainWindow.isFullScreen())
    return mainWindow.isFullScreen()
  })
  ipcMain.handle('window:alwaysOnTop', (_event, value: boolean) => {
    mainWindow?.setAlwaysOnTop(Boolean(value), 'floating')
    return Boolean(value)
  })
  ipcMain.handle('window:miniMode', (_event, value: boolean) => {
    if (!mainWindow) return
    if (value) {
      if (!mainWindow.isMaximized()) normalBounds = mainWindow.getBounds()
      mainWindow.setAlwaysOnTop(true, 'floating')
      mainWindow.setBounds({ x: mainWindow.getBounds().x, y: mainWindow.getBounds().y, width: 540, height: 340 }, true)
    } else {
      mainWindow.setAlwaysOnTop(false)
      if (normalBounds) mainWindow.setBounds(normalBounds, true)
      normalBounds = null
    }
  })

  ipcMain.handle('shell:reveal', (_event, file: string) => {
    if (file && !isRemoteUrl(file) && fs.existsSync(file)) shell.showItemInFolder(file)
  })
  ipcMain.handle('shell:openPath', async (_event, file: string) => {
    if (!file) return
    // للروابط البعيدة: فتح الرابط في المتصفح الافتراضي بدل مسار محلي.
    if (isRemoteUrl(file)) {
      if (/^https?:\/\//i.test(file)) await shell.openExternal(file)
      return
    }
    if (fs.existsSync(file)) await shell.openPath(file)
  })
  ipcMain.handle('shell:openExternal', (_event, url: string) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url)
  })

  ipcMain.handle('snapshot:save', async (_event, dataUrl: string, suggestedName: string) => {
    try {
      const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '')
      const settings = getSettings()
      const dir = settings.snapshotDir || join(app.getPath('pictures'), 'Tayf Snapshots')
      fs.mkdirSync(dir, { recursive: true })
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      const safe = (suggestedName || 'snapshot').replace(/[\\/:*?"<>|]/g, '_')
      const out = join(dir, `${safe}_${stamp}.png`)
      fs.writeFileSync(out, Buffer.from(base64, 'base64'))
      return { ok: true, path: out }
    } catch (err) {
      return { ok: false, error: String(err) }
    }
  })

  ipcMain.handle('dialog:pickSnapshotDir', async () => {
    if (!mainWindow) return null
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'اختر مجلد حفظ اللقطات',
      properties: ['openDirectory', 'createDirectory']
    })
    return canceled ? null : filePaths[0]
  })

  ipcMain.handle('tools:run', async (event, id: string, request: ToolRequest) => {
    if (!mainWindow) return { ok: false, error: 'no window' }
    let output = request.output
    if (!output) {
      const suggested = suggestOutput(request)
      const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
        title: 'حفظ الناتج',
        defaultPath: suggested
      })
      if (canceled || !filePath) return { ok: false, canceled: true }
      output = filePath
    }
    return runTool(id, request, output, (percent, line) => {
      if (!event.sender.isDestroyed()) event.sender.send('tools:progress', { id, percent, line })
    })
  })

  ipcMain.handle('tools:cancel', (_event, id: string) => cancelTool(id))
  ipcMain.handle('tools:ready', () => ({ ffmpeg: hasFfmpeg() }))
  ipcMain.handle('app:version', () => ({
    app: app.getVersion(),
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    ffmpeg: hasFfmpeg()
  }))
  ipcMain.handle('app:initialFile', () => initialFileArg())
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', (_event, argv) => {
    const file = argv.find((value) => value && fs.existsSync(value) && kindOf(extname(value)))
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
      if (file) mainWindow.webContents.send('media:externalOpen', file)
    }
  })

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null)

    protocol.handle('tayf', async (request) => {
      let filePath = ''
      try {
        const url = new URL(request.url)
        filePath = url.searchParams.get('p') || ''
        if (!filePath) {
          const raw = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname
          filePath = decodeURIComponent(raw)
        }
      } catch {
        return new Response('Bad request', { status: 400 })
      }

      try {
        const stat = await fs.promises.stat(filePath)
        if (!stat.isFile()) return new Response('Not a file', { status: 404 })

        const type = MIME[extname(filePath).toLowerCase()] || 'application/octet-stream'
        const headers: Record<string, string> = {
          'Content-Type': type,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'no-store',
          'Access-Control-Allow-Origin': '*',
          'Cross-Origin-Resource-Policy': 'cross-origin'
        }

        if (request.method === 'HEAD') {
          return new Response(null, { status: 200, headers: { ...headers, 'Content-Length': String(stat.size) } })
        }

        const rangeHeader = request.headers.get('range')
        const range = rangeHeader ? parseRange(rangeHeader, stat.size) : null
        if (range) {
          const stream = fs.createReadStream(filePath, { start: range.start, end: range.end })
          const body = Readable.toWeb(stream) as unknown as ReadableStream<Uint8Array>
          return new Response(body, {
            status: 206,
            headers: {
              ...headers,
              'Content-Length': String(range.end - range.start + 1),
              'Content-Range': `bytes ${range.start}-${range.end}/${stat.size}`
            }
          })
        }

        const stream = fs.createReadStream(filePath)
        const body = Readable.toWeb(stream) as unknown as ReadableStream<Uint8Array>
        return new Response(body, {
          status: 200,
          headers: { ...headers, 'Content-Length': String(stat.size) }
        })
      } catch {
        return new Response('Not found', { status: 404 })
      }
    })

    registerIpc()
    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
