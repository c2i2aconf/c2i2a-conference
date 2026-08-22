import { getTranslations, setRequestLocale } from 'next-intl/server'
import Image from 'next/image'
import type { Metadata } from 'next'

import { getLiveEdition, getSpeakers } from '@/lib/queries'
import { getMediaVariant } from '@/lib/media'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHero } from '@/components/sections/PageHero'
import { Star, Link as LinkIcon, Globe } from 'lucide-react'

// CMS edits revalidate on demand (collection hooks); hourly ISR is the fallback
export const revalidate = 3600

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: 'fr' | 'en' }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'speakers' })
  return { title: t('title') }
}

export default async function SpeakersPage({
  params,
}: {
  params: Promise<{ locale: 'fr' | 'en' }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: 'speakers' })
  const edition = await getLiveEdition(locale)
  const speakers = edition ? await getSpeakers(edition.id, locale) : []

  return (
    <>
      <PageHero title={t('title')} subtitle={t('subtitle')} />
      <div className="container py-12 md:py-20">
        {!edition || speakers.length === 0 ? (
          <p className="text-center text-muted-foreground">{t('empty')}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {speakers.map((speaker) => {
              const photo = getMediaVariant(speaker.photo, 'card')
              return (
                <Card key={speaker.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="aspect-square relative bg-muted flex items-center justify-center">
                    {photo ? (
                      <Image
                        src={photo.url}
                        alt={speaker.name}
                        fill
                        sizes="(max-width: 640px) 100vw, 25vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="text-6xl text-muted-foreground/30 font-bold">
                        {speaker.name.charAt(0)}
                      </div>
                    )}
                    {speaker.isKeynote && (
                      <Badge className="absolute top-4 right-4 bg-primary text-primary-foreground">
                        <Star className="w-3 h-3 mr-1 fill-current" />
                        {t('keynote')}
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold mb-1">{speaker.name}</h3>
                    {speaker.affiliation && (
                      <p className="text-sm text-muted-foreground mb-4">{speaker.affiliation}</p>
                    )}

                    {(speaker.linkedin || speaker.website) && (
                      <div className="flex gap-3 mt-4 pt-4 border-t">
                        {speaker.linkedin && (
                          <a
                            href={speaker.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-primary transition-colors"
                          >
                            <LinkIcon className="w-4 h-4" />
                          </a>
                        )}
                        {speaker.website && (
                          <a
                            href={speaker.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-primary transition-colors"
                          >
                            <Globe className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
