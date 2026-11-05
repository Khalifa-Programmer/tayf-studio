import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactElement } from 'react'
import type { UrlHistoryItem } from '../../../shared/types'
import type { TFunction } from '../i18n'
import { cn } from '../utils'
import { Shell } from './ToolModals'
import { Alert, Globe, Link, Loader, Trash, X } from './Icons'

interface UrlModalProps {
  onOpen: (url: string) => Promise<string | null> // يرجع رسالة خطأ أو null عند النجاح
  onClose: () => void
  t: TFunction
}

export default function UrlModal(props: UrlModalProps): ReactElement {
  const { t } = props
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [history, setHistory] = useState<UrlHistoryItem[]>([])
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    let alive = true
    window.tayfAPI
      .getUrlHistory()
      .then((list) => {
        if (alive) {
          setHistory(list)
          setHistoryLoaded(true)
        }
      })
      .catch(() => {
        if (alive) setHistoryLoaded(true)
      })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const submit = async (raw: string): Promise<void> => {
    const url = raw.trim()
    if (!/^https?:\/\/[^\s]+$/i.test(url)) {
      setError(t('invalidUrl'))
      return
    }
    setBusy(true)
    setError('')
    try {
      const failure = await props.onOpen(url)
      if (failure) {
        setError(failure)
        setBusy(false)
        return
      }
      // نجح الفتح — النافذة تُغلق من الأب.
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    void submit(value)
  }

  const pickHistory = (item: UrlHistoryItem): void => {
    setValue(item.url)
    setError('')
    void submit(item.url)
  }

  const clearHistory = (): void => {
    setHistory([])
    window.tayfAPI.clearUrlHistory().catch(() => undefined)
  }

  return (
    <Shell
      title={t('openUrl')}
      description={t('openUrlDesc')}
      badge={<Globe size={20} />}
      onClose={props.onClose}
      t={t}
      footer={
        <>
          <button type="button" className="btn-ghost h-9 px-4 text-[12px] font-bold" onClick={props.onClose}>
            {t('cancel')}
          </button>
          <button
            type="submit"
            form="url-open-form"
            className="btn-primary inline-flex h-9 items-center gap-2 px-5 text-[12px]"
            disabled={busy || value.trim().length === 0}
            data-testid="url-open"
          >
            {busy ? <Loader size={15} className="animate-spin" /> : <Link size={15} />}
            {busy ? t('connecting') : t('openUrlAction')}
          </button>
        </>
      }
    >
      <form id="url-open-form" onSubmit={onSubmit} className="flex flex-col gap-3">
        <label className="block">
          <span className="mb-1 flex items-center justify-between text-[10.5px] font-bold text-[var(--muted)]">
            <span>{t('openUrl')}</span>
            <span className="font-medium opacity-80">{t('protocolHint')}</span>
          </span>
          <input
            ref={inputRef}
            type="text"
            dir="ltr"
            autoComplete="off"
            spellCheck={false}
            placeholder={t('urlPlaceholder')}
            value={value}
            onChange={(event) => {
              setValue(event.target.value)
              if (error) setError('')
            }}
            className="field h-11 w-full font-mono text-[12px]"
            data-testid="url-input"
            aria-label={t('openUrl')}
          />
        </label>

        <p className="text-[10px] text-[var(--muted)]">{t('urlExamples')}</p>

        {error ? (
          <div
            role="alert"
            data-testid="url-error"
            className="flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-[11px] leading-relaxed text-red-300"
          >
            <Alert size={15} className="mt-0.5 shrink-0" />
            <span className="min-w-0 break-words">{error}</span>
          </div>
        ) : null}
      </form>

      <div className="mt-4 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-[10.5px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
            {t('urlHistoryTitle')}
          </span>
          {history.length > 0 ? (
            <button
              type="button"
              className="inline-flex h-7 items-center gap-1.5 rounded-lg px-2 text-[10.5px] font-bold text-[var(--muted)] transition-colors hover:bg-[var(--elevated)] hover:text-red-400"
              onClick={clearHistory}
              data-testid="url-clear-history"
            >
              <Trash size={12} />
              {t('clearUrlHistory')}
            </button>
          ) : null}
        </div>

        {!historyLoaded ? (
          <div className="flex items-center gap-2 px-2 py-3 text-[11px] text-[var(--muted)]">
            <Loader size={13} className="animate-spin" />
            {t('loading')}
          </div>
        ) : history.length === 0 ? (
          <p className="px-2 py-3 text-center text-[11px] text-[var(--muted)]">{t('noUrlHistory')}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {history.map((item) => (
              <li key={item.url}>
                <button
                  type="button"
                  onClick={() => pickHistory(item)}
                  className={cn(
                    'group flex w-full items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 text-start transition-colors',
                    'hover:border-[var(--border)] hover:bg-[var(--elevated)]'
                  )}
                  title={item.url}
                  data-testid="url-history-item"
                >
                  <Globe size={14} className="shrink-0 text-[var(--muted)] group-hover:text-[var(--accent)]" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11.5px] font-semibold">{item.name}</span>
                    <span dir="ltr" className="block truncate text-start font-mono text-[9px] text-[var(--muted)]">
                      {item.url}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Shell>
  )
}
