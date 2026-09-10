import { getTranslations, setRequestLocale } from 'next-intl/server'
import Image from 'next/image'
import type { Metadata } from 'next'

import { getArchivedEditions } from '@/lib/queries'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { PageHero } from '@/components/sections/PageHero'
import { Link } from '@/i18n/navigation'
import { ArrowRight, CalendarDays, MapPin } from 'lucide-react'
import { formatDate } from '@/lib/dates'

// CMS edits revalidate on demand (collection hooks); hourly ISR is the fallback
export const revalidate = 3600

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: 'fr' | 'en' }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'archive' })
  return { title: t('title') }
}

export default async function ArchiveIndexPage({
  params,
}: {
  params: Promise<{ locale: 'fr' | 'en' }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: 'archive' })
  const archives = await getArchivedEditions(locale)

  return (
    <>
      <PageHero title={t('title')} subtitle={t('subtitle')} />
      <div className="container section-pad max-w-6xl">
        {archives.length === 0 ? (
          <p className="text-center text-muted-foreground">{t('empty')}</p>
        ) : (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {archives.map((edition) => (
              <Link
                key={edition.id}
                href={`/archive/${edition.year}`}
                className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40"
              >
                <Card className="academic-card h-full overflow-hidden py-0 transition-all group-hover:-translate-y-1 group-hover:border-primary/40 group-hover:shadow-xl sm:grid sm:grid-cols-[180px_1fr]">
                  {edition.posterImage &&
                  typeof edition.posterImage === 'object' &&
                  edition.posterImage.url ? (
                    <div className="relative aspect-[4/3] overflow-hidden bg-muted sm:aspect-auto sm:min-h-[290px]">
                      <Image
                        src={edition.posterImage.url}
                        alt={edition.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-contain p-3 transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    </div>
                  ) : (
                    <div className="flex aspect-[4/3] items-center justify-center bg-primary/5 sm:aspect-auto sm:min-h-[290px]">
                      <span className="font-display text-5xl font-bold text-primary/20">
                        {edition.year}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-col">
                    <CardHeader className="pb-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
                          {t('editionLabel', { year: edition.year })}
                        </span>
                      </div>
                      <CardTitle className="font-display text-2xl leading-tight transition-colors group-hover:text-primary">
                        {edition.title}
                      </CardTitle>
                      {edition.theme && (
                        <CardDescription className="line-clamp-3 leading-6">
                          {edition.theme}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="mt-auto pb-6">
                      <div className="space-y-2 text-sm text-muted-foreground">
                        {edition.startDate && (
                          <p className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-accent" />
                            {formatDate(edition.startDate, locale, {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </p>
                        )}
                        {edition.venue && (
                          <p className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-accent" />
                            {edition.venue}
                          </p>
                        )}
                      </div>
                      <span className="mt-5 inline-flex items-center text-sm font-semibold text-primary">
                        {t('viewEdition')}{' '}
                        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </span>
                    </CardContent>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
