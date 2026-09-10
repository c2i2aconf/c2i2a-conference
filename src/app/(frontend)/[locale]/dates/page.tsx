import { getTranslations, setRequestLocale } from 'next-intl/server'
import type { Metadata } from 'next'

import { getLiveEdition, getImportantDates } from '@/lib/queries'
import { formatDate } from '@/lib/dates'
import { Badge } from '@/components/ui/badge'
import { PageHero } from '@/components/sections/PageHero'
import { CalendarDays } from 'lucide-react'

// CMS edits revalidate on demand (collection hooks); hourly ISR is the fallback
export const revalidate = 3600

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: 'fr' | 'en' }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'dates' })
  return { title: t('title') }
}

export default async function DatesPage({ params }: { params: Promise<{ locale: 'fr' | 'en' }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: 'dates' })
  const edition = await getLiveEdition(locale)
  const dates = edition ? await getImportantDates(edition.id, locale) : []
  const chronologicalDates = [...dates].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  )

  function getStatusColor(status: string) {
    switch (status) {
      case 'open':
        return 'bg-amber-500 text-white hover:bg-amber-600' // Gold
      case 'closed':
        return 'bg-muted text-muted-foreground hover:bg-muted'
      case 'extended':
        return 'bg-primary text-primary-foreground hover:bg-primary/90'
      default:
        return 'bg-secondary text-secondary-foreground'
    }
  }

  return (
    <>
      <PageHero title={t('title')} subtitle={t('subtitle')} />
      <div className="container section-pad mx-auto max-w-5xl">
        {!edition || dates.length === 0 ? (
          <p className="text-center text-muted-foreground">{t('empty')}</p>
        ) : (
          <ol className="relative space-y-5 before:absolute before:bottom-8 before:left-[1.15rem] before:top-8 before:w-px before:bg-border md:before:left-8">
            {chronologicalDates.map((item, index) => {
              const dateStr = formatDate(item.date, locale, {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })
              const endStr = item.endDate
                ? formatDate(item.endDate, locale, {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })
                : null

              return (
                <li key={item.id} className="relative pl-12 md:pl-20">
                  <span className="absolute left-0 top-7 z-10 flex h-10 w-10 items-center justify-center rounded-full border-4 border-background bg-primary text-xs font-bold text-primary-foreground md:left-3">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <article className="academic-card p-5 sm:p-6">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                      <div>
                        <p className="flex items-center gap-2 text-sm font-semibold text-primary">
                          <CalendarDays className="h-4 w-4" />
                          {dateStr} {endStr ? ` – ${endStr}` : ''}
                        </p>
                        <h2 className="mt-2 text-lg font-semibold sm:text-xl">{item.label}</h2>
                      </div>
                      <Badge className={getStatusColor(item.status)} variant="secondary">
                        {t(item.status)}
                      </Badge>
                    </div>
                    {item.note && <p className="text-sm mt-2 text-foreground/80">{item.note}</p>}
                  </article>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </>
  )
}
