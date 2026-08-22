import { getTranslations, setRequestLocale } from 'next-intl/server'
import { RichText } from '@payloadcms/richtext-lexical/react'
import Image from 'next/image'
import { CalendarDays, MapPin } from 'lucide-react'
import type { Metadata } from 'next'

import { getLiveEdition } from '@/lib/queries'
import { formatDate } from '@/lib/dates'
import { PageHero } from '@/components/sections/PageHero'
import { Reveal } from '@/components/motion/Reveal'

// CMS edits revalidate on demand (collection hooks); hourly ISR is the fallback
export const revalidate = 3600

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: 'fr' | 'en' }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'about' })
  return { title: t('title') }
}

export default async function AboutPage({ params }: { params: Promise<{ locale: 'fr' | 'en' }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: 'about' })
  const edition = await getLiveEdition(locale)

  const poster =
    edition?.posterImage && typeof edition.posterImage === 'object' && edition.posterImage.url
      ? edition.posterImage
      : null

  return (
    <>
      <PageHero eyebrow={edition ? `C2I2A ${edition.year}` : 'C2I2A'} title={t('title')} />

      <section className="container py-16 md:py-24">
        {!edition || !edition.description ? (
          <p className="text-center text-muted-foreground">{t('empty')}</p>
        ) : (
          <div className="grid items-start gap-12 lg:grid-cols-[1fr_320px]">
            <Reveal>
              <article className="rich-text">
                <RichText data={edition.description} />
              </article>
              <div className="mt-10 flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-1.5">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  {formatDate(edition.startDate, locale, {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                  {edition.endDate !== edition.startDate &&
                    ` – ${formatDate(edition.endDate, locale, { day: 'numeric', month: 'long', year: 'numeric' })}`}
                </span>
                {edition.venue && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-1.5">
                    <MapPin className="h-4 w-4 text-primary" />
                    {edition.venue}
                  </span>
                )}
              </div>
            </Reveal>
            {poster?.url && (
              <Reveal delay={0.15}>
                <figure className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
                  <Image
                    src={poster.url}
                    alt={t('poster')}
                    width={poster.width ?? 640}
                    height={poster.height ?? 900}
                    className="h-auto w-full object-cover"
                  />
                  <figcaption className="p-3 text-center text-xs text-muted-foreground">
                    {t('poster')}
                  </figcaption>
                </figure>
              </Reveal>
            )}
          </div>
        )}
      </section>
    </>
  )
}
