import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getPayload } from 'payload'
import React from 'react'

import { Link } from '@/i18n/navigation'
import type { Edition } from '@/payload-types'
import config from '@/payload.config'

type Props = {
  params: Promise<{ locale: string }>
}

/** Fetch the current "live" edition — gracefully falls back when the DB isn't reachable yet. */
async function getLiveEdition(locale: string): Promise<Edition | null> {
  try {
    const payload = await getPayload({ config: await config })
    const { docs } = await payload.find({
      collection: 'editions',
      where: { editionStatus: { equals: 'live' } },
      limit: 1,
      locale: locale as 'fr' | 'en',
      fallbackLocale: 'fr',
    })
    return docs[0] ?? null
  } catch {
    return null
  }
}

const SECTION_KEYS = [
  { href: '/program', key: 'program' },
  { href: '/dates', key: 'dates' },
  { href: '/registration', key: 'registration' },
  { href: '/submission', key: 'submission' },
  { href: '/archive', key: 'archive' },
  { href: '/gallery', key: 'gallery' },
] as const

export default async function HomePage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale })
  const edition = await getLiveEdition(locale)

  return (
    <main className="min-h-screen">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden px-6 text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,var(--color-primary)/0.15,transparent_60%)]"
        />
        <p className="mb-4 text-sm font-medium tracking-widest text-muted-foreground uppercase">
          {t('home.organizedBy')}
        </p>
        <h1 className="font-display text-6xl font-bold tracking-tight sm:text-7xl lg:text-8xl">
          <span className="text-primary">C2I2A</span>
          {edition?.year ? <span className="text-accent"> {edition.year}</span> : null}
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
          {edition?.theme ?? t('metadata.description')}
        </p>
        {edition && (
          <p className="mt-3 text-sm text-muted-foreground">
            {edition.venue} ·{' '}
            {new Date(edition.startDate).toLocaleDateString(locale, {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        )}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/registration"
            className="rounded-lg bg-primary px-8 py-3 font-medium text-primary-foreground shadow-lg transition-transform hover:scale-105"
          >
            {t('common.register')}
          </Link>
          <Link
            href="/submission"
            className="rounded-lg border border-border bg-card px-8 py-3 font-medium transition-colors hover:bg-secondary"
          >
            {t('common.submit')}
          </Link>
        </div>
      </section>

      {/* ── Section cards ────────────────────────────────────── */}
      <section className="mx-auto grid max-w-5xl grid-cols-1 gap-4 px-6 pb-24 sm:grid-cols-2 lg:grid-cols-3">
        {SECTION_KEYS.map(({ href, key }) => (
          <Link
            key={key}
            href={href}
            className="group rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-lg"
          >
            <h2 className="font-display text-lg font-semibold group-hover:text-primary">
              {t(`nav.${key}`)}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">→</p>
          </Link>
        ))}
      </section>
    </main>
  )
}
