'use client'

import { useEffect, useRef, useState } from 'react'

interface AnimatedCounterProps {
  value: number
  className?: string
}

/** Counts from 0 to `value` when scrolled into view (respects reduced motion). */
export function AnimatedCounter({ value, className }: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const [display, setDisplay] = useState<number | null>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    let frame = 0
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        observer.disconnect()
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          setDisplay(value)
          return
        }
        const duration = 1400
        const start = performance.now()
        const tick = (now: number) => {
          const progress = Math.min(1, (now - start) / duration)
          const eased = 1 - (1 - progress) ** 3
          setDisplay(Math.round(eased * value))
          if (progress < 1) frame = requestAnimationFrame(tick)
        }
        frame = requestAnimationFrame(tick)
      },
      { rootMargin: '-40px' },
    )
    observer.observe(node)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [value])

  return (
    <span ref={ref} className={className}>
      {display ?? 0}
    </span>
  )
}
