import { getTranslations, setRequestLocale } from 'next-intl/server'
import Image from 'next/image'
import { ArrowRight, BookOpen, Building2, Layers3, LockKeyhole, MapPin } from 'lucide-react'
import React from 'react'
import type { Metadata } from 'next'

import { Link } from '@/i18n/navigation'
import {
  getGalleryItems,
  getImportantDates,
  getLiveEdition,
  getSpeakers,
  getSponsors,
  getSiteSettings,
  getThematicAxes,
} from '@/lib/queries'
import { getServerURL } from '@/lib/server-url'
import { formatDate, toDateUTC } from '@/lib/dates'
import { getMediaUrl, getMediaVariant } from '@/lib/media'
import { Reveal } from '@/components/motion/Reveal'
import { Countdown } from '@/components/sections/Countdown'
import { ConferenceDateDisplay } from '@/components/sections/ConferenceDateDisplay'
import { MapEmbed } from '@/components/sections/MapEmbed'
import { SectionHeading } from '@/components/sections/SectionHeading'
import { Button } from '@/components/ui/button'

type Props = {
  params: Promise<{ locale: 'fr' | 'en' }>
}

// CMS edits revalidate on demand (collection hooks); hourly ISR is the fallback
export const revalidate = 3600

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const [edition, settings] = await Promise.all([getLiveEdition(locale), getSiteSettings(locale)])
  const title = edition?.title || settings?.siteName || 'C2I2A'
  const description = edition?.theme || settings?.siteTagline || undefined
  const image = getMediaUrl(edition?.bannerImage)
  const imageURL = image ? new URL(image, getServerURL()).toString() : `/${locale}/opengraph-image`
  return {
    title,
    description,
    alternates: { canonical: `/${locale}` },
    openGraph: {
      type: 'website',
      locale,
      title,
      description,
      images: [{ url: imageURL, width: 1200, height: 630 }],
    },
  }
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale })
  const [edition, settings] = await Promise.all([getLiveEdition(locale), getSiteSettings(locale)])

  const [speakers, dates, sponsors, gallery, axes] = edition
    ? await Promise.all([
        getSpeakers(edition.id, locale),
        getImportantDates(edition.id, locale),
        getSponsors(edition.id, locale),
        getGalleryItems(edition.id, locale),
        getThematicAxes(edition.id, locale),
      ])
    : [[], [], [], [], []]

  const keynotes = speakers.filter((s) => s.isKeynote).slice(0, 4)
  const chronologicalDates = [...dates].sort(
    (a, b) => toDateUTC(a.date).getTime() - toDateUTC(b.date).getTime(),
  )
  const futureDates = chronologicalDates.filter((item) => toDateUTC(item.date) >= new Date())
  const upcomingDates = (futureDates.length > 0 ? futureDates : chronologicalDates).slice(0, 4)
  const heroImage = getMediaVariant(edition?.bannerImage, 'hero')?.url ?? null
  const organizerLabel =
    edition?.organizers?.map(({ name }) => name).join(' + ') || settings?.organizationName || ''

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="relative isolate flex min-h-[680px] flex-col items-center justify-center overflow-hidden px-5 py-20 text-center sm:px-6 md:min-h-[720px]">
        {heroImage ? (
          <>
            <Image
              src={heroImage}
              alt=""
              fill
              priority
              sizes="100vw"
              className="absolute inset-0 -z-20 object-cover"
            />
            <div
              aria-hidden
              className="absolute inset-0 -z-10 bg-gradient-to-b from-[oklch(0.18_0.07_264/0.88)] via-[oklch(0.22_0.09_264/0.78)] to-[oklch(0.15_0.05_264/0.95)]"
            />
          </>
        ) : (
          <div aria-hidden className="bg-hero-fallback absolute inset-0 -z-20" />
        )}
        <div aria-hidden className="bg-dots absolute inset-0 -z-10" />

        <Reveal>
          <p className="mb-6 inline-flex rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/75 backdrop-blur-sm sm:text-sm">
            {edition?.editionNumber
              ? t('home.editionNumber', { number: edition.editionNumber })
              : t('home.organizedBy', { organization: organizerLabel })}
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <h1 className="font-display max-w-5xl text-5xl font-bold tracking-tight text-balance text-white sm:text-7xl lg:text-8xl">
            {edition?.title || settings?.siteName || 'C2I2A'}
          </h1>
        </Reveal>
        <Reveal delay={0.2}>
          <p className="mx-auto mt-6 max-w-3xl text-base leading-7 text-pretty text-white/80 sm:text-xl sm:leading-8">
            {edition?.theme ?? t('metadata.description')}
          </p>
        </Reveal>
        {edition && (
          <Reveal delay={0.3}>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm text-white/90">
              <ConferenceDateDisplay edition={edition} locale={locale} inverse />
              {edition.venue && (
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 backdrop-blur-sm">
                  <MapPin className="h-4 w-4 text-accent" />
                  {edition.venue}
                </span>
              )}
            </div>
          </Reveal>
        )}
        {edition && (
          <Reveal delay={0.4}>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Button
                asChild
                size="lg"
                className="bg-accent text-accent-foreground shadow-xl hover:bg-accent/90"
              >
                <Link href="/call-for-papers">
                  <BookOpen className="h-4 w-4" />
                  {t('home.callForPapersCta')}
                </Link>
              </Button>
              {edition.registrationEnabled && (
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-white/30 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                >
                  <Link href="/registration">{t('common.register')}</Link>
                </Button>
              )}
              {edition.submissionsEnabled && (
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
                >
                  <Link href="/submission">{t('common.submit')}</Link>
                </Button>
              )}
              {!edition.registrationEnabled && (
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-white/30 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                >
                  <Link href="/registration">{t('home.registrationDetailsCta')}</Link>
                </Button>
              )}
            </div>
          </Reveal>
        )}
        {edition?.conferenceDateStatus !== 'unresolved' && edition?.startDate && (
          <Reveal delay={0.5} className="mt-10">
            <Countdown target={edition.startDate} />
          </Reveal>
        )}
      </section>

      {/* ── About + edition metadata ─────────────────────────────── */}
      {edition && (
        <section className="container section-pad">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <Reveal>
              <SectionHeading
                align="left"
                eyebrow={`C2I2A ${edition.year}`}
                title={t('home.aboutTitle')}
                subtitle={edition.theme ?? undefined}
              >
                <div className="mt-6">
                  <Button asChild variant="outline">
                    <Link href="/about">
                      {t('home.aboutCta')}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </SectionHeading>
            </Reveal>
            <Reveal delay={0.15}>
              <dl className="academic-card divide-y overflow-hidden">
                {edition.editionNumber && (
                  <div className="flex gap-4 p-5 sm:p-6">
                    <Layers3 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t('home.editionLabel')}
                      </dt>
                      <dd className="mt-1 font-semibold">
                        {t('home.editionNumber', { number: edition.editionNumber })}
                      </dd>
                    </div>
                  </div>
                )}
                {organizerLabel && (
                  <div className="flex gap-4 p-5 sm:p-6">
                    <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t('home.organizersLabel')}
                      </dt>
                      <dd className="mt-1 font-semibold">{organizerLabel}</dd>
                    </div>
                  </div>
                )}
                <div className="flex gap-4 p-5 sm:p-6">
                  <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t('home.registrationLabel')}
                    </dt>
                    <dd className="mt-1 font-semibold">
                      {edition.registrationEnabled
                        ? t('home.registrationOpen')
                        : t('home.registrationPending')}
                    </dd>
                  </div>
                </div>
              </dl>
            </Reveal>
          </div>
        </section>
      )}

      {/* ── Thematic axes ────────────────────────────────────────── */}
      {axes.length > 0 && (
        <section className="border-y bg-muted/30 section-pad">
          <div className="container">
            <Reveal>
              <SectionHeading
                eyebrow={t('nav.callForPapers')}
                title={t('home.axesTitle')}
                subtitle={t('home.axesSubtitle', { count: axes.length })}
              />
            </Reveal>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {axes.slice(0, 6).map((axis, index) => (
                <Reveal key={axis.id} delay={index * 0.04}>
                  <article className="academic-card flex h-full gap-4 p-5 transition-transform hover:-translate-y-0.5">
                    <span className="font-display flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                        {axis.code}
                      </p>
                      <h3 className="mt-1 font-semibold leading-snug">{axis.title}</h3>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
            <Reveal className="mt-9 text-center">
              <Button asChild variant="outline">
                <Link href="/call-for-papers">
                  {t('home.exploreAxes', { count: axes.length })}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </Reveal>
          </div>
        </section>
      )}

      {/* ── Keynote speakers ─────────────────────────────────────── */}
      {keynotes.length > 0 && (
        <section className="border-y bg-muted/30 py-20 md:py-28">
          <div className="container">
            <Reveal>
              <SectionHeading
                eyebrow={t('home.keynotes')}
                title={t('home.speakersTitle')}
                subtitle={t('home.speakersSubtitle')}
              />
            </Reveal>
            <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {keynotes.map((speaker, i) => {
                const photo = getMediaVariant(speaker.photo, 'card')
                return (
                  <Reveal key={speaker.id} delay={i * 0.08}>
                    <div className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-xl">
                      <div className="relative aspect-square bg-muted">
                        {photo ? (
                          <Image
                            src={photo.url}
                            alt={speaker.name}
                            fill
                            sizes="(max-width: 640px) 100vw, 25vw"
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center font-display text-6xl font-bold text-muted-foreground/25">
                            {speaker.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="p-5">
                        <h3 className="font-semibold">{speaker.name}</h3>
                        {speaker.affiliation && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {speaker.affiliation}
                          </p>
                        )}
                      </div>
                    </div>
                  </Reveal>
                )
              })}
            </div>
            <Reveal className="mt-10 text-center">
              <Button asChild variant="outline">
                <Link href="/speakers">
                  {t('common.viewAll')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </Reveal>
          </div>
        </section>
      )}

      {/* ── Key dates ────────────────────────────────────────────── */}
      {upcomingDates.length > 0 && (
        <section className="container py-20 md:py-28">
          <Reveal>
            <SectionHeading
              eyebrow={t('nav.dates')}
              title={t('home.keyDatesTitle')}
              subtitle={t('home.keyDatesSubtitle')}
            />
          </Reveal>
          <div className="mx-auto mt-14 max-w-3xl space-y-4">
            {upcomingDates.map((item, i) => (
              <Reveal key={item.id} delay={i * 0.06}>
                <div className="flex items-center gap-5 rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
                  <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <span className="text-lg font-bold leading-none">
                      {toDateUTC(item.date).getUTCDate()}
                    </span>
                    <span className="mt-1 text-[10px] font-medium uppercase">
                      {formatDate(item.date, locale, { month: 'short' })}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium">{item.label}</p>
                    {item.note && <p className="text-sm text-muted-foreground">{item.note}</p>}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-10 text-center">
            <Button asChild variant="outline">
              <Link href="/dates">
                {t('common.viewAll')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </Reveal>
        </section>
      )}

      {/* ── Sponsors wall ────────────────────────────────────────── */}
      {sponsors.length > 0 && (
        <section className="border-y bg-muted/30 py-20 md:py-28">
          <div className="container">
            <Reveal>
              <SectionHeading
                eyebrow={t('nav.sponsors')}
                title={t('home.sponsorsTitle')}
                subtitle={t('home.sponsorsSubtitle')}
              />
            </Reveal>
            <div className="mt-14 flex flex-wrap items-center justify-center gap-x-12 gap-y-8">
              {sponsors.map((sponsor) => {
                const logo = getMediaVariant(sponsor.logo, 'thumbnail')
                const content = logo ? (
                  <Image
                    src={logo.url}
                    alt={sponsor.name}
                    width={logo.width ?? 160}
                    height={logo.height ?? 64}
                    className="h-12 w-auto object-contain opacity-70 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0"
                  />
                ) : (
                  <span className="font-display text-lg font-semibold text-muted-foreground transition-colors hover:text-primary">
                    {sponsor.name}
                  </span>
                )
                return (
                  <Reveal key={sponsor.id}>
                    {sponsor.website ? (
                      <a href={sponsor.website} target="_blank" rel="noopener noreferrer">
                        {content}
                      </a>
                    ) : (
                      content
                    )}
                  </Reveal>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Gallery strip ────────────────────────────────────────── */}
      {gallery.length > 0 && (
        <section className="container py-20 md:py-28">
          <Reveal>
            <SectionHeading
              eyebrow={t('nav.gallery')}
              title={t('home.galleryTitle')}
              subtitle={t('home.gallerySubtitle')}
            />
          </Reveal>
          <div className="mt-14 grid grid-cols-2 gap-4 md:grid-cols-4">
            {gallery.slice(0, 4).map((item, i) => {
              const src = getMediaVariant(item.image, 'card')?.url
              if (!src) return null
              return (
                <Reveal key={item.id} delay={i * 0.06}>
                  <div className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
                    <Image
                      src={src}
                      alt={item.caption || ''}
                      fill
                      sizes="(max-width: 768px) 50vw, 25vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                </Reveal>
              )
            })}
          </div>
          <Reveal className="mt-10 text-center">
            <Button asChild variant="outline">
              <Link href="/gallery">
                {t('common.viewAll')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </Reveal>
        </section>
      )}

      {/* ── Venue teaser ─────────────────────────────────────────── */}
      {edition?.venue && (
        <section className="bg-band bg-dots relative overflow-hidden py-20 md:py-28">
          <div className="container text-center">
            <Reveal>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
                {t('home.venueSubtitle')}
              </p>
              <h2 className="font-display mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {edition.venue}
              </h2>
              {edition.venueAddress && (
                <p className="mx-auto mt-4 max-w-xl whitespace-pre-line text-white/70">
                  {edition.venueAddress}
                </p>
              )}
              <Button asChild className="mt-8 bg-accent text-accent-foreground hover:bg-accent/90">
                <Link href="/access">
                  {t('home.venueCta')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </Reveal>
            {edition.venueMapUrl && (
              <Reveal delay={0.1} className="mx-auto mt-10 max-w-3xl">
                <MapEmbed
                  url={edition.venueMapUrl}
                  title={edition.venue}
                  className="h-[340px] md:h-[380px]"
                />
              </Reveal>
            )}
          </div>
        </section>
      )}
    </>
  )
}
