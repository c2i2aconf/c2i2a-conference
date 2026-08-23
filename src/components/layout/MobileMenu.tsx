'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Menu } from 'lucide-react'

import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { UserMenu } from './UserMenu'

const ITEMS = [
  { href: '/', key: 'home' },
  { href: '/about', key: 'about' },
  { href: '/program', key: 'program' },
  { href: '/dates', key: 'dates' },
  { href: '/speakers', key: 'speakers' },
  { href: '/committees', key: 'committees' },
  { href: '/sponsors', key: 'sponsors' },
  { href: '/gallery', key: 'gallery' },
  { href: '/access', key: 'access' },
  { href: '/contact', key: 'contact' },
  { href: '/archive', key: 'archive' },
] as const

/** Mobile navigation drawer (Sheet) — the full nav that doesn't fit in the header bar. */
export function MobileMenu({
  siteName,
  customPages,
}: {
  siteName: string
  customPages: Array<{ slug: string; title: string }>
}) {
  const t = useTranslations('nav')
  const tCommon = useTranslations('common')
  const [open, setOpen] = React.useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">{t('menu')}</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72 p-0" closeLabel={tCommon('close')}>
        <SheetHeader className="border-b p-6">
          <SheetTitle className="font-display text-xl font-bold text-primary">
            {siteName}
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col px-6 py-4">
          {ITEMS.map(({ href, key }) => (
            <Link
              key={key}
              href={href}
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-secondary hover:text-primary"
            >
              {t(key)}
            </Link>
          ))}
          {customPages.map((page) => (
            <Link
              key={page.slug}
              href={`/p/${page.slug}`}
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-secondary hover:text-primary"
            >
              {page.title}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-2 border-t p-6">
          <Button asChild>
            <Link href="/registration" onClick={() => setOpen(false)}>
              {t('registration')}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/submission" onClick={() => setOpen(false)}>
              {t('submission')}
            </Link>
          </Button>
          <UserMenu variant="menu" onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
