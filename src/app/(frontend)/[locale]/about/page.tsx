import { getTranslations, setRequestLocale } from 'next-intl/server'
import { RichText } from '@payloadcms/richtext-lexical/react'
import Image from 'next/image'
import { MapPin } from 'lucide-react'
import type { Metadata } from 'next'

import { getLiveEdition } from '@/lib/queries'
import { PageHero } from '@/components/sections/PageHero'
import { Reveal } from '@/components/motion/Reveal'
import { ConferenceDateDisplay } from '@/components/sections/ConferenceDateDisplay'

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

      <section className="container section-pad">
        {!edition || !edition.description ? (
          <p className="text-center text-muted-foreground">{t('empty')}</p>
        ) : (
          <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-16">
            <Reveal>
              <article className="rich-text max-w-3xl">
                <RichText data={edition.description} />
              </article>
              <div className="mt-10 flex flex-wrap gap-3 text-sm text-muted-foreground">
                <ConferenceDateDisplay edition={edition} locale={locale} showEditorialNote />
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
                <figure className="academic-card sticky top-24 overflow-hidden">
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
