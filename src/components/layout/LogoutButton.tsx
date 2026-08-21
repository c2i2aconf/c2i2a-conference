'use client'

import * as React from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { LogOut } from 'lucide-react'

import { useRouter } from '@/i18n/navigation'
import { logoutAction } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'

export function LogoutButton() {
  const t = useTranslations('auth')
  const locale = useLocale()
  const router = useRouter()
  const [pending, setPending] = React.useState(false)

  async function handleLogout() {
    setPending(true)
    await logoutAction()
    router.push('/', { locale })
    router.refresh()
  }

  return (
    <Button variant="outline" onClick={handleLogout} disabled={pending}>
      <LogOut className="mr-2 h-4 w-4" />
      {t('logout')}
    </Button>
  )
}
