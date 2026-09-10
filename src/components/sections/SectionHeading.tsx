import type { ReactNode } from 'react'

interface SectionHeadingProps {
  /** Small uppercase label above the title */
  eyebrow?: string
  title: string
  subtitle?: string
  /** Centered (default) or left-aligned */
  align?: 'center' | 'left'
  children?: ReactNode
}

/** Uniform section header: eyebrow + display title + gold divider + optional subtitle. */
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = 'center',
  children,
}: SectionHeadingProps) {
  const centered = align === 'center'
  return (
    <div className={centered ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl'}>
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">{eyebrow}</p>
      )}
      <h2 className="font-display mt-2 text-3xl font-bold tracking-tight text-balance sm:text-4xl lg:text-[2.75rem]">
        {title}
      </h2>
      <div
        className={`mt-4 h-1 w-16 rounded-full bg-accent ${centered ? 'mx-auto' : ''}`}
        aria-hidden
      />
      {subtitle && (
        <p className="mt-5 text-base leading-7 text-pretty text-muted-foreground sm:text-lg">
          {subtitle}
        </p>
      )}
      {children}
    </div>
  )
}
