interface PageHeroProps {
  eyebrow?: string
  title: string
  subtitle?: string
}

/** Uniform dark page-header band used across all content pages. */
export function PageHero({ eyebrow, title, subtitle }: PageHeroProps) {
  return (
    <section className="bg-band relative overflow-hidden py-16 text-center md:py-24">
      <div aria-hidden className="bg-dots absolute inset-0" />
      <div className="container relative">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">{eyebrow}</p>
        )}
        <h1 className="font-display mt-3 text-4xl font-bold tracking-tight text-white md:text-5xl">
          {title}
        </h1>
        {subtitle && <p className="mx-auto mt-4 max-w-2xl text-lg text-white/70">{subtitle}</p>}
      </div>
    </section>
  )
}
