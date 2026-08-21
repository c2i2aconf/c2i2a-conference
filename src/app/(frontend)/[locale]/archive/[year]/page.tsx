import { getTranslations, setRequestLocale } from 'next-intl/server'
import Image from 'next/image'
import { getEditionByYear, getSessions, getSpeakers, getGalleryItems } from '@/lib/queries'
import { notFound } from 'next/navigation'
import { ProgramSchedule } from '@/components/sections/ProgramSchedule'
import { Card, CardContent } from '@/components/ui/card'
import { PageHero } from '@/components/sections/PageHero'
import type { Metadata } from 'next'

type Props = { params: Promise<{ locale: 'fr' | 'en'; year: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, year } = await params
  const edition = await getEditionByYear(Number(year), locale)
  if (!edition || edition.editionStatus !== 'archived') return { title: year }
  const image =
    edition.bannerImage && typeof edition.bannerImage === 'object' ? edition.bannerImage.url : null
  return {
    title: edition.title,
    description: edition.theme || undefined,
    alternates: { canonical: `/${locale}/archive/${year}` },
    openGraph: {
      title: edition.title,
      description: edition.theme || undefined,
      images: image ? [{ url: image }] : [{ url: `/${locale}/archive/${year}/opengraph-image` }],
    },
  }
}

export default async function ArchiveYearPage({ params }: Props) {
  const { locale, year } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: 'nav' })
  const tArchive = await getTranslations({ locale, namespace: 'archive' })
  const edition = await getEditionByYear(parseInt(year, 10), locale)

  if (!edition || edition.editionStatus !== 'archived') {
    notFound()
  }

  const sessions = await getSessions(edition.id, locale)
  const speakers = await getSpeakers(edition.id, locale)
  const gallery = await getGalleryItems(edition.id, locale)

  return (
    <>
      <PageHero
        eyebrow={tArchive('editionLabel', { year: edition.year })}
        title={edition.title}
        subtitle={edition.theme || undefined}
      />
      <div className="container py-12 md:py-24">
        {/* Program */}
        <section className="mb-24">
          <h2 className="text-3xl font-bold mb-8 border-b pb-4">{t('program')}</h2>
          <ProgramSchedule sessions={sessions} />
        </section>

        {/* Speakers */}
        {speakers.length > 0 && (
          <section className="mb-24">
            <h2 className="text-3xl font-bold mb-8 border-b pb-4">{t('speakers')}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {speakers.map((speaker) => (
                <Card key={speaker.id} className="text-center overflow-hidden">
                  <div className="aspect-square relative bg-muted">
                    {speaker.photo && typeof speaker.photo === 'object' && speaker.photo.url ? (
                      <Image
                        src={speaker.photo.url}
                        alt={speaker.name}
                        fill
                        sizes="(max-width: 640px) 50vw, 16vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl text-muted-foreground/30 font-bold">
                        {speaker.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <h3 className="font-semibold text-sm line-clamp-2">{speaker.name}</h3>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Gallery */}
        {gallery.length > 0 && (
          <section className="mb-24">
            <h2 className="text-3xl font-bold mb-8 border-b pb-4">{t('gallery')}</h2>
            <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
              {gallery.map((item) => {
                if (!item.image || typeof item.image !== 'object' || !item.image.url) return null
                return (
                  <div key={item.id} className="break-inside-avoid rounded-xl overflow-hidden">
                    <Image
                      src={item.image.url}
                      alt={item.caption || ''}
                      width={item.image.width ?? 1200}
                      height={item.image.height ?? 800}
                      sizes="(max-width: 768px) 50vw, 25vw"
                      className="w-full h-auto"
                    />
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </div>
    </>
  )
}
