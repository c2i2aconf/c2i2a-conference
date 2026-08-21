'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

/** Sticky glass header that gains a shadow once the page is scrolled. */
export function HeaderShell({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = React.useState(false)

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md transition-shadow duration-300 supports-[backdrop-filter]:bg-background/60',
        scrolled && 'shadow-[0_1px_12px_oklch(0.2_0.05_264/0.12)]',
      )}
    >
      {children}
    </header>
  )
}
