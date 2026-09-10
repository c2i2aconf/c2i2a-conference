import { getTranslations, setRequestLocale } from 'next-intl/server'
import Image from 'next/image'
import { RichText } from '@payloadcms/richtext-lexical/react'
import { CalendarDays, MapPin } from 'lucide-react'
import {
  getCommittees,
  getEditionByYear,
  getGalleryItems,
  getImportantDates,
  getSessions,
  getSpeakers,
  getSponsors,
} from '@/lib/queries'
import { formatDate } from '@/lib/dates'
import { getMediaVariant } from '@/lib/media'
import { toScheduleSessions } from '@/lib/schedule'
import { notFound } from 'next/navigation'
import { ProgramSchedule } from '@/components/sections/ProgramSchedule'
import { Card, CardContent } from '@/components/ui/card'
import { PageHero } from '@/components/sections/PageHero'
import type { Metadata } from 'next'

type Props = { params: Promise<{ locale: 'fr' | 'en'; year: string }> }

// CMS edits revalidate on demand (collection hooks); hourly ISR is the fallback
export const revalidate = 3600

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

  const [sessions, speakers, gallery, importantDates, sponsors, committees] = await Promise.all([
    getSessions(edition.id, locale),
    getSpeakers(edition.id, locale),
    getGalleryItems(edition.id, locale),
    getImportantDates(edition.id, locale),
    getSponsors(edition.id, locale),
    getCommittees(edition.id, locale),
  ])

  return (
    <>
      <PageHero
        eyebrow={tArchive('editionLabel', { year: edition.year })}
        title={edition.title}
        subtitle={edition.theme || undefined}
      />
      <div className="container py-12 md:py-24">
        <section className="mb-16 grid items-start gap-8 lg:grid-cols-[1fr_auto]">
          {edition.description && (
            <article className="rich-text">
              <RichText data={edition.description} />
            </article>
          )}
          <div className="flex flex-col gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              {formatDate(edition.startDate, locale, {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
            {edition.venue && (
              <span className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2">
                <MapPin className="h-4 w-4 text-primary" />
                {edition.venue}
              </span>
            )}
          </div>
        </section>

        {importantDates.length > 0 && (
          <section className="mb-24">
            <h2 className="text-3xl font-bold mb-8 border-b pb-4">
              {tArchive('importantDates')}
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              {importantDates.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-5">
                    <p className="font-semibold">{item.label}</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {formatDate(item.date, locale, {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                      {item.endDate && (
                        <>
                          {' – '}
                          {formatDate(item.endDate, locale, {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </>
                      )}
                    </p>
                    {item.note && <p className="mt-1 text-sm text-muted-foreground">{item.note}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Program */}
        {sessions.length > 0 && (
          <section className="mb-24">
            <h2 className="text-3xl font-bold mb-8 border-b pb-4">{t('program')}</h2>
            <ProgramSchedule sessions={toScheduleSessions(sessions)} />
          </section>
        )}

        {/* Speakers */}
        {speakers.length > 0 && (
          <section className="mb-24">
            <h2 className="text-3xl font-bold mb-8 border-b pb-4">{t('speakers')}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {speakers.map((speaker) => {
                const photo = getMediaVariant(speaker.photo, 'card')
                return (
                  <Card key={speaker.id} className="text-center overflow-hidden">
                    <div className="aspect-square relative bg-muted">
                      {photo ? (
                        <Image
                          src={photo.url}
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
                      {speaker.affiliation && (
                        <p className="mt-1 text-xs text-muted-foreground">{speaker.affiliation}</p>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </section>
        )}

        {sponsors.length > 0 && (
          <section className="mb-24">
            <h2 className="text-3xl font-bold mb-8 border-b pb-4">{t('sponsors')}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sponsors.map((sponsor) => (
                <Card key={sponsor.id}>
                  <CardContent className="p-5">
                    <h3 className="font-semibold">{sponsor.name}</h3>
                    {sponsor.description && (
                      <p className="mt-2 text-sm text-muted-foreground">{sponsor.description}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {committees.length > 0 && (
          <section className="mb-24">
            <h2 className="text-3xl font-bold mb-8 border-b pb-4">{t('committees')}</h2>
            <div className="grid gap-8 lg:grid-cols-2">
              {committees.map((committee) => (
                <Card key={committee.id}>
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold">
                      {committee.type === 'scientific'
                        ? t('scientificCommittee')
                        : t('organizationCommittee')}
                    </h3>
                    <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                      {committee.members?.map((member) => (
                        <li key={member.id} className="text-sm">
                          <span className="font-medium">{member.name}</span>
                          {member.affiliation && (
                            <span className="block text-muted-foreground">
                              {member.affiliation}
                            </span>
                          )}
                          {member.role && (
                            <span className="block text-xs text-primary">{member.role}</span>
                          )}
                        </li>
                      ))}
                    </ul>
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
                const image = getMediaVariant(item.image, 'card')
                if (!image) return null
                return (
                  <div key={item.id} className="break-inside-avoid rounded-xl overflow-hidden">
                    <Image
                      src={image.url}
                      alt={item.caption || ''}
                      width={image.width ?? 768}
                      height={image.height ?? 512}
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
