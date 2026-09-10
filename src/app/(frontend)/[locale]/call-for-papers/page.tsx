import { getTranslations, setRequestLocale } from 'next-intl/server'
import { BookOpenCheck, FileCheck2, Languages, ScrollText } from 'lucide-react'
import type { Metadata } from 'next'

import { PageHero } from '@/components/sections/PageHero'
import { SectionHeading } from '@/components/sections/SectionHeading'
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
      <div className="container space-y-20 section-pad">
        {axes.length > 0 && (
          <section>
            <SectionHeading
              align="left"
              eyebrow={t('scope')}
              title={t('axes')}
              subtitle={t('axesCount', { count: axes.length })}
            />
            <ol className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {axes.map((axis, index) => (
                <li key={axis.id}>
                  <Card className="academic-card h-full border-t-4 border-t-primary py-0 transition-transform hover:-translate-y-0.5">
                    <CardContent className="flex gap-4 p-5">
                      <span className="font-display flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                          {axis.code}
                        </p>
                        <h3 className="mt-1 font-semibold leading-snug">{axis.title}</h3>
                        {axis.description && (
                          <p className="mt-2 text-sm text-muted-foreground">{axis.description}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ol>
          </section>
        )}

        {details && (
          <section>
            <SectionHeading
              align="left"
              eyebrow={t('guidelines')}
              title={t('requirementsTitle')}
              subtitle={t('requirementsSubtitle')}
            />
            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              <Card className="academic-card">
                <CardContent className="p-7">
                  <h3 className="flex items-center gap-3 text-xl font-bold">
                    <Languages className="h-5 w-5 text-accent" />
                    {t('contributions')}
                  </h3>
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
                  {details.englishAbstractRequired && (
                    <p className="mt-2">{t('englishAbstract')}</p>
                  )}
                </CardContent>
              </Card>

              <Card className="academic-card">
                <CardContent className="p-7">
                  <h3 className="flex items-center gap-3 text-xl font-bold">
                    <FileCheck2 className="h-5 w-5 text-accent" />
                    {t('format')}
                  </h3>
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
                      <li>
                        {t('acceptedFormats', {
                          formats: details.acceptedFormats.join(', ').toUpperCase(),
                        })}
                      </li>
                    ) : null}
                    {details.anonymizedManuscriptRequired && <li>{t('anonymizedManuscript')}</li>}
                    {details.separateAuthorCoverSheetRequired && <li>{t('coverSheet')}</li>}
                  </ul>
                </CardContent>
              </Card>

              <Card className="academic-card">
                <CardContent className="p-7">
                  <h3 className="flex items-center gap-3 text-xl font-bold">
                    <BookOpenCheck className="h-5 w-5 text-accent" />
                    {t('review')}
                  </h3>
                  <ul className="mt-5 list-disc space-y-2 pl-5 text-muted-foreground">
                    {details.reviewersPerSubmission != null && (
                      <li>{t('reviewers', { count: details.reviewersPerSubmission })}</li>
                    )}
                    {details.thirdReviewerOnDisagreement && <li>{t('thirdReviewer')}</li>}
                    {outcomes?.length ? (
                      <li>{t('decisions', { outcomes: outcomes.join(', ') })}</li>
                    ) : null}
                    {details.anonymizedReportsReturned && <li>{t('reportsReturned')}</li>}
                  </ul>
                </CardContent>
              </Card>

              <Card className="academic-card">
                <CardContent className="p-7">
                  <h3 className="flex items-center gap-3 text-xl font-bold">
                    <ScrollText className="h-5 w-5 text-accent" />
                    {t('publication')}
                  </h3>
                  <ul className="mt-5 list-disc space-y-2 pl-5 text-muted-foreground">
                    {details.isbnProceedings && <li>{t('isbnProceedings')}</li>}
                    {details.registrationRequired && <li>{t('registrationRequired')}</li>}
                    {details.paymentProofRequired && <li>{t('paymentProof')}</li>}
                    {details.invitationLettersAvailable && <li>{t('invitationLetters')}</li>}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </section>
        )}
      </div>
    </>
  )
}
