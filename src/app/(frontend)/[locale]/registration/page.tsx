import { getTranslations, setRequestLocale } from 'next-intl/server'
import type { Metadata } from 'next'

import { RegistrationForm } from '@/components/sections/RegistrationForm'
import { PageHero } from '@/components/sections/PageHero'
import { Card, CardContent } from '@/components/ui/card'
import { getConferenceDetails, getLiveEdition } from '@/lib/queries'

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
      <section className="container py-12 md:py-20">
        {details?.registrationFees?.length ? (
          <div className="mx-auto mb-10 max-w-3xl">
            <h2 className="text-2xl font-bold">{t('fees')}</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {details.registrationFees.map((fee) => (
                <Card key={fee.id ?? fee.code}>
                  <CardContent className="flex items-center justify-between gap-4 p-5">
                    <span>{fee.label}</span>
                    <strong className="whitespace-nowrap">
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
            <div className="mt-5 space-y-1 text-sm text-muted-foreground">
              {details.paymentProofRequired && <p>{t('paymentProofRequired')}</p>}
              {details.invitationLettersAvailable && <p>{t('invitationLettersAvailable')}</p>}
            </div>
          </div>
        ) : null}
        {edition?.registrationEnabled ? (
          <RegistrationForm />
        ) : (
          <p className="text-center text-muted-foreground">{t('notOpen')}</p>
        )}
      </section>
    </>
  )
}
