import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getLiveEdition, getSponsors } from '@/lib/queries'
import { Card, CardContent } from '@/components/ui/card'
import { Sponsor } from '@/payload-types'

export default async function SponsorsPage({
  params,
}: {
  params: Promise<{ locale: 'fr' | 'en' }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: 'home' })
  const edition = await getLiveEdition(locale)
  const sponsors = edition ? await getSponsors(edition.id, locale) : []

  // Group sponsors by tier
  const tiers = ['platinum', 'gold', 'silver', 'bronze', 'partner'] as const
  const groupedSponsors = tiers.reduce((acc, tier) => {
    const tierSponsors = sponsors.filter(s => s.tier === tier)
    if (tierSponsors.length > 0) {
      acc[tier] = tierSponsors
    }
    return acc
  }, {} as Record<string, Sponsor[]>)

  function getTierLabel(tier: string) {
    switch (tier) {
      case 'platinum': return 'Platine'
      case 'gold': return 'Or'
      case 'silver': return 'Argent'
      case 'bronze': return 'Bronze'
      case 'partner': return 'Partenaire'
      default: return tier
    }
  }

  return (
    <div className="container py-12 md:py-24">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">{t('sponsorsTitle')}</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Nous remercions chaleureusement nos partenaires pour leur soutien.
        </p>
      </div>
      
      {!edition || sponsors.length === 0 ? (
        <p className="text-center text-muted-foreground">Aucun partenaire n&apos;a été annoncé pour le moment.</p>
      ) : (
        <div className="space-y-16">
          {tiers.map((tier) => {
            if (!groupedSponsors[tier]) return null
            
            const isPlatinum = tier === 'platinum'
            const isGold = tier === 'gold'
            
            return (
              <section key={tier} className="text-center">
                <h2 className="text-2xl font-bold mb-8 text-muted-foreground uppercase tracking-wider">
                  {getTierLabel(tier)}
                </h2>
                <div className={`flex flex-wrap justify-center gap-6 ${isPlatinum ? 'max-w-4xl mx-auto' : ''}`}>
                  {groupedSponsors[tier].map((sponsor) => (
                    <a 
                      key={sponsor.id} 
                      href={sponsor.website || '#'} 
                      target={sponsor.website ? "_blank" : "_self"}
                      rel={sponsor.website ? "noopener noreferrer" : ""}
                      className={`block bg-white p-6 rounded-xl border hover:shadow-lg transition-all ${
                        isPlatinum ? 'w-full md:w-80 h-48' : 
                        isGold ? 'w-full sm:w-64 h-40' : 
                        'w-full sm:w-48 h-32'
                      }`}
                    >
                      {sponsor.logo && typeof sponsor.logo === 'object' && sponsor.logo.url ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <img
                            src={sponsor.logo.url}
                            alt={sponsor.name}
                            className="max-w-full max-h-full object-contain filter grayscale hover:grayscale-0 transition-all duration-300"
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
  )
}
