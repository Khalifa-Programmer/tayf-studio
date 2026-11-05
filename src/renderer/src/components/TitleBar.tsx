import { useEffect, useRef, useState } from 'react'
import type { ReactElement, ReactNode } from 'react'
import type { ToolKind } from '../../../shared/types'
import type { TFunction } from '../i18n'
import { cn } from '../utils'
import {
  Close,
  Convert,
  Film,
  Folder,
  Gif,
  Globe,
  Info,
  Layers,
  MaximizeWindow,
  Mini,
  MinimizeWindow,
  Pin,
  Play,
  RestoreWindow,
  Rewind,
  Scissors,
  Settings,
  Sparkles,
  StepBack,
  StepForward
} from './Icons'

interface TitleBarProps {
  title: string
  isMaximized: boolean
  pinned: boolean
  mini: boolean
  seekStep: number
  onOpenFile: () => void
  onOpenFolder: () => void
  onOpenUrl: () => void
  onTool: (kind: ToolKind) => void
  onInfo: () => void
  onSettings: () => void
  onTogglePin: () => void
  onToggleMini: () => void
  onMinimize: () => void
  onToggleMaximize: () => void
  onClose: () => void
  onFrameStep: (direction: 1 | -1) => void
  onSeekStep: (value: number) => void
  t: TFunction
}

interface MenuEntry {
  icon: ReactNode
  label: string
  hint?: string
  onClick: () => void
  testId?: string
}

function Menu({ align, items, onClose }: { align: 'start' | 'end'; items: MenuEntry[]; onClose: () => void }): ReactElement {
  return (
    <>
      <div className="fixed inset-0 z-40" onMouseDown={onClose} />
      <div
        className={cn(
          'panel fade-in absolute top-[calc(100%+6px)] z-50 w-60 overflow-hidden rounded-xl border py-1.5 shadow-2xl',
          align === 'start' ? 'start-0' : 'end-0'
        )}
        style={{ boxShadow: 'var(--shadow)' }}
      >
        {items.map((item, index) => (
          <button
            key={`${item.label}-${index}`}
            type="button"
            data-testid={item.testId}
            className="no-drag flex w-full items-center gap-3 px-3 py-2 text-start text-[13px] transition-colors hover:bg-[var(--elevated)]"
            onClick={() => {
              onClose()
              item.onClick()
            }}
          >
            <span className="text-[var(--muted)]">{item.icon}</span>
            <span className="flex-1 truncate">{item.label}</span>
            {item.hint ? <span className="text-[10px] text-[var(--muted)]">{item.hint}</span> : null}
          </button>
        ))}
      </div>
    </>
  )
}

export default function TitleBar(props: TitleBarProps): ReactElement {
  const { t } = props
  const [menu, setMenu] = useState<'file' | 'tools' | 'play' | null>(null)
  const rootRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setMenu(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const fileItems: MenuEntry[] = [
    { icon: <Folder size={15} />, label: t('openFile'), hint: 'Ctrl+O', onClick: props.onOpenFile },
    { icon: <Layers size={15} />, label: t('openFolder'), onClick: props.onOpenFolder },
    { icon: <Globe size={15} />, label: t('openUrl'), hint: 'Ctrl+U', onClick: props.onOpenUrl, testId: 'menu-open-url' },
    { icon: <Settings size={15} />, label: t('settings'), onClick: props.onSettings },
    { icon: <Close size={15} />, label: t('exit'), onClick: props.onClose }
  ]

  const seekPresets = [5, 10, 30]
  const playItems: MenuEntry[] = [
    { icon: <StepBack size={15} />, label: t('frameBack'), hint: ',', onClick: () => props.onFrameStep(-1), testId: 'menu-frame-back' },
    { icon: <StepForward size={15} />, label: t('frameForward'), hint: '.', onClick: () => props.onFrameStep(1), testId: 'menu-frame-forward' },
    ...seekPresets.map(
      (step): MenuEntry => ({
        icon: <Rewind size={15} />,
        label: `${t('seekBack')} / ${t('seekForward')} ${step}${t('secondsUnit')}`,
        hint: props.seekStep === step ? '✓' : undefined,
        onClick: () => props.onSeekStep(step),
        testId: `menu-seek-${step}`
      })
    )
  ]

  const toolItems: MenuEntry[] = [
    { icon: <Gif size={15} />, label: t('toolGif'), onClick: () => props.onTool('gif') },
    { icon: <Scissors size={15} />, label: t('toolClip'), onClick: () => props.onTool('clip') },
    { icon: <Convert size={15} />, label: t('toolConvert'), onClick: () => props.onTool('convert') },
    { icon: <Film size={15} />, label: t('toolJoin'), onClick: () => props.onTool('join') },
    { icon: <Info size={15} />, label: t('toolInfo'), onClick: props.onInfo }
  ]

  return (
    <header
      ref={rootRef}
      className="titlebar panel relative z-30 flex h-12 shrink-0 items-center gap-1.5 border-b px-2"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="no-drag flex items-center gap-1.5 ps-1">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-[10px] text-black"
          style={{ background: 'linear-gradient(135deg, var(--accent), #38bdf8)' }}
        >
          <Sparkles size={17} />
        </span>
        <div className="hidden leading-tight sm:block">
          <div className="text-[13px] font-extrabold tracking-tight">{t('appName')}</div>
          <div className="text-[9px] font-medium text-[var(--muted)]">{t('tagline')}</div>
        </div>
      </div>

      <div className="mx-1 hidden h-6 w-px bg-[var(--border)] sm:block" />

      <div className="no-drag relative flex items-center gap-1">
        <button
          type="button"
          onClick={() => setMenu(menu === 'file' ? null : 'file')}
          className={cn(
            'btn-icon h-8 gap-1.5 rounded-lg px-2.5 text-[12px] font-semibold',
            menu === 'file' && 'bg-[var(--elevated)]'
          )}
        >
          <Folder size={15} />
          <span className="hidden md:inline">{t('openFile')}</span>
        </button>
        <button
          type="button"
          onClick={() => setMenu(menu === 'play' ? null : 'play')}
          className={cn(
            'btn-icon h-8 gap-1.5 rounded-lg px-2.5 text-[12px] font-semibold',
            menu === 'play' && 'bg-[var(--elevated)]'
          )}
        >
          <Play size={15} />
          <span className="hidden md:inline">{t('play')}</span>
        </button>
        <button
          type="button"
          onClick={() => setMenu(menu === 'tools' ? null : 'tools')}
          className={cn(
            'btn-icon h-8 gap-1.5 rounded-lg px-2.5 text-[12px] font-semibold',
            menu === 'tools' && 'bg-[var(--elevated)]'
          )}
        >
          <Layers size={15} />
          <span className="hidden md:inline">{t('tools')}</span>
        </button>
        {menu === 'file' ? <Menu align="start" items={fileItems} onClose={() => setMenu(null)} /> : null}
        {menu === 'play' ? <Menu align="start" items={playItems} onClose={() => setMenu(null)} /> : null}
        {menu === 'tools' ? <Menu align="start" items={toolItems} onClose={() => setMenu(null)} /> : null}
      </div>

      <div className="min-w-0 flex-1 px-2 text-center">
        {props.title ? (
          <div className="mx-auto max-w-[46vw] truncate text-[12px] font-medium text-[var(--muted)]" title={props.title}>
            {props.title}
          </div>
        ) : null}
      </div>

      <div className="no-drag flex items-center gap-0.5">
        <button
          type="button"
          title={props.pinned ? t('unpin') : t('pin')}
          aria-label={props.pinned ? t('unpin') : t('pin')}
          onClick={props.onTogglePin}
          className={cn('btn-icon h-8 w-8', props.pinned && 'text-[var(--accent)]')}
        >
          <Pin size={16} />
        </button>
        <button
          type="button"
          title={props.mini ? t('exitMini') : t('miniMode')}
          aria-label={props.mini ? t('exitMini') : t('miniMode')}
          onClick={props.onToggleMini}
          className={cn('btn-icon h-8 w-8', props.mini && 'text-[var(--accent)]')}
        >
          <Mini size={16} />
        </button>
        <button
          type="button"
          title={t('settings')}
          aria-label={t('settings')}
          onClick={props.onSettings}
          className="btn-icon h-8 w-8"
        >
          <Settings size={16} />
        </button>
        <div className="mx-1 h-6 w-px bg-[var(--border)]" />
        <button
          type="button"
          title={t('minimize')}
          aria-label={t('minimize')}
          onClick={props.onMinimize}
          className="btn-icon h-8 w-9"
        >
          <MinimizeWindow size={15} />
        </button>
        <button
          type="button"
          title={props.isMaximized ? t('restore') : t('maximize')}
          aria-label={props.isMaximized ? t('restore') : t('maximize')}
          onClick={props.onToggleMaximize}
          className="btn-icon h-8 w-9"
        >
          {props.isMaximized ? <RestoreWindow size={14} /> : <MaximizeWindow size={14} />}
        </button>
        <button
          type="button"
          title={t('close')}
          aria-label={t('close')}
          onClick={props.onClose}
          className="btn-icon h-8 w-9 hover:!bg-red-500/90 hover:!text-white"
        >
          <Close size={16} />
        </button>
      </div>
    </header>
  )
}
