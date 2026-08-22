'use client'

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface RevealProps {
  children: ReactNode
  /** Stagger delay in seconds */
  delay?: number
  /** Vertical offset in px (default 24) */
  y?: number
  className?: string
}

/** Subtle scroll-reveal: fades and slides up once when entering the viewport. */
export function Reveal({ children, delay = 0, y = 24, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '-80px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  // Reduced motion is handled in CSS: content shows instantly, nothing animates
  return (
    <div
      ref={ref}
      className={cn(
        'transition-[opacity,transform] duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none motion-reduce:translate-y-0 motion-reduce:opacity-100',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-(--reveal-y) opacity-0',
        className,
      )}
      style={{ '--reveal-y': `${y}px`, transitionDelay: `${delay}s` } as CSSProperties}
    >
      {children}
    </div>
  )
}
