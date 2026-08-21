import * as React from 'react'
import { getTranslations, getLocale } from 'next-intl/server'
import Image from 'next/image'

import { Link } from '@/i18n/navigation'
import { getLiveEdition, getNavigationPages, getSiteSettings } from '@/lib/queries'
import { NavLink } from './NavLink'
import { MobileMenu } from './MobileMenu'
import { HeaderShell } from './HeaderShell'
import { LanguageSwitcher } from './LanguageSwitcher'
import { ThemeToggle } from './ThemeToggle'
import { Button } from '@/components/ui/button'

export async function Header() {
  const t = await getTranslations('nav')
  const locale = (await getLocale()) as 'fr' | 'en'
  const [settings, edition] = await Promise.all([getSiteSettings(locale), getLiveEdition(locale)])
  const customPages = edition ? await getNavigationPages(edition.id, locale) : []
  const logo =
    settings?.logo && typeof settings.logo === 'object' && settings.logo.url ? settings.logo : null

  return (
    <HeaderShell>
      <div className="container flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5">
            {logo?.url ? (
              <Image
                src={logo.url}
                alt={settings?.siteName || 'C2I2A'}
                width={36}
                height={36}
                className="h-9 w-9 object-contain"
              />
            ) : (
              <span className="font-display text-xl font-bold tracking-tight text-primary">
                {settings?.siteName || 'C2I2A'}
              </span>
            )}
          </Link>
          <nav className="hidden items-center gap-6 lg:flex">
            <NavLink href="/" exact>
              {t('home')}
            </NavLink>
            <NavLink href="/about">{t('about')}</NavLink>
            {customPages.map((page) => (
              <NavLink key={page.id} href={`/p/${page.slug}`}>
                {page.title}
              </NavLink>
            ))}
            <NavLink href="/program">{t('program')}</NavLink>
            <NavLink href="/dates">{t('dates')}</NavLink>
            <NavLink href="/speakers">{t('speakers')}</NavLink>
            <NavLink href="/committees">{t('committees')}</NavLink>
            <NavLink href="/archive">{t('archive')}</NavLink>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Button
            asChild
            className="hidden bg-accent text-accent-foreground shadow-sm hover:bg-accent/90 md:inline-flex"
          >
            <Link href="/registration">{t('registration')}</Link>
          </Button>
          <ThemeToggle />
          <LanguageSwitcher />
          <MobileMenu
            siteName={settings?.siteName || 'C2I2A'}
            customPages={customPages.map((page) => ({ slug: page.slug, title: page.title }))}
          />
        </div>
      </div>
    </HeaderShell>
  )
}
