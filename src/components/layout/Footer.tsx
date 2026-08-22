import * as React from 'react'
import { getTranslations, getLocale } from 'next-intl/server'
import { Mail, MapPin } from 'lucide-react'

import { Link } from '@/i18n/navigation'
import { getLiveEdition, getNavigationPages, getSiteSettings } from '@/lib/queries'

/** Brand icons were removed from lucide — render a letter avatar per platform instead. */
function getSocialIcon(platform: string) {
  const label = platform === 'x' ? 'X' : platform.charAt(0).toUpperCase()
  return <span className="text-xs font-bold">{label}</span>
}

export async function Footer() {
  const t = await getTranslations('footer')
  const tNav = await getTranslations('nav')
  const locale = (await getLocale()) as 'fr' | 'en'
  const [siteSettings, edition] = await Promise.all([getSiteSettings(locale), getLiveEdition(locale)])
  const customPages = edition ? await getNavigationPages(edition.id, locale) : []

  const exploreLinks = [
    { href: '/about', label: tNav('about') },
    { href: '/program', label: tNav('program') },
    { href: '/dates', label: tNav('dates') },
    { href: '/speakers', label: tNav('speakers') },
    { href: '/archive', label: tNav('archive') },
    ...customPages.map((page) => ({ href: `/p/${page.slug}`, label: page.title })),
  ]

  const attendLinks = [
    { href: '/registration', label: tNav('registration') },
    { href: '/submission', label: tNav('submission') },
    { href: '/access', label: tNav('access') },
    { href: '/gallery', label: tNav('gallery') },
    { href: '/contact', label: tNav('contact') },
  ] as const

  return (
    <footer className="w-full border-t bg-muted/30 text-muted-foreground">
      {/* Gold accent line */}
      <div className="h-1 w-full bg-gradient-to-r from-primary via-accent to-primary" aria-hidden />

      <div className="container grid grid-cols-1 gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-xl font-bold text-primary">
            {siteSettings?.siteName || 'C2I2A'}
            {edition?.year ? <span className="text-accent"> {edition.year}</span> : null}
          </p>
          {siteSettings?.siteTagline && <p className="mt-3 text-sm">{siteSettings.siteTagline}</p>}
          {siteSettings?.organizationName ? (
            <p className="mt-3 text-sm">
              {t('organizedBy')}{' '}
              <strong className="text-foreground">{siteSettings.organizationName}</strong>
            </p>
          ) : null}
          {siteSettings?.socials && siteSettings.socials.length > 0 && (
            <div className="mt-5 flex gap-2">
              {siteSettings.socials.map((social) => (
                <a
                  key={social.id}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.platform}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border transition-colors hover:border-accent hover:bg-accent hover:text-accent-foreground"
                >
                  {getSocialIcon(social.platform)}
                </a>
              ))}
            </div>
          )}
        </div>

        <nav aria-label={t('quickLinks')}>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground">
            {t('quickLinks')}
          </h3>
          <ul className="space-y-2.5 text-sm">
            {exploreLinks.map(({ href, label }) => (
              <li key={href}>
                <Link href={href} className="transition-colors hover:text-primary">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label={tNav('registration')}>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground">
            {tNav('registration')}
          </h3>
          <ul className="space-y-2.5 text-sm">
            {attendLinks.map(({ href, label }) => (
              <li key={href}>
                <Link href={href} className="transition-colors hover:text-primary">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground">
            {t('contact')}
          </h3>
          <ul className="space-y-2.5 text-sm">
            {siteSettings?.contactEmail ? (
              <li>
                <a
                  href={`mailto:${siteSettings.contactEmail}`}
                  className="flex items-center gap-2 transition-colors hover:text-primary"
                >
                  <Mail className="h-4 w-4 shrink-0" />
                  {siteSettings.contactEmail}
                </a>
              </li>
            ) : null}
            {siteSettings?.organizationAddress ? (
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="whitespace-pre-line">{siteSettings.organizationAddress}</span>
              </li>
            ) : null}
            {edition?.venue && (
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{edition.venue}</span>
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="border-t py-6 text-center text-xs">
        <p>
          &copy; {new Date().getFullYear()}{' '}
          {siteSettings?.copyrightText || siteSettings?.siteName || 'C2I2A'}. {t('rights')}.
        </p>
      </div>
    </footer>
  )
}
