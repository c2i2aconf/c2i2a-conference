import { getTranslations, setRequestLocale } from 'next-intl/server'
import type { Metadata } from 'next'
import { CheckCircle2, LockKeyhole, Ticket } from 'lucide-react'

import { RegistrationForm } from '@/components/sections/RegistrationForm'
import { PageHero } from '@/components/sections/PageHero'
import { Card, CardContent } from '@/components/ui/card'
import { getConferenceDetails, getLiveEdition } from '@/lib/queries'
import { SectionHeading } from '@/components/sections/SectionHeading'

// CMS edits revalidate on demand (collection hooks); hourly ISR is the fallback
export const revalidate = 3600

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: 'fr' | 'en' }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'registration' })
  return { title: t('title') }
}

export default async function RegistrationPage({
  params,
}: {
  params: Promise<{ locale: 'fr' | 'en' }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: 'registration' })
  const edition = await getLiveEdition(locale)
  const details = edition ? await getConferenceDetails(edition.id, locale) : null

  return (
    <>
      <PageHero title={t('title')} subtitle={t('subtitle')} />
      <section className="container section-pad">
        {!edition?.registrationEnabled && (
          <div className="academic-card mx-auto mb-12 flex max-w-4xl flex-col items-start gap-5 border-l-4 border-l-accent p-6 sm:flex-row sm:items-center">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent-foreground dark:text-accent">
              <LockKeyhole className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold">{t('notOpenTitle')}</h2>
              <p className="mt-1 text-muted-foreground">{t('notOpen')}</p>
            </div>
          </div>
        )}
        {details?.registrationFees?.length ? (
          <div className="mx-auto mb-10 max-w-5xl">
            <SectionHeading
              align="left"
              eyebrow={t('participation')}
              title={t('fees')}
              subtitle={t('feesSubtitle')}
            />
            <div className="mt-9 grid gap-4 sm:grid-cols-2">
              {details.registrationFees.map((fee) => (
                <Card key={fee.id ?? fee.code} className="academic-card py-0">
                  <CardContent className="flex items-center justify-between gap-4 p-5 sm:p-6">
                    <span className="flex items-center gap-3 font-medium">
                      <Ticket className="h-5 w-5 shrink-0 text-accent" />
                      {fee.label}
                    </span>
                    <strong className="whitespace-nowrap text-primary">
                      {fee.exempt
                        ? t('exempt')
                        : `${fee.amount} ${fee.currency}${
                            fee.alternateAmount && fee.alternateCurrency
                              ? ` / ${fee.alternateAmount} ${fee.alternateCurrency}`
                              : ''
                          }`}
                    </strong>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="mt-8 grid gap-3 rounded-xl bg-muted/50 p-5 text-sm sm:grid-cols-2">
              {details.paymentProofRequired && (
                <p className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {t('paymentProofRequired')}
                </p>
              )}
              {details.invitationLettersAvailable && (
                <p className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {t('invitationLettersAvailable')}
                </p>
              )}
            </div>
          </div>
        ) : null}
        {edition?.registrationEnabled ? <RegistrationForm /> : null}
      </section>
    </>
  )
}
