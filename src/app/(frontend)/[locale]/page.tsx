import { getTranslations, setRequestLocale } from 'next-intl/server'
import Image from 'next/image'
import { ArrowRight, CalendarDays, MapPin } from 'lucide-react'
import React from 'react'
import type { Metadata } from 'next'

import { Link } from '@/i18n/navigation'
import type { Edition } from '@/payload-types'
import {
  getEditionStats,
  getGalleryItems,
  getImportantDates,
  getLiveEdition,
  getSpeakers,
  getSponsors,
  getSiteSettings,
} from '@/lib/queries'
import { getServerURL } from '@/lib/server-url'
import { formatDate, toDateUTC } from '@/lib/dates'
import { getMediaUrl, getMediaVariant } from '@/lib/media'
import { Reveal } from '@/components/motion/Reveal'
import { AnimatedCounter } from '@/components/motion/AnimatedCounter'
import { Countdown } from '@/components/sections/Countdown'
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

function formatDateRange(edition: Edition, locale: 'fr' | 'en') {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }
  const start = toDateUTC(edition.startDate)
  const end = toDateUTC(edition.endDate)
  if (start.toISOString() === end.toISOString()) {
    return formatDate(edition.startDate, locale, opts)
  }
  return `${formatDate(edition.startDate, locale, { day: 'numeric', month: 'long' })} – ${formatDate(edition.endDate, locale, opts)}`
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale })
  const [edition, settings] = await Promise.all([getLiveEdition(locale), getSiteSettings(locale)])

  const [stats, speakers, dates, sponsors, gallery] = edition
    ? await Promise.all([
        getEditionStats(edition.id),
        getSpeakers(edition.id, locale),
        getImportantDates(edition.id, locale),
        getSponsors(edition.id, locale),
        getGalleryItems(edition.id, locale),
      ])
    : [{ speakers: 0, sessions: 0, attendees: 0 }, [], [], [], []]

  const keynotes = speakers.filter((s) => s.isKeynote).slice(0, 4)
  const upcomingDates = dates.slice(0, 4)
  const heroImage = getMediaVariant(edition?.bannerImage, 'hero')?.url ?? null
  const days =
    edition && edition.startDate && edition.endDate
      ? Math.max(
          1,
          Math.round(
            (new Date(edition.endDate).getTime() - new Date(edition.startDate).getTime()) /
              86_400_000,
          ) + 1,
        )
      : 0

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="relative isolate flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center overflow-hidden px-6 py-24 text-center">
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
          <p className="mb-6 text-xs font-semibold uppercase tracking-[0.25em] text-white/70 sm:text-sm">
            {t('home.organizedBy', { organization: settings?.organizationName || '' })}
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <h1 className="font-display text-6xl font-bold tracking-tight text-white sm:text-7xl lg:text-8xl">
            {settings?.siteName || 'C2I2A'}
            {edition?.year ? <span className="text-gold-gradient"> {edition.year}</span> : null}
          </h1>
        </Reveal>
        <Reveal delay={0.2}>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80 sm:text-xl">
            {edition?.theme ?? t('metadata.description')}
          </p>
        </Reveal>
        {edition && (
          <Reveal delay={0.3}>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm text-white/90">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 backdrop-blur-sm">
                <CalendarDays className="h-4 w-4 text-accent" />
                {formatDateRange(edition, locale)}
              </span>
              {edition.venue && (
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 backdrop-blur-sm">
                  <MapPin className="h-4 w-4 text-accent" />
                  {edition.venue}
                </span>
              )}
            </div>
          </Reveal>
        )}
        <Reveal delay={0.4}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button
              asChild
              size="lg"
              className="bg-accent text-accent-foreground shadow-xl hover:bg-accent/90"
            >
              <Link href="/registration">{t('common.register')}</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="/submission">{t('common.submit')}</Link>
            </Button>
          </div>
        </Reveal>
        {edition && (
          <Reveal delay={0.5} className="mt-14">
            <Countdown target={edition.startDate} />
          </Reveal>
        )}
      </section>

      {/* ── About + stats ────────────────────────────────────────── */}
      {edition && (
        <section className="container py-20 md:py-28">
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
              <dl className="grid grid-cols-2 gap-4">
                {[
                  { value: stats.speakers, label: t('home.stats.speakers') },
                  { value: stats.sessions, label: t('home.stats.sessions') },
                  { value: stats.attendees, label: t('home.stats.attendees') },
                  { value: days, label: t('home.stats.days') },
                ].map(({ value, label }) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm"
                  >
                    <dd className="font-display text-4xl font-bold text-primary sm:text-5xl">
                      <AnimatedCounter value={value} />
                    </dd>
                    <dt className="mt-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                      {label}
                    </dt>
                  </div>
                ))}
              </dl>
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
          </div>
        </section>
      )}
    </>
  )
}
