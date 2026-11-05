import { useEffect, useState } from 'react'
import type { CSSProperties, ReactElement, ReactNode } from 'react'
import type { AppVersion, Settings } from '../../../shared/types'
import type { TFunction } from '../i18n'
import { cn } from '../utils'
import {
  Camera,
  Check,
  Database,
  Folder,
  Info,
  Keyboard,
  Moon,
  Palette,
  Play,
  Settings as SettingsIcon,
  Subtitles,
  Sun,
  Trash,
  X
} from './Icons'

interface SettingsModalProps {
  settings: Settings
  recentCount: number
  version: AppVersion | null
  onPatch: (patch: Partial<Settings>) => void
  onPickSnapshotDir: () => void
  onClearRecent: () => void
  onReset: () => void
  onClose: () => void
  t: TFunction
}

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }): ReactElement {
  return (
    <section className="rounded-2xl border p-3.5" style={{ borderColor: 'var(--border)', background: 'var(--panel-2)' }}>
      <h3 className="mb-3 flex items-center gap-2 text-[11px] font-extrabold tracking-wide">
        <span className="text-[var(--accent)]">{icon}</span>
        {title}
      </h3>
      <div className="space-y-2.5">{children}</div>
    </section>
  )
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }): ReactElement {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-[11.5px] font-semibold">{label}</div>
        {hint ? <div className="mt-0.5 text-[9.5px] leading-tight text-[var(--muted)]">{hint}</div> : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function Switch({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }): ReactElement {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn('relative h-5 w-9 rounded-full transition-colors', checked ? 'bg-[var(--accent)]' : 'bg-[var(--border)]')}
    >
      <span
        className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-[inset-inline-start] duration-200"
        style={{ insetInlineStart: checked ? 'calc(100% - 18px)' : 2 }}
      />
    </button>
  )
}

const ACCENTS = ['#10b981', '#38bdf8', '#a78bfa', '#f59e0b', '#ef4444', '#ec4899']

export default function SettingsModal(props: SettingsModalProps): ReactElement {
  const { t, settings } = props
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => {
    const handler = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      event.preventDefault()
      props.onClose()
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [props.onClose])

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && props.onClose()}>
      <div
        className="panel fade-in flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border shadow-2xl"
        style={{ boxShadow: 'var(--shadow)' }}
      >
        <div className="flex items-center gap-3 border-b px-5 py-4" style={{ borderColor: 'var(--border)' }}>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
            <SettingsIcon size={20} />
          </span>
          <div className="flex-1">
            <h2 className="text-[15px] font-extrabold">{t('settings')}</h2>
            <p className="mt-0.5 text-[10.5px] text-[var(--muted)]">{t('tagline')}</p>
          </div>
          <button type="button" className="btn-icon h-8 w-8" title={t('close')} onClick={props.onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="scroll-thin min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
          <Section icon={<Palette size={14} />} title={t('appearance')}>
            <Row label={t('theme')}>
              <div className="flex rounded-lg border p-0.5" style={{ borderColor: 'var(--border)' }}>
                <button
                  type="button"
                  className={cn(
                    'flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold',
                    settings.theme === 'dark' ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--muted)]'
                  )}
                  onClick={() => props.onPatch({ theme: 'dark' })}
                >
                  <Moon size={12} />
                  {t('dark')}
                </button>
                <button
                  type="button"
                  className={cn(
                    'flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold',
                    settings.theme === 'light' ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--muted)]'
                  )}
                  onClick={() => props.onPatch({ theme: 'light' })}
                >
                  <Sun size={12} />
                  {t('light')}
                </button>
              </div>
            </Row>

            <Row label={t('accentColor')}>
              <div className="flex items-center gap-1.5">
                {ACCENTS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => props.onPatch({ accent: color })}
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-full border-2 transition-transform hover:scale-110',
                      settings.accent === color ? 'border-white' : 'border-transparent'
                    )}
                    style={{ background: color }}
                    title={color}
                  >
                    {settings.accent === color ? <Check size={12} style={{ color: '#04120c' }} /> : null}
                  </button>
                ))}
                <input
                  type="color"
                  value={settings.accent}
                  onChange={(event) => props.onPatch({ accent: event.target.value })}
                  className="h-6 w-6 cursor-pointer rounded-full border-0 bg-transparent p-0"
                  title={t('accentColor')}
                />
              </div>
            </Row>

            <Row label={t('language')}>
              <div className="flex rounded-lg border p-0.5" style={{ borderColor: 'var(--border)' }}>
                <button
                  type="button"
                  className={cn(
                    'rounded-md px-2.5 py-1 text-[10px] font-bold',
                    settings.language === 'ar' ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--muted)]'
                  )}
                  onClick={() => props.onPatch({ language: 'ar' })}
                >
                  {t('arabic')}
                </button>
                <button
                  type="button"
                  className={cn(
                    'rounded-md px-2.5 py-1 text-[10px] font-bold',
                    settings.language === 'en' ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--muted)]'
                  )}
                  onClick={() => props.onPatch({ language: 'en' })}
                >
                  {t('english')}
                </button>
              </div>
            </Row>
          </Section>

          <Section icon={<Play size={14} />} title={t('playbackSection')}>
            <Row label={t('autoPlay')}>
              <Switch checked={settings.autoPlay} onChange={(value) => props.onPatch({ autoPlay: value })} />
            </Row>
            <Row label={t('rememberPosition')}>
              <Switch checked={settings.rememberPosition} onChange={(value) => props.onPatch({ rememberPosition: value })} />
            </Row>
            <Row label={t('defaultVolume')} hint={`${Math.round(settings.volume * 100)}%`}>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={settings.volume}
                onChange={(event) => props.onPatch({ volume: Number(event.target.value) })}
                className="w-28"
                style={{ '--fill': `${settings.volume * 100}%` } as CSSProperties}
              />
            </Row>
            <Row label={t('seekStepLabel')} hint={t('seekStepHint')}>
              <div className="flex rounded-lg border p-0.5" style={{ borderColor: 'var(--border)' }}>
                {[5, 10, 30].map((step) => (
                  <button
                    key={step}
                    type="button"
                    data-testid={`seek-step-${step}`}
                    className={cn(
                      'rounded-md px-3 py-1 text-[10px] font-bold tabular-nums',
                      settings.seekStep === step ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--muted)]'
                    )}
                    onClick={() => props.onPatch({ seekStep: step })}
                  >
                    {step}{t('secondsUnit')}
                  </button>
                ))}
              </div>
            </Row>
            <Row label={t('alwaysApplyRate')}>
              <Switch checked={settings.keepPlaybackRate} onChange={(value) => props.onPatch({ keepPlaybackRate: value })} />
            </Row>
          </Section>

          <Section icon={<Subtitles size={14} />} title={t('subtitlesSection')}>
            <Row label={t('subtitleFontSize')} hint={`${settings.subtitleFontSize}px`}>
              <input
                type="range"
                min={16}
                max={52}
                step={1}
                value={settings.subtitleFontSize}
                onChange={(event) => props.onPatch({ subtitleFontSize: Number(event.target.value) })}
                className="w-28"
                style={{ '--fill': `${((settings.subtitleFontSize - 16) / 36) * 100}%` } as CSSProperties}
              />
            </Row>
            <Row label={t('subtitleDelayLabel')} hint={`${settings.subtitleDelay > 0 ? '+' : ''}${settings.subtitleDelay.toFixed(1)}`}>
              <input
                type="range"
                min={-10}
                max={10}
                step={0.1}
                value={settings.subtitleDelay}
                onChange={(event) => props.onPatch({ subtitleDelay: Number(event.target.value) })}
                className="w-28"
                style={{ '--fill': `${((settings.subtitleDelay + 10) / 20) * 100}%` } as CSSProperties}
              />
            </Row>
          </Section>

          <Section icon={<Camera size={14} />} title={t('snapshotSection')}>
            <div className="flex items-center gap-2">
              <div
                className="min-w-0 flex-1 truncate rounded-lg border px-2.5 py-1.5 text-[10px] text-[var(--muted)]"
                style={{ borderColor: 'var(--border)' }}
                title={settings.snapshotDir || t('defaultFolder')}
              >
                {settings.snapshotDir || t('defaultFolder')}
              </div>
              <button
                type="button"
                className="btn-ghost flex h-8 items-center gap-1 px-2.5 text-[10px] font-bold"
                onClick={props.onPickSnapshotDir}
              >
                <Folder size={12} />
                {t('chooseFolder')}
              </button>
              {settings.snapshotDir ? (
                <button
                  type="button"
                  className="btn-ghost h-8 w-8 text-[10px]"
                  title={t('resetSettings')}
                  onClick={() => props.onPatch({ snapshotDir: '' })}
                >
                  <X size={12} />
                </button>
              ) : null}
            </div>
          </Section>

          <Section icon={<Database size={14} />} title={t('dataSection')}>
            <Row label={t('recentFiles')} hint={`${props.recentCount}`}>
              <button
                type="button"
                className="btn-ghost flex h-7 items-center gap-1 px-2.5 text-[10px] font-bold hover:!text-red-400"
                onClick={props.onClearRecent}
                disabled={props.recentCount === 0}
              >
                <Trash size={12} />
                {t('clearRecent')}
              </button>
            </Row>
            <Row label={t('resetSettings')}>
              {confirmReset ? (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="rounded-md bg-red-500/90 px-2 py-1 text-[9.5px] font-bold text-white"
                    onClick={() => {
                      props.onReset()
                      setConfirmReset(false)
                    }}
                  >
                    {t('yes')}
                  </button>
                  <button
                    type="button"
                    className="btn-ghost px-2 py-1 text-[9.5px] font-bold"
                    onClick={() => setConfirmReset(false)}
                  >
                    {t('no')}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn-ghost px-2.5 py-1 text-[10px] font-bold"
                  onClick={() => setConfirmReset(true)}
                >
                  {t('resetSettings')}
                </button>
              )}
            </Row>
          </Section>

          <Section icon={<Keyboard size={14} />} title={t('shortcuts')}>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {[
                t('shortcutPlay'),
                t('shortcutSeek'),
                t('shortcutVolume'),
                t('shortcutFullscreen'),
                t('shortcutSnapshot'),
                t('shortcutOpen'),
                t('shortcutUrl'),
                t('shortcutFrame'),
                t('shortcutNext'),
                t('shortcutMute'),
                t('shortcutPlaylist')
              ].map((line) => (
                <div
                  key={line}
                  className="rounded-lg border px-2 py-1 text-start font-mono text-[9.5px] font-semibold text-[var(--muted)]"
                  style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}
                >
                  {line}
                </div>
              ))}
            </div>
          </Section>

          <Section icon={<Info size={14} />} title={t('aboutSection')}>
            <div className="flex items-start gap-3">
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-black"
                style={{ background: 'linear-gradient(135deg, var(--accent), #38bdf8)' }}
              >
                <Play size={20} />
              </span>
              <div className="min-w-0 text-[10px] leading-relaxed text-[var(--muted)]">
                <div className="text-[12px] font-extrabold text-[var(--text)]">
                  {t('appName')} {props.version ? `· v${props.version.app}` : ''}
                </div>
                <div className="mt-0.5">
                  {t('engine')}:{' '}
                  <span style={{ color: props.version?.ffmpeg ? 'var(--accent)' : '#f59e0b' }}>
                    {props.version?.ffmpeg ? t('engineReady') : t('engineMissing')}
                  </span>
                  {props.version ? ` · Electron ${props.version.electron}` : ''}
                </div>
                <div>
                  {t('license')}: GPL-3.0
                </div>
                <div className="mt-0.5 font-semibold text-[var(--text)]">
                  {t('developedBy', { name: t('developerName') })}
                </div>
                <p className="mt-1.5 leading-relaxed">{t('inspiration')}</p>
              </div>
            </div>
          </Section>
        </div>

        <div className="flex items-center justify-between border-t px-5 py-3" style={{ borderColor: 'var(--border)' }}>
          <span className="text-[9.5px] text-[var(--muted)]">{t('settingsSaved')}</span>
          <button type="button" className="btn-primary h-9 px-5 text-[11px] font-extrabold" onClick={props.onClose}>
            {t('done')}
          </button>
        </div>
      </div>
    </div>
  )
}
