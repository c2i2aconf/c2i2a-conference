'use client'

import * as React from 'react'
import { Link, usePathname } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

interface NavLinkProps extends React.ComponentProps<typeof Link> {
  exact?: boolean
}

export function NavLink({ href, exact, className, children, ...props }: NavLinkProps) {
  const pathname = usePathname()
  
  // Use string conversion to safely compare pathnames
  const hrefString = typeof href === 'string' ? href : (href as any).pathname || ''
  
  const isActive = exact 
    ? pathname === hrefString 
    : pathname.startsWith(hrefString) && (hrefString !== '/' || pathname === '/')

  return (
    <Link
      href={href}
      className={cn(
        'text-sm font-medium transition-colors hover:text-primary',
        isActive ? 'text-primary font-semibold' : 'text-muted-foreground',
        className
      )}
      {...props}
    >
      {children}
    </Link>
  )
}
