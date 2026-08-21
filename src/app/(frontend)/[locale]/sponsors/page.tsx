import { getTranslations, setRequestLocale } from 'next-intl/server'
import Image from 'next/image'
import type { Metadata } from 'next'

import { getLiveEdition, getSponsors } from '@/lib/queries'
import { PageHero } from '@/components/sections/PageHero'
import { Sponsor } from '@/payload-types'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: 'fr' | 'en' }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'sponsors' })
  return { title: t('title') }
}

export default async function SponsorsPage({
  params,
}: {
  params: Promise<{ locale: 'fr' | 'en' }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: 'sponsors' })
  const edition = await getLiveEdition(locale)
  const sponsors = edition ? await getSponsors(edition.id, locale) : []

  // Group sponsors by tier
  const tiers = ['platinum', 'gold', 'silver', 'bronze', 'partner'] as const
  const groupedSponsors = tiers.reduce(
    (acc, tier) => {
      const tierSponsors = sponsors.filter((s) => s.tier === tier)
      if (tierSponsors.length > 0) {
        acc[tier] = tierSponsors
      }
      return acc
    },
    {} as Record<string, Sponsor[]>,
  )

  return (
    <>
      <PageHero title={t('title')} subtitle={t('subtitle')} />
      <div className="container py-12 md:py-20">
        {!edition || sponsors.length === 0 ? (
          <p className="text-center text-muted-foreground">{t('empty')}</p>
        ) : (
          <div className="space-y-16">
            {tiers.map((tier) => {
              if (!groupedSponsors[tier]) return null

              const isPlatinum = tier === 'platinum'
              const isGold = tier === 'gold'

              return (
                <section key={tier} className="text-center">
                  <h2 className="text-2xl font-bold mb-8 text-muted-foreground uppercase tracking-wider">
                    {t(`tiers.${tier}`)}
                  </h2>
                  <div
                    className={`flex flex-wrap justify-center gap-6 ${isPlatinum ? 'max-w-4xl mx-auto' : ''}`}
                  >
                    {groupedSponsors[tier].map((sponsor) => (
                      <a
                        key={sponsor.id}
                        href={sponsor.website || '#'}
                        target={sponsor.website ? '_blank' : '_self'}
                        rel={sponsor.website ? 'noopener noreferrer' : ''}
                        className={`block bg-white p-6 rounded-xl border hover:shadow-lg transition-all ${
                          isPlatinum
                            ? 'w-full md:w-80 h-48'
                            : isGold
                              ? 'w-full sm:w-64 h-40'
                              : 'w-full sm:w-48 h-32'
                        }`}
                      >
                        {sponsor.logo && typeof sponsor.logo === 'object' && sponsor.logo.url ? (
                          <div className="w-full h-full flex items-center justify-center">
                            <Image
                              src={sponsor.logo.url}
                              alt={sponsor.name}
                              width={sponsor.logo.width ?? 300}
                              height={sponsor.logo.height ?? 120}
                              className="max-w-full max-h-full w-auto h-auto object-contain filter grayscale hover:grayscale-0 transition-all duration-300"
                            />
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-lg font-bold text-slate-800">
                            {sponsor.name}
                          </div>
                        )}
                      </a>
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
