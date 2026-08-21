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
  const hrefString =
    typeof href === 'string' ? href : (href as { pathname?: string }).pathname || ''

  const isActive = exact
    ? pathname === hrefString
    : pathname.startsWith(hrefString) && (hrefString !== '/' || pathname === '/')

  return (
    <Link
      href={href}
      className={cn(
        'relative text-sm font-medium transition-colors hover:text-primary',
        'after:absolute after:-bottom-1.5 after:left-0 after:h-0.5 after:w-full after:origin-left after:scale-x-0 after:rounded-full after:bg-accent after:transition-transform after:duration-300 hover:after:scale-x-100',
        isActive && 'text-primary after:scale-x-100',
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  )
}
