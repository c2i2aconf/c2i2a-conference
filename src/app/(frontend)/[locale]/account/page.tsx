import { getTranslations, setRequestLocale } from 'next-intl/server'
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import { FileText, UserRound } from 'lucide-react'
import type { Metadata } from 'next'

import configPromise from '@payload-config'
import { Link, redirect } from '@/i18n/navigation'
import { PageHero } from '@/components/sections/PageHero'
import { LogoutButton } from '@/components/layout/LogoutButton'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: 'fr' | 'en' }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'auth' })
  return { title: t('accountTitle') }
}

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: 'fr' | 'en' }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: 'auth' })
  const tSub = await getTranslations({ locale, namespace: 'submission' })

  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) {
    redirect({ href: '/auth/login', locale })
    return null
  }

  const [registrations, submissions] = await Promise.all([
    payload.find({
      collection: 'registrations',
      where: { user: { equals: user.id } },
      sort: '-createdAt',
      limit: 20,
      user,
      overrideAccess: false,
    }),
    payload.find({
      collection: 'submissions',
      where: { author: { equals: user.id } },
      sort: '-createdAt',
      limit: 20,
      user,
      overrideAccess: false,
    }),
  ])

  const submissionIDs = submissions.docs.map((submission) => submission.id)
  const completedReviews = submissionIDs.length
    ? await payload.find({
        collection: 'reviewer-assignments',
        depth: 0,
        overrideAccess: false,
        pagination: false,
        select: {
          authorComments: true,
          recommendation: true,
          submission: true,
          submittedAt: true,
        },
        sort: 'reviewerNumber',
        user,
        where: {
          and: [
            { submission: { in: submissionIDs } },
            { status: { equals: 'completed' } },
          ],
        },
      })
    : { docs: [] }
  const safeReviewsBySubmission = new Map<
    number,
    Array<{ authorComments: string; recommendation: 'accept' | 'revision' | 'reject' }>
  >()
  for (const review of completedReviews.docs) {
    if (!review.authorComments || !review.recommendation) continue
    const submissionID =
      typeof review.submission === 'number' ? review.submission : review.submission.id
    const reports = safeReviewsBySubmission.get(submissionID) ?? []
    reports.push({
      authorComments: review.authorComments,
      recommendation: review.recommendation,
    })
    safeReviewsBySubmission.set(submissionID, reports)
  }

  const statusVariant = (status: string) =>
    status === 'accepted' ? 'default' : status === 'rejected' ? 'destructive' : 'secondary'

  return (
    <>
      <PageHero title={t('accountTitle')} subtitle={`${t('signedInAs')} ${user.email}`} />

      <section className="container space-y-8 py-16 md:py-24">
        <div className="mx-auto max-w-3xl space-y-8">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2">
                <UserRound className="h-5 w-5 text-primary" />
                {t('profile')}
              </CardTitle>
              <LogoutButton />
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground">
                {[user.firstName, user.lastName].filter(Boolean).join(' ') || user.email}
              </p>
              <p>{user.email}</p>
              {user.affiliation && <p>{user.affiliation}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('myRegistrations')}</CardTitle>
            </CardHeader>
            <CardContent>
              {registrations.docs.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('noRegistrations')}</p>
              ) : (
                <ul className="divide-y divide-border">
                  {registrations.docs.map((reg) => (
                    <li key={reg.id} className="flex items-center justify-between py-3 text-sm">
                      <span className="font-medium">
                        {reg.firstName} {reg.lastName}
                      </span>
                      <Badge variant={reg.status === 'confirmed' ? 'default' : 'secondary'}>
                        {reg.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                {t('mySubmissions')}
              </CardTitle>
              <Button asChild size="sm">
                <Link href="/submission">{t('newSubmission')}</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {submissions.docs.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('noSubmissions')}</p>
              ) : (
                <ul className="divide-y divide-border">
                  {submissions.docs.map((sub) => (
                    <li key={sub.id} className="space-y-4 py-4 text-sm">
                      <div className="flex items-center justify-between gap-4">
                        <span className="min-w-0 truncate font-medium">{sub.title}</span>
                        <Badge variant={statusVariant(sub.status)}>
                          {tSub(`status.${sub.status}`)}
                        </Badge>
                      </div>
                      {sub.authorDecisionComments ? (
                        <div className="rounded-lg border border-border bg-muted/40 p-4">
                          <p className="mb-1 font-medium">{tSub('decisionComments')}</p>
                          <p className="text-muted-foreground">{sub.authorDecisionComments}</p>
                        </div>
                      ) : null}
                      {(safeReviewsBySubmission.get(sub.id) ?? []).map((review, index) => (
                        <div key={index} className="rounded-lg border border-border p-4">
                          <p className="font-medium">
                            {tSub('reviewReport', { number: index + 1 })}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {tSub('recommendation', {
                              recommendation: tSub(
                                `recommendations.${review.recommendation}`,
                              ),
                            })}
                          </p>
                          <p className="mt-2 text-muted-foreground">{review.authorComments}</p>
                        </div>
                      ))}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  )
}
