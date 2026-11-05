import { useMemo, useState } from 'react'
import type { ReactElement } from 'react'
import type { MediaItem, RecentItem } from '../../../shared/types'
import type { TFunction } from '../i18n'
import { baseName, cn, formatTime, isRemoteUrl, shortPath } from '../utils'
import {
  Clock,
  Close,
  Eye,
  Folder,
  Globe,
  Image,
  List,
  Music,
  Plus,
  Search,
  Subtitles,
  Trash,
  Video
} from './Icons'

interface PlaylistProps {
  files: MediaItem[]
  currentPath: string | null
  recent: RecentItem[]
  locale: string
  onSelect: (index: number) => void
  onSelectRecent: (item: RecentItem) => void
  onRemove: (index: number) => void
  onClear: () => void
  onAddFiles: () => void
  onAddFolder: () => void
  onReveal: (path: string) => void
  onClearRecent: () => void
  onClose: () => void
  t: TFunction
}

function TypeIcon({ type }: { type: MediaItem['type'] }): ReactElement {
  if (type === 'video') return <Video size={15} />
  if (type === 'audio') return <Music size={15} />
  return <Image size={15} />
}

export default function Playlist(props: PlaylistProps): ReactElement {
  const { t } = props
  const [tab, setTab] = useState<'queue' | 'recent'>('queue')
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return props.files
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => !needle || item.name.toLowerCase().includes(needle))
  }, [props.files, query])

  const filteredRecent = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return props.recent.filter((item) => !needle || item.name.toLowerCase().includes(needle))
  }, [props.recent, query])

  return (
    <aside
      className="panel flex w-[320px] shrink-0 flex-col border-s"
      style={{ borderColor: 'var(--border)', background: 'var(--panel-2)' }}
    >
      <div className="flex h-11 shrink-0 items-center gap-1 border-b px-2" style={{ borderColor: 'var(--border)' }}>
        <button
          type="button"
          onClick={() => setTab('queue')}
          className={cn(
            'flex h-7 items-center gap-1.5 rounded-lg px-3 text-[11px] font-bold transition-colors',
            tab === 'queue' ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--muted)] hover:bg-[var(--elevated)]'
          )}
        >
          <List size={13} />
          {t('playlist')}
          <span className="rounded-full bg-black/20 px-1.5 text-[9px] tabular-nums">{props.files.length}</span>
        </button>
        <button
          type="button"
          onClick={() => setTab('recent')}
          className={cn(
            'flex h-7 items-center gap-1.5 rounded-lg px-3 text-[11px] font-bold transition-colors',
            tab === 'recent' ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--muted)] hover:bg-[var(--elevated)]'
          )}
        >
          <Clock size={13} />
          {t('recent')}
        </button>
        <div className="flex-1" />
        <button type="button" className="btn-icon h-7 w-7" title={t('hidePlaylist')} onClick={props.onClose}>
          <Close size={14} />
        </button>
      </div>

      <div className="shrink-0 px-2 py-1.5">
        <div className="relative">
          <Search
            size={13}
            className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('searchPlaylist')}
            className="field h-8 w-full pe-8 text-[11px]"
          />
        </div>
      </div>

      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-1.5 pb-2">
        {tab === 'queue' ? (
          filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-[var(--muted)]">
              <List size={28} opacity={0.4} />
              <span className="text-[11px]">{query ? t('noMedia') : t('noMedia')}</span>
            </div>
          ) : (
            filtered.map(({ item, index }) => {
              const active = item.path === props.currentPath
              return (
                <div
                  key={`${item.path}-${index}`}
                  className={cn(
                    'group relative mb-0.5 flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors',
                    active ? 'bg-[var(--accent-soft)]' : 'hover:bg-[var(--elevated)]'
                  )}
                >
                  <button
                    type="button"
                    onClick={() => props.onSelect(index)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-start"
                    title={item.path}
                  >
                    <span
                      className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
                        active ? 'text-[var(--accent)]' : 'text-[var(--muted)]'
                      )}
                      style={{ background: active ? 'transparent' : 'var(--panel)' }}
                    >
                      {isRemoteUrl(item.path) ? <Globe size={15} /> : <TypeIcon type={item.type} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          'block truncate text-[11.5px] leading-tight',
                          active ? 'font-bold text-[var(--accent)]' : 'font-medium'
                        )}
                      >
                        {item.name}
                      </span>
                      <span className="mt-0.5 block truncate text-[9px] text-[var(--muted)]">
                        {item.type === 'video' ? 'video' : item.type === 'audio' ? 'audio' : 'image'}
                        {item.size ? ` · ${Math.round(item.size / 1024 / 1024)} MB` : ''}
                      </span>
                    </span>
                  </button>
                  <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100">
                    {!isRemoteUrl(item.path) ? (
                      <button
                        type="button"
                        className="btn-icon h-6 w-6"
                        title={t('reveal')}
                        onClick={() => props.onReveal(item.path)}
                      >
                        <Eye size={12} />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="btn-icon h-6 w-6 hover:!text-red-400"
                      title={t('remove')}
                      onClick={() => props.onRemove(index)}
                    >
                      <Close size={12} />
                    </button>
                  </div>
                </div>
              )
            })
          )
        ) : filteredRecent.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-[var(--muted)]">
            <Clock size={28} opacity={0.4} />
            <span className="text-[11px]">{t('noRecent')}</span>
          </div>
        ) : (
          filteredRecent.map((item) => (
            <div
              key={item.path}
              className="group mb-0.5 flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-[var(--elevated)]"
            >
              <button
                type="button"
                onClick={() => props.onSelectRecent(item)}
                className="flex min-w-0 flex-1 items-center gap-2 text-start"
                title={shortPath(item.path, 90)}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--muted)]">
                  {isRemoteUrl(item.path) ? <Globe size={15} /> : <TypeIcon type={item.type} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11.5px] font-medium leading-tight">{item.name}</span>
                  <span className="mt-0.5 block truncate text-[9px] text-[var(--muted)]">
                    {formatTime(item.position)} / {formatTime(item.duration)} ·{' '}
                    {new Date(item.lastPlayed).toLocaleDateString(props.locale === 'ar' ? 'ar' : 'en')}
                  </span>
                </span>
              </button>
              {!isRemoteUrl(item.path) ? (
                <button
                  type="button"
                  className="btn-icon h-6 w-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                  title={t('reveal')}
                  onClick={() => props.onReveal(item.path)}
                >
                  <Eye size={12} />
                </button>
              ) : null}
            </div>
          ))
        )}
      </div>

      <div className="shrink-0 border-t px-2 py-2" style={{ borderColor: 'var(--border)' }}>
        {tab === 'queue' ? (
          <div className="flex items-center gap-1.5">
            <button type="button" className="btn-primary flex h-7 flex-1 items-center justify-center gap-1 text-[10.5px]" onClick={props.onAddFiles}>
              <Plus size={13} />
              {t('addFiles')}
            </button>
            <button type="button" className="btn-ghost flex h-7 items-center gap-1 px-2 text-[10.5px]" onClick={props.onAddFolder}>
              <Folder size={13} />
              {t('openFolder')}
            </button>
            <button
              type="button"
              className="btn-ghost flex h-7 w-7 items-center justify-center text-[10.5px] hover:!text-red-400"
              title={t('clear')}
              onClick={props.onClear}
              disabled={props.files.length === 0}
            >
              <Trash size={13} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn-ghost flex h-7 w-full items-center justify-center gap-1 text-[10.5px] hover:!text-red-400"
            onClick={props.onClearRecent}
            disabled={props.recent.length === 0}
          >
            <Trash size={13} />
            {t('clearRecent')}
          </button>
        )}
        <div className="mt-1.5 flex items-center justify-between px-0.5 text-[9px] text-[var(--muted)]">
          <span>{t('selectedCount', { count: props.files.length })}</span>
          <span className="flex items-center gap-1">
            <Subtitles size={10} />
            {t('dragSubtitleHint')}
          </span>
        </div>
      </div>
    </aside>
  )
}
