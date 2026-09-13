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
import { WorkflowUploadForm } from '@/components/sections/WorkflowUploadForm'
import { isRevisionRoundOpen } from '@/lib/workflow-policy'
import { isPortalRole } from '@/lib/workflow-policy'
import { getConferenceDetails, getLiveEdition } from '@/lib/queries'
import { relationshipID } from '@/lib/workflow-boundary'
import { PaymentProofForm } from '@/components/sections/PaymentProofForm'
import { RegistrationForm } from '@/components/sections/RegistrationForm'

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
  const tReg = await getTranslations({ locale, namespace: 'registration' })

  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) {
    redirect({ href: '/auth/login', locale })
    return null
  }
  if (!isPortalRole(user.role)) {
    redirect({ href: '/', locale })
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

  const [proofs, invitations, liveEdition] = await Promise.all([
    payload.find({
      collection: 'payment-proofs',
      where: { user: { equals: user.id } },
      sort: '-sequence',
      pagination: false,
      depth: 0,
      overrideAccess: false,
      user,
    }),
    payload.find({
      collection: 'invitation-letters',
      where: { user: { equals: user.id } },
      pagination: false,
      depth: 0,
      overrideAccess: false,
      user,
    }),
    getLiveEdition(locale),
  ])
  const liveDetails = liveEdition ? await getConferenceDetails(liveEdition.id, locale) : null
  const detailsByEdition = new Map(
    await Promise.all(
      [...new Set(registrations.docs.map((reg) => relationshipID(reg.edition)!))].map(
        async (id) => [id, await getConferenceDetails(id, locale)] as const,
      ),
    ),
  )

  const submissionIDs = submissions.docs.map((submission) => submission.id)
  const revisionRounds = submissionIDs.length
    ? await payload.find({
        collection: 'revision-rounds',
        depth: 0,
        overrideAccess: false,
        pagination: false,
        select: {
          deadline: true,
          instructions: true,
          resubmittedAt: true,
          roundNumber: true,
          status: true,
          submission: true,
        },
        sort: 'roundNumber',
        user,
        where: { submission: { in: submissionIDs } },
      })
    : { docs: [] }
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
          and: [{ submission: { in: submissionIDs } }, { status: { equals: 'completed' } }],
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
  const revisionRoundsBySubmission = new Map<number, typeof revisionRounds.docs>()
  for (const round of revisionRounds.docs) {
    const submissionID =
      typeof round.submission === 'number' ? round.submission : round.submission.id
    const rounds = revisionRoundsBySubmission.get(submissionID) ?? []
    rounds.push(round)
    revisionRoundsBySubmission.set(submissionID, rounds)
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
                    <li key={reg.id} className="space-y-3 py-3 text-sm">
                      <span className="font-medium">
                        {reg.firstName} {reg.lastName}
                      </span>
                      <Badge variant={reg.status === 'confirmed' ? 'default' : 'secondary'}>
                        {reg.status}
                      </Badge>
                      <p>{typeof reg.edition === 'object' ? reg.edition.title : reg.edition}</p>
                      {reg.feeCategory && (
                        <>
                          <p>
                            {reg.feeLabel}:{' '}
                            {reg.feeExempt ? tReg('exempt') : `${reg.feeAmount} ${reg.feeCurrency}`}
                          </p>
                          <p>
                            {tReg(
                              `paymentStates.${reg.feeExempt ? (reg.exemptionApprovedAt ? 'exempt' : 'exemption-pending') : (proofs.docs.find((proof) => proof.registration === reg.id)?.status ?? 'not-submitted')}`,
                            )}
                          </p>
                          {proofs.docs
                            .filter((proof) => proof.registration === reg.id)
                            .map((proof) => (
                              <div key={proof.id} className="rounded border p-3">
                                <a href={proof.url ?? undefined} className="underline">
                                  {tReg('proofNumber', { number: proof.sequence })}
                                </a>
                                <span className="ml-2">
                                  {tReg(`paymentStates.${proof.status}`)}
                                </span>
                                {proof.reviewComment && <p>{proof.reviewComment}</p>}
                              </div>
                            ))}
                          {reg.status === 'confirmed' &&
                            !reg.feeExempt &&
                            isPortalRole(user.role) &&
                            ['not-submitted', 'rejected'].includes(
                              proofs.docs.find((proof) => proof.registration === reg.id)?.status ??
                                'not-submitted',
                            ) &&
                            (detailsByEdition.get(relationshipID(reg.edition)!)?.paymentProofFormats
                              ?.length ? (
                              <PaymentProofForm
                                registration={reg.id}
                                edition={relationshipID(reg.edition)!}
                                formats={
                                  detailsByEdition.get(relationshipID(reg.edition)!)!
                                    .paymentProofFormats!
                                }
                              />
                            ) : (
                              <p>{tReg('proofPolicyPending')}</p>
                            ))}
                          {invitations.docs
                            .filter(
                              (letter) =>
                                letter.registration === reg.id && letter.status === 'issued',
                            )
                            .map((letter) => (
                              <article key={letter.id} className="rounded border p-4">
                                <h3 className="font-semibold">{tReg('invitationIssued')}</h3>
                                <p>
                                  {letter.recipientName} · {letter.recipientEmail}
                                </p>
                                <p className="whitespace-pre-wrap">{letter.body}</p>
                                <time dateTime={letter.issuedAt ?? undefined}>
                                  {letter.issuedAt
                                    ? new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(
                                        new Date(letter.issuedAt),
                                      )
                                    : ''}
                                </time>
                              </article>
                            ))}
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {isPortalRole(user.role) &&
          liveEdition?.registrationEnabled &&
          liveDetails?.registrationFees?.length &&
          !registrations.docs.some(
            (reg) => relationshipID(reg.edition) === liveEdition.id && reg.status === 'confirmed',
          ) ? (
            <RegistrationForm fees={liveDetails.registrationFees} profile={user} />
          ) : null}

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
                  {submissions.docs.map((sub) => {
                    const rounds = revisionRoundsBySubmission.get(sub.id) ?? []
                    const openRound = rounds.find((round) => round.status === 'open')
                    const revisionCanBeSubmitted = openRound && isRevisionRoundOpen(openRound)
                    return (
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
                                recommendation: tSub(`recommendations.${review.recommendation}`),
                              })}
                            </p>
                            <p className="mt-2 text-muted-foreground">{review.authorComments}</p>
                          </div>
                        ))}
                        {rounds.map((round) => (
                          <div
                            key={round.id}
                            className="rounded-lg border border-amber-500/40 bg-amber-50/50 p-4 dark:bg-amber-950/10"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="font-medium">
                                {tSub('revisionRound', { number: round.roundNumber })}
                              </p>
                              <Badge variant="secondary">
                                {tSub(`revisionStatus.${round.status}`)}
                              </Badge>
                            </div>
                            <p className="mt-2 text-muted-foreground">{round.instructions}</p>
                            {round.deadline ? (
                              <p className="mt-2 font-medium">
                                {tSub('revisionDeadline', {
                                  deadline: new Intl.DateTimeFormat(
                                    locale === 'fr' ? 'fr-FR' : 'en-GB',
                                    {
                                      dateStyle: 'long',
                                      timeStyle: 'short',
                                      timeZone: 'Europe/Paris',
                                    },
                                  ).format(new Date(round.deadline)),
                                })}
                              </p>
                            ) : null}
                            {round.resubmittedAt ? (
                              <p className="mt-2 text-green-700 dark:text-green-400">
                                {tSub('revisionSubmitted')}
                              </p>
                            ) : null}
                            {round.id === openRound?.id && revisionCanBeSubmitted ? (
                              <div className="mt-4 border-t border-amber-500/30 pt-4">
                                <WorkflowUploadForm
                                  kind="revision"
                                  revisionRound={round.id}
                                  submission={sub.id}
                                />
                              </div>
                            ) : round.id === openRound?.id ? (
                              <p className="mt-3 font-medium text-destructive">
                                {tSub('revisionClosed')}
                              </p>
                            ) : null}
                          </div>
                        ))}
                        {sub.status === 'accepted' ? (
                          <div className="rounded-lg border border-green-500/40 bg-green-50/50 p-4 dark:bg-green-950/10">
                            <p className="font-medium">{tSub('finalAcceptance')}</p>
                            {sub.cameraReadyFile ? (
                              <p className="mt-2 text-green-700 dark:text-green-400">
                                {tSub('cameraReadySubmitted')}
                              </p>
                            ) : (
                              <div className="mt-3">
                                <p className="mb-3 text-muted-foreground">
                                  {tSub('cameraReadyRequired')}
                                </p>
                                <WorkflowUploadForm kind="camera-ready" submission={sub.id} />
                              </div>
                            )}
                          </div>
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  )
}
