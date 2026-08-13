import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getLiveEdition, getCommittees } from '@/lib/queries'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function CommitteesPage({
  params,
}: {
  params: Promise<{ locale: 'fr' | 'en' }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: 'nav' })
  const edition = await getLiveEdition(locale)
  const committees = edition ? await getCommittees(edition.id, locale) : []

  const scientific = committees.find(c => c.type === 'scientific')
  const organization = committees.find(c => c.type === 'organization')

  return (
    <div className="container py-12 md:py-24 max-w-4xl mx-auto">
      <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-12 text-center">{t('committees')}</h1>
      
      {!edition || committees.length === 0 ? (
        <p className="text-center text-muted-foreground">Aucun comité n&apos;a été annoncé pour le moment.</p>
      ) : (
        <div className="space-y-12">
          {scientific && (
            <section>
              <h2 className="text-2xl font-bold mb-6 text-primary border-b pb-2">{t('scientificCommittee')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {scientific.members?.map((member, i) => (
                  <Card key={member.id || i} className="bg-card">
                    <CardContent className="p-4 flex flex-col justify-center">
                      <p className="font-semibold text-lg">{member.name}</p>
                      {member.role && <p className="text-primary text-sm font-medium">{member.role}</p>}
                      {member.affiliation && <p className="text-muted-foreground text-sm">{member.affiliation}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {organization && (
            <section>
              <h2 className="text-2xl font-bold mb-6 text-primary border-b pb-2">{t('organizationCommittee')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {organization.members?.map((member, i) => (
                  <Card key={member.id || i} className="bg-card">
                    <CardContent className="p-4 flex flex-col justify-center">
                      <p className="font-semibold text-lg">{member.name}</p>
                      {member.role && <p className="text-primary text-sm font-medium">{member.role}</p>}
                      {member.affiliation && <p className="text-muted-foreground text-sm">{member.affiliation}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
