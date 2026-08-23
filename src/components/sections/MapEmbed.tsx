import { MapPin } from 'lucide-react'

import { cn } from '@/lib/utils'

type MapEmbedProps = {
  /** Google Maps URL from the edition; only `…embed…` URLs render as an iframe */
  url?: string | null
  /** Accessible iframe title (also the placeholder label when no embed is available) */
  title: string
  /** Classes controlling the frame size, e.g. `h-full min-h-[320px]` */
  className?: string
}

export function MapEmbed({ url, title, className = 'h-full min-h-[320px]' }: MapEmbedProps) {
  const embedUrl = url && url.includes('google') && url.includes('embed') ? url : null

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-border bg-muted shadow-sm',
        className
      )}
    >
      {embedUrl ? (
        <iframe
          src={embedUrl}
          title={title}
          className={cn('w-full border-0', className)}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      ) : (
        <div className={cn('flex items-center justify-center text-muted-foreground', className)}>
          <MapPin className="mr-2 h-5 w-5" />
          {title}
        </div>
      )}
    </div>
  )
}
