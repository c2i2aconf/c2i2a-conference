import { getTranslations, setRequestLocale } from 'next-intl/server'
import type { Metadata } from 'next'
import { UsersRound } from 'lucide-react'

import { getLiveEdition, getCommittees } from '@/lib/queries'
import { Card, CardContent } from '@/components/ui/card'
import { PageHero } from '@/components/sections/PageHero'

// CMS edits revalidate on demand (collection hooks); hourly ISR is the fallback
export const revalidate = 3600

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: 'fr' | 'en' }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'committees' })
  return { title: t('title') }
}

export default async function CommitteesPage({
  params,
}: {
  params: Promise<{ locale: 'fr' | 'en' }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: 'nav' })
  const tPage = await getTranslations({ locale, namespace: 'committees' })
  const edition = await getLiveEdition(locale)
  const committees = edition ? await getCommittees(edition.id, locale) : []

  const committeeLabels = {
    honorary: t('honoraryCommittee'),
    steering: t('steeringCommittee'),
    scientific: t('scientificCommittee'),
    organization: t('organizationCommittee'),
  }

  return (
    <>
      <PageHero title={tPage('title')} subtitle={tPage('subtitle')} />
      <div className="container section-pad mx-auto max-w-6xl">
        {!edition || committees.length === 0 ? (
          <div className="academic-card mx-auto max-w-2xl p-10 text-center">
            <UsersRound className="mx-auto h-10 w-10 text-primary/50" />
            <p className="mt-4 text-muted-foreground">{tPage('empty')}</p>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-2">
            {committees.map((committee, committeeIndex) => (
              <section
                key={committee.id}
                className={committee.type === 'scientific' ? 'lg:col-span-2' : ''}
              >
                <Card className="academic-card h-full overflow-hidden py-0">
                  <header className="flex items-center gap-4 border-b bg-primary/[0.04] p-6">
                    <span className="font-display text-3xl font-bold text-accent">
                      {String(committeeIndex + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        {tPage('committeeLabel')}
                      </p>
                      <h2 className="mt-1 text-2xl font-bold text-primary">
                        {committeeLabels[committee.type]}
                      </h2>
                    </div>
                  </header>
                  <CardContent className="grid gap-x-8 gap-y-0 p-6 md:grid-cols-2">
                    {committee.members?.map((member, i) => (
                      <div
                        key={member.id || i}
                        className="border-b py-4 last:border-b-0 md:[&:nth-last-child(-n+2)]:border-b-0"
                      >
                        <p className="font-semibold leading-snug">{member.name}</p>
                        {member.role && (
                          <p className="text-primary text-sm font-medium">{member.role}</p>
                        )}
                        {member.affiliation && (
                          <p className="text-muted-foreground text-sm">{member.affiliation}</p>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </section>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
