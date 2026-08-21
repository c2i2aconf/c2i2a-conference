import { getTranslations, setRequestLocale } from 'next-intl/server'
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import { LockKeyhole } from 'lucide-react'
import type { Metadata } from 'next'

import configPromise from '@payload-config'
import { Link } from '@/i18n/navigation'
import { PageHero } from '@/components/sections/PageHero'
import { SubmissionForm } from '@/components/sections/SubmissionForm'
import { Countdown } from '@/components/sections/Countdown'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getLiveEdition } from '@/lib/queries'
import { isSubmissionWindowOpen } from '@/lib/workflow-policy'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: 'fr' | 'en' }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'submission' })
  return { title: t('title') }
}

export default async function SubmissionPage({
  params,
}: {
  params: Promise<{ locale: 'fr' | 'en' }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: 'submission' })

  const edition = await getLiveEdition(locale)
  const submissionsOpen = isSubmissionWindowOpen(edition)

  let user = null
  try {
    const payload = await getPayload({ config: configPromise })
    ;({ user } = await payload.auth({ headers: await headers() }))
  } catch {
    user = null
  }

  return (
    <>
      <PageHero title={t('title')} subtitle={t('cfp')} />

      <section className="container py-16 md:py-24">
        {!submissionsOpen ? (
          <Card className="mx-auto max-w-xl text-center">
            <CardHeader>
              <CardTitle>{t('closedTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">{t('closedText')}</CardContent>
          </Card>
        ) : user ? (
          <div className="space-y-10">
            <div className="mx-auto max-w-xl text-center">
              <p className="mb-5 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {t('deadline')}
              </p>
              <Countdown target={edition!.submissionDeadline!} tone="card" />
            </div>
            <SubmissionForm />
          </div>
        ) : (
          <Card className="mx-auto max-w-md">
            <CardHeader className="text-center">
              <LockKeyhole className="mx-auto mb-2 h-10 w-10 text-primary" />
              <CardTitle>{t('signInTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-center">
              <p className="text-sm text-muted-foreground">{t('signInText')}</p>
              <Button asChild className="w-full">
                <Link href="/auth/login">{t('signInCta')}</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </section>
    </>
  )
}
