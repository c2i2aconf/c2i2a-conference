import { getTranslations, setRequestLocale } from 'next-intl/server'
import type { Metadata } from 'next'

import { getLiveEdition, getCommittees } from '@/lib/queries'
import { Card, CardContent } from '@/components/ui/card'
import { PageHero } from '@/components/sections/PageHero'

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

  const scientific = committees.find((c) => c.type === 'scientific')
  const organization = committees.find((c) => c.type === 'organization')

  return (
    <>
      <PageHero title={tPage('title')} subtitle={tPage('subtitle')} />
      <div className="container py-12 md:py-20 max-w-4xl mx-auto">
        {!edition || committees.length === 0 ? (
          <p className="text-center text-muted-foreground">{tPage('empty')}</p>
        ) : (
          <div className="space-y-12">
            {scientific && (
              <section>
                <h2 className="text-2xl font-bold mb-6 text-primary border-b pb-2">
                  {t('scientificCommittee')}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {scientific.members?.map((member, i) => (
                    <Card key={member.id || i} className="bg-card">
                      <CardContent className="p-4 flex flex-col justify-center">
                        <p className="font-semibold text-lg">{member.name}</p>
                        {member.role && (
                          <p className="text-primary text-sm font-medium">{member.role}</p>
                        )}
                        {member.affiliation && (
                          <p className="text-muted-foreground text-sm">{member.affiliation}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {organization && (
              <section>
                <h2 className="text-2xl font-bold mb-6 text-primary border-b pb-2">
                  {t('organizationCommittee')}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {organization.members?.map((member, i) => (
                    <Card key={member.id || i} className="bg-card">
                      <CardContent className="p-4 flex flex-col justify-center">
                        <p className="font-semibold text-lg">{member.name}</p>
                        {member.role && (
                          <p className="text-primary text-sm font-medium">{member.role}</p>
                        )}
                        {member.affiliation && (
                          <p className="text-muted-foreground text-sm">{member.affiliation}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </>
  )
}
