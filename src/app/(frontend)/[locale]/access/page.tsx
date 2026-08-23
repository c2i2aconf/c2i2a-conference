import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ExternalLink, MapPin } from 'lucide-react'
import type { Metadata } from 'next'

import { getLiveEdition } from '@/lib/queries'
import { PageHero } from '@/components/sections/PageHero'
import { MapEmbed } from '@/components/sections/MapEmbed'
import { Reveal } from '@/components/motion/Reveal'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

// CMS edits revalidate on demand (collection hooks); hourly ISR is the fallback
export const revalidate = 3600

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: 'fr' | 'en' }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'access' })
  return { title: t('title') }
}

export default async function AccessPage({ params }: { params: Promise<{ locale: 'fr' | 'en' }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: 'access' })
  const edition = await getLiveEdition(locale)

  return (
    <>
      <PageHero title={t('title')} subtitle={t('subtitle')} />

      <section className="container py-16 md:py-24">
        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-2">
          <Reveal>
            <Card className="h-full">
              <CardContent className="space-y-6 p-8">
                <div>
                  <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    <MapPin className="h-4 w-4 text-accent" />
                    {t('venue')}
                  </h2>
                  <p className="font-display mt-2 text-2xl font-bold">
                    {edition?.venue || t('unavailable')}
                  </p>
                </div>
                {edition?.venueAddress && (
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      {t('address')}
                    </h3>
                    <p className="mt-2 whitespace-pre-line">{edition.venueAddress}</p>
                  </div>
                )}
                {edition?.venueMapUrl && (
                  <Button asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
                    <a href={edition.venueMapUrl} target="_blank" rel="noopener noreferrer">
                      {t('directions')}
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          </Reveal>

          <Reveal delay={0.15}>
            <MapEmbed url={edition?.venueMapUrl} title={t('map')} />
          </Reveal>
        </div>
      </section>
    </>
  )
}
