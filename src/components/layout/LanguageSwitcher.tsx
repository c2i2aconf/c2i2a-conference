'use client'

import * as React from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Globe } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { usePathname, useRouter } from '@/i18n/navigation'

export function LanguageSwitcher() {
  const locale = useLocale()
  const t = useTranslations('common')
  const router = useRouter()
  const pathname = usePathname()

  function handleLocaleChange(newLocale: 'fr' | 'en') {
    router.replace(pathname, { locale: newLocale })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="text-foreground">
          <Globe className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">{t('toggleLanguage')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={() => handleLocaleChange('fr')}
          className={locale === 'fr' ? 'bg-accent/50' : ''}
        >
          Français
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleLocaleChange('en')}
          className={locale === 'en' ? 'bg-accent/50' : ''}
        >
          English
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
