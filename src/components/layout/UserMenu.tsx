'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { LogIn, UserRound } from 'lucide-react'

import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'

/**
 * Auth-aware header entry to the portal. Auth state is fetched client-side
 * from Payload's /api/users/me so the surrounding ISR pages stay cached —
 * reading the auth cookie server-side here would force every page dynamic.
 * Renders the signed-out state first, then swaps once known.
 */
export function UserMenu({
  variant = 'header',
  onNavigate,
}: {
  variant?: 'header' | 'menu'
  onNavigate?: () => void
}) {
  const tAuth = useTranslations('auth')
  const tNav = useTranslations('nav')
  const [signedIn, setSignedIn] = React.useState(false)

  React.useEffect(() => {
    let active = true
    fetch('/api/users/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active) setSignedIn(Boolean(data?.user))
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  const label = signedIn ? tNav('account') : tAuth('login')
  const href = signedIn ? '/account' : '/auth/login'

  if (variant === 'menu') {
    return (
      <Button asChild variant="outline">
        <Link href={href} onClick={onNavigate}>
          {label}
        </Link>
      </Button>
    )
  }

  return (
    <Button asChild variant="ghost" size="sm" className="gap-2">
      <Link href={href}>
        {signedIn ? <UserRound className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
        {label}
      </Link>
    </Button>
  )
}
