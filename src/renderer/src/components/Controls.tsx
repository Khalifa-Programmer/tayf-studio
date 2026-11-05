import { useState } from 'react'
import type { CSSProperties, ReactElement } from 'react'
import type { MediaItem } from '../../../shared/types'
import type { TFunction } from '../i18n'
import { cn, formatTime } from '../utils'
import {
  Camera,
  Forward,
  FullscreenExit,
  Gauge,
  List,
  Maximize,
  Mini,
  Next,
  Pause,
  Play,
  Previous,
  Repeat,
  RepeatOne,
  Rewind,
  Shuffle,
  Subtitles,
  Volume,
  VolumeOff
} from './Icons'

interface ControlsProps {
  item: MediaItem | null
  playing: boolean
  currentTime: number
  duration: number
  volume: number
  muted: boolean
  rate: number
  repeat: 'off' | 'one' | 'all'
  shuffle: boolean
  playlistOpen: boolean
  mini: boolean
  isFullscreen: boolean
  subtitleEnabled: boolean
  hasSubtitle: boolean
  subtitleDelay: number
  seekStep: number
  onTogglePlay: () => void
  onPrevious: () => void
  onNext: () => void
  onSeek: (time: number) => void
  onSeekBy: (delta: number) => void
  onVolume: (value: number) => void
  onToggleMute: () => void
  onRate: (value: number) => void
  onCycleRepeat: () => void
  onToggleShuffle: () => void
  onSnapshot: () => void
  onToggleSubtitle: () => void
  onAddSubtitle: () => void
  onSubtitleDelay: (delta: number) => void
  onTogglePlaylist: () => void
  onToggleFullscreen: () => void
  onToggleMini: () => void
  t: TFunction
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

export default function Controls(props: ControlsProps): ReactElement {
  const { t, item } = props
  const [speedOpen, setSpeedOpen] = useState(false)
  const progress = props.duration > 0 ? Math.min(100, (props.currentTime / props.duration) * 100) : 0
  const volumePercent = Math.round((props.muted ? 0 : props.volume) * 100)
  const disabled = !item

  return (
    <footer className="panel relative z-20 shrink-0 border-t px-3 pb-2 pt-1.5" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-2" dir="ltr">
        <span className="w-11 text-right text-[10px] font-semibold tabular-nums text-[var(--muted)]">
          {formatTime(props.currentTime)}
        </span>
        <input
          type="range"
          min={0}
          max={Math.max(props.duration, 0.1)}
          step={0.05}
          value={Math.min(props.currentTime, Math.max(props.duration, 0.1))}
          onChange={(event) => props.onSeek(Number(event.target.value))}
          className="h-4 flex-1"
          style={{ '--fill': `${progress}%` } as CSSProperties}
          disabled={disabled}
          aria-label={t('durationLabel')}
        />
        <span className="w-11 text-left text-[10px] font-semibold tabular-nums text-[var(--muted)]">
          {formatTime(props.duration)}
        </span>
      </div>

      <div className="mt-0.5 flex items-center gap-1.5">
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            className="btn-icon h-8 w-8"
            title={`${t('seekBack')} ${props.seekStep}${t('secondsUnit')}`}
            aria-label={`${t('seekBack')} ${props.seekStep}${t('secondsUnit')}`}
            onClick={() => props.onSeekBy(-props.seekStep)}
            disabled={disabled}
            data-testid="seek-back"
          >
            <Rewind size={17} />
          </button>
          <button
            type="button"
            className="btn-icon h-8 w-8"
            title={t('previous')}
            onClick={props.onPrevious}
            disabled={disabled}
          >
            <Previous size={17} />
          </button>
          <button
            type="button"
            className="btn-primary flex h-10 w-10 items-center justify-center rounded-full"
            title={props.playing ? t('pause') : t('play')}
            onClick={props.onTogglePlay}
            disabled={disabled}
          >
            {props.playing ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: 2 }} />}
          </button>
          <button
            type="button"
            className="btn-icon h-8 w-8"
            title={t('next')}
            onClick={props.onNext}
            disabled={disabled}
          >
            <Next size={17} />
          </button>
          <button
            type="button"
            className="btn-icon h-8 w-8"
            title={`${t('seekForward')} ${props.seekStep}${t('secondsUnit')}`}
            aria-label={`${t('seekForward')} ${props.seekStep}${t('secondsUnit')}`}
            onClick={() => props.onSeekBy(props.seekStep)}
            disabled={disabled}
            data-testid="seek-forward"
          >
            <Forward size={17} />
          </button>
        </div>

        <div className="mx-1 hidden h-6 w-px bg-[var(--border)] sm:block" />

        <div className="hidden items-center gap-1 sm:flex" dir="ltr">
          <button
            type="button"
            className={cn('btn-icon h-8 w-8', props.muted && 'text-[var(--accent)]')}
            title={props.muted ? t('unmute') : t('mute')}
            onClick={props.onToggleMute}
          >
            {props.muted || props.volume === 0 ? <VolumeOff size={16} /> : <Volume size={16} />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={props.volume}
            onChange={(event) => props.onVolume(Number(event.target.value))}
            className="w-16"
            style={{ '--fill': `${volumePercent}%` } as CSSProperties}
            aria-label={t('volume')}
          />
        </div>

        <div className="min-w-0 flex-1 px-1 text-center">
          {item ? (
            <div className="mx-auto flex max-w-[42vw] items-center justify-center gap-1.5">
              <span className="truncate text-[11px] font-semibold" title={item.name}>
                {item.name}
              </span>
              {item.type === 'audio' ? <span className="text-[10px] text-[var(--muted)]">♪</span> : null}
            </div>
          ) : (
            <span className="text-[10px] text-[var(--muted)]">{t('noMedia')}</span>
          )}
        </div>

        <div className="flex items-center gap-0.5">
          {!props.mini ? (
            <>
              {props.hasSubtitle || props.subtitleEnabled ? (
                <div className="hidden items-center gap-0.5 rounded-lg bg-[var(--panel-2)] px-0.5 sm:flex" dir="ltr">
                  <button
                    type="button"
                    className="btn-icon h-7 px-1.5 text-[10px] font-bold"
                    title={t('delayMinus')}
                    onClick={() => props.onSubtitleDelay(-0.5)}
                  >
                    −0.5
                  </button>
                  <span className="w-9 text-center text-[9px] tabular-nums text-[var(--muted)]">
                    {props.subtitleDelay > 0 ? '+' : ''}
                    {props.subtitleDelay.toFixed(1)}
                  </span>
                  <button
                    type="button"
                    className="btn-icon h-7 px-1.5 text-[10px] font-bold"
                    title={t('delayPlus')}
                    onClick={() => props.onSubtitleDelay(0.5)}
                  >
                    +0.5
                  </button>
                </div>
              ) : null}
              <button
                type="button"
                className={cn('btn-icon h-8 w-8', props.subtitleEnabled && 'text-[var(--accent)]')}
                title={props.subtitleEnabled ? t('turnSubtitlesOff') : t('turnSubtitlesOn')}
                onClick={props.onToggleSubtitle}
                disabled={!props.hasSubtitle}
              >
                <Subtitles size={17} />
              </button>
              <button
                type="button"
                className="btn-icon hidden h-8 w-8 sm:flex"
                title={t('addSubtitle')}
                onClick={props.onAddSubtitle}
              >
                <span className="relative">
                  <Subtitles size={17} />
                  <span className="absolute -bottom-1 -start-1 text-[11px] font-black leading-none text-[var(--accent)]">
                    +
                  </span>
                </span>
              </button>
              <button
                type="button"
                className="btn-icon hidden h-8 w-8 sm:flex"
                title={t('snapshot')}
                onClick={props.onSnapshot}
                disabled={!item || item.type !== 'video'}
              >
                <Camera size={17} />
              </button>
            </>
          ) : null}

          <div className="relative">
            <button
              type="button"
              className={cn('btn-icon h-8 gap-1 px-1.5 text-[10px] font-bold', speedOpen && 'bg-[var(--elevated)]')}
              title={t('speed')}
              onClick={() => setSpeedOpen((value) => !value)}
            >
              <Gauge size={15} />
              <span className="tabular-nums">{props.rate.toFixed(2).replace(/0$/, '')}x</span>
            </button>
            {speedOpen ? (
              <>
                <div className="fixed inset-0 z-40" onMouseDown={() => setSpeedOpen(false)} />
                <div className="panel fade-in absolute bottom-[calc(100%+6px)] end-0 z-50 w-24 rounded-xl border py-1 shadow-2xl">
                  {SPEEDS.map((speed) => (
                    <button
                      key={speed}
                      type="button"
                      className={cn(
                        'block w-full px-3 py-1.5 text-center text-[11px] font-semibold hover:bg-[var(--elevated)]',
                        Math.abs(props.rate - speed) < 0.001 && 'text-[var(--accent)]'
                      )}
                      onClick={() => {
                        props.onRate(speed)
                        setSpeedOpen(false)
                      }}
                    >
                      {speed === 1 ? t('normalSpeed') : `${speed}x`}
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </div>

          {!props.mini ? (
            <>
              <button
                type="button"
                className={cn('btn-icon hidden h-8 w-8 sm:flex', props.repeat !== 'off' && 'text-[var(--accent)]')}
                title={
                  props.repeat === 'one' ? t('repeatOne') : props.repeat === 'all' ? t('repeatAll') : t('repeatOff')
                }
                onClick={props.onCycleRepeat}
              >
                {props.repeat === 'one' ? <RepeatOne size={17} /> : <Repeat size={17} />}
              </button>
              <button
                type="button"
                className={cn('btn-icon hidden h-8 w-8 sm:flex', props.shuffle && 'text-[var(--accent)]')}
                title={t('shuffle')}
                onClick={props.onToggleShuffle}
              >
                <Shuffle size={17} />
              </button>
              <button
                type="button"
                className={cn('btn-icon hidden h-8 w-8 sm:flex', props.playlistOpen && 'text-[var(--accent)]')}
                title={props.playlistOpen ? t('hidePlaylist') : t('showPlaylist')}
                onClick={props.onTogglePlaylist}
              >
                <List size={17} />
              </button>
              <button
                type="button"
                className="btn-icon hidden h-8 w-8 md:flex"
                title={props.mini ? t('exitMini') : t('miniMode')}
                onClick={props.onToggleMini}
              >
                <Mini size={16} />
              </button>
            </>
          ) : null}

          <button
            type="button"
            className="btn-icon h-8 w-8"
            title={props.isFullscreen ? t('exitFullscreen') : t('fullscreen')}
            onClick={props.onToggleFullscreen}
          >
            {props.isFullscreen ? <FullscreenExit size={17} /> : <Maximize size={17} />}
          </button>
        </div>
      </div>
    </footer>
  )
}
