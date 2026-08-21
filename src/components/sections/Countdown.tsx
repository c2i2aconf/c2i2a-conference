'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

interface CountdownProps {
  /** ISO date string of the conference start */
  target: string
  tone?: 'dark' | 'card'
}

function getParts(targetMs: number) {
  const diff = Math.max(0, targetMs - Date.now())
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff / 3_600_000) % 24),
    minutes: Math.floor((diff / 60_000) % 60),
    seconds: Math.floor((diff / 1_000) % 60),
    done: diff === 0,
  }
}

/** Live countdown to the conference start; renders nothing once the event begins. */
export function Countdown({ target, tone = 'dark' }: CountdownProps) {
  const t = useTranslations('common')
  const targetMs = new Date(target).getTime()
  const [parts, setParts] = useState(() => getParts(targetMs))

  useEffect(() => {
    const id = setInterval(() => setParts(getParts(targetMs)), 1000)
    return () => clearInterval(id)
  }, [targetMs])

  if (parts.done) return null

  const cells = [
    { value: parts.days, label: t('days') },
    { value: parts.hours, label: t('hours') },
    { value: parts.minutes, label: t('minutes') },
    { value: parts.seconds, label: t('seconds') },
  ]

  return (
    <div className="flex items-stretch justify-center gap-3 sm:gap-6">
      {cells.map(({ value, label }) => (
        <div
          key={label}
          className={
            tone === 'dark'
              ? 'flex min-w-[4.25rem] flex-col items-center rounded-xl border border-white/15 bg-white/5 px-3 py-3 backdrop-blur-sm sm:min-w-[5.5rem] sm:px-5 sm:py-4'
              : 'flex min-w-[4.25rem] flex-col items-center rounded-xl border border-border bg-muted/40 px-3 py-3 sm:min-w-[5.5rem] sm:px-5 sm:py-4'
          }
        >
          <span
            suppressHydrationWarning
            className={`font-display text-3xl font-bold tabular-nums sm:text-4xl ${tone === 'dark' ? 'text-white' : 'text-primary'}`}
          >
            {String(value).padStart(2, '0')}
          </span>
          <span
            className={`mt-1 text-[11px] font-medium uppercase tracking-widest ${tone === 'dark' ? 'text-white/60' : 'text-muted-foreground'}`}
          >
            {label}
          </span>
        </div>
      ))}
    </div>
  )
}
