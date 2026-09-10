interface PageHeroProps {
  eyebrow?: string
  title: string
  subtitle?: string
}

/** Uniform dark page-header band used across all content pages. */
export function PageHero({ eyebrow, title, subtitle }: PageHeroProps) {
  return (
    <section className="bg-band relative overflow-hidden border-b border-white/10 py-14 text-center md:py-20">
      <div aria-hidden className="bg-dots absolute inset-0" />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent/70 to-transparent"
      />
      <div className="container relative max-w-5xl">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">{eyebrow}</p>
        )}
        <h1 className="font-display mt-3 text-4xl font-bold tracking-tight text-balance text-white md:text-5xl lg:text-6xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-pretty text-white/75 md:text-lg">
            {subtitle}
          </p>
        )}
      </div>
    </section>
  )
}
