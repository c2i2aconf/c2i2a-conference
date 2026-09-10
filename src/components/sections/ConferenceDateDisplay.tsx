import { CalendarDays } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

import type { Edition } from '@/payload-types'
import { formatDate } from '@/lib/dates'

export async function ConferenceDateDisplay({
  edition,
  locale,
  inverse = false,
  showEditorialNote = false,
}: {
  edition: Edition
  locale: 'fr' | 'en'
  inverse?: boolean
  showEditorialNote?: boolean
}) {
  const t = await getTranslations({ locale, namespace: 'conferenceDate' })
  const dateOptions: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }
  const colors = inverse
    ? 'border-white/20 bg-white/10 text-white/90'
    : 'border-border bg-card text-muted-foreground'

  if (edition.conferenceDateStatus === 'unresolved') {
    return (
      <div className={`rounded-xl border px-4 py-3 text-sm ${colors}`}>
        <p className="flex items-center gap-2 font-semibold">
          <CalendarDays className="h-4 w-4 text-accent" />
          {t('unresolved')}
        </p>
        <ul className="mt-2 space-y-1">
          {edition.conferenceDateCandidates?.map((candidate) => (
            <li key={candidate.id ?? `${candidate.date}-${candidate.source}`}>
              {formatDate(candidate.date, locale, dateOptions)} — {candidate.source}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs opacity-80">{t('awaitingConfirmation')}</p>
      </div>
    )
  }

  if (!edition.startDate || !edition.endDate) return null
  const sameDay = edition.startDate === edition.endDate
  return (
    <div className="flex flex-col items-center gap-2">
      <span
        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm ${colors}`}
      >
        <CalendarDays className="h-4 w-4 text-accent" />
        {formatDate(edition.startDate, locale, dateOptions)}
        {!sameDay && ` – ${formatDate(edition.endDate, locale, dateOptions)}`}
        {edition.conferenceDateStatus === 'provisional' && ` (${t('provisional')})`}
      </span>
      {showEditorialNote &&
        edition.conferenceDateStatus === 'provisional' &&
        edition.conferenceDateNote && (
          <p
            className={`max-w-2xl text-center text-xs ${inverse ? 'text-white/70' : 'text-muted-foreground'}`}
          >
            {edition.conferenceDateNote}
          </p>
        )}
    </div>
  )
}
