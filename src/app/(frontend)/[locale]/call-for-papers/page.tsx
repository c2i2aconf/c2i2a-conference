import { getTranslations, setRequestLocale } from 'next-intl/server'
import type { Metadata } from 'next'

import { PageHero } from '@/components/sections/PageHero'
import { Card, CardContent } from '@/components/ui/card'
import { getConferenceDetails, getLiveEdition, getThematicAxes } from '@/lib/queries'

export const revalidate = 3600

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: 'fr' | 'en' }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'callForPapers' })
  return { title: t('title') }
}

export default async function CallForPapersPage({
  params,
}: {
  params: Promise<{ locale: 'fr' | 'en' }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'callForPapers' })
  const edition = await getLiveEdition(locale)
  const [axes, details] = edition
    ? await Promise.all([
        getThematicAxes(edition.id, locale),
        getConferenceDetails(edition.id, locale),
      ])
    : [[], null]

  const languages = details?.submissionLanguages?.map((language) => t(`languages.${language}`))
  const outcomes = details?.decisionOutcomes?.map((outcome) => t(`outcomes.${outcome}`))

  return (
    <>
      <PageHero title={t('title')} subtitle={edition?.theme || t('subtitle')} />
      <div className="container space-y-20 py-16 md:py-24">
        {axes.length > 0 && (
          <section>
            <h2 className="text-3xl font-bold">{t('axes')}</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {axes.map((axis) => (
                <Card key={axis.id}>
                  <CardContent className="p-5">
                    <p className="text-xs font-semibold text-primary">{axis.code}</p>
                    <h3 className="mt-2 font-semibold">{axis.title}</h3>
                    {axis.description && (
                      <p className="mt-2 text-sm text-muted-foreground">{axis.description}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {details && (
          <section className="grid gap-8 lg:grid-cols-2">
            <Card>
              <CardContent className="p-7">
                <h2 className="text-2xl font-bold">{t('contributions')}</h2>
                <ul className="mt-5 list-disc space-y-2 pl-5 text-muted-foreground">
                  {details.contributionTypes?.map((item) => (
                    <li key={item.id ?? item.code}>{item.label}</li>
                  ))}
                </ul>
                {languages?.length ? (
                  <p className="mt-5">
                    <strong>{t('submissionLanguages')}:</strong> {languages.join(', ')}
                  </p>
                ) : null}
                {details.englishAbstractRequired && <p className="mt-2">{t('englishAbstract')}</p>}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-7">
                <h2 className="text-2xl font-bold">{t('format')}</h2>
                <ul className="mt-5 list-disc space-y-2 pl-5 text-muted-foreground">
                  {details.extendedAbstractMinWords != null &&
                    details.extendedAbstractMaxWords != null && (
                      <li>
                        {t('extendedAbstract', {
                          min: details.extendedAbstractMinWords,
                          max: details.extendedAbstractMaxWords,
                        })}
                      </li>
                    )}
                  {details.fullPaperMinPages != null && details.fullPaperMaxPages != null && (
                    <li>
                      {t('fullPaper', {
                        min: details.fullPaperMinPages,
                        max: details.fullPaperMaxPages,
                      })}
                    </li>
                  )}
                  {details.acceptedFormats?.length ? (
                    <li>{t('acceptedFormats', { formats: details.acceptedFormats.join(', ').toUpperCase() })}</li>
                  ) : null}
                  {details.anonymizedManuscriptRequired && <li>{t('anonymizedManuscript')}</li>}
                  {details.separateAuthorCoverSheetRequired && <li>{t('coverSheet')}</li>}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-7">
                <h2 className="text-2xl font-bold">{t('review')}</h2>
                <ul className="mt-5 list-disc space-y-2 pl-5 text-muted-foreground">
                  {details.reviewersPerSubmission != null && (
                    <li>{t('reviewers', { count: details.reviewersPerSubmission })}</li>
                  )}
                  {details.thirdReviewerOnDisagreement && <li>{t('thirdReviewer')}</li>}
                  {outcomes?.length ? <li>{t('decisions', { outcomes: outcomes.join(', ') })}</li> : null}
                  {details.anonymizedReportsReturned && <li>{t('reportsReturned')}</li>}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-7">
                <h2 className="text-2xl font-bold">{t('publication')}</h2>
                <ul className="mt-5 list-disc space-y-2 pl-5 text-muted-foreground">
                  {details.isbnProceedings && <li>{t('isbnProceedings')}</li>}
                  {details.registrationRequired && <li>{t('registrationRequired')}</li>}
                  {details.paymentProofRequired && <li>{t('paymentProof')}</li>}
                  {details.invitationLettersAvailable && <li>{t('invitationLetters')}</li>}
                </ul>
              </CardContent>
            </Card>
          </section>
        )}
      </div>
    </>
  )
}
