import * as React from 'react'
import { getTranslations } from 'next-intl/server'

import { Link } from '@/i18n/navigation'
import { NavLink } from './NavLink'
import { LanguageSwitcher } from './LanguageSwitcher'
import { ThemeToggle } from './ThemeToggle'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'

// Note: You can also extract MobileMenu to a client component if needed
export async function Header() {
  const t = await getTranslations('nav')

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6 md:gap-10">
          <Link href="/" className="flex items-center space-x-2">
            <span className="inline-block font-bold text-primary">C2I2A</span>
          </Link>
          <nav className="hidden md:flex gap-6">
            <NavLink href="/" exact>{t('home')}</NavLink>
            <NavLink href="/program">{t('program')}</NavLink>
            <NavLink href="/dates">{t('dates')}</NavLink>
            <NavLink href="/speakers">{t('speakers')}</NavLink>
            
            {/* Optional: we can add dropdowns for Committees etc. For now, simple links */}
            <NavLink href="/committees">{t('committees')}</NavLink>
            <NavLink href="/sponsors">{t('sponsors')}</NavLink>
            <NavLink href="/gallery">{t('gallery')}</NavLink>
            <NavLink href="/archive">{t('archive')}</NavLink>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2">
            <Button asChild variant="default">
              <Link href="/registration">{t('registration')}</Link>
            </Button>
          </div>
          
          <ThemeToggle />
          <LanguageSwitcher />

          {/* Mobile menu trigger */}
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
