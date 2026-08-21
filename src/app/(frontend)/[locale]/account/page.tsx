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
                    <li
                      key={sub.id}
                      className="flex items-center justify-between gap-4 py-3 text-sm"
                    >
                      <span className="min-w-0 truncate font-medium">{sub.title}</span>
                      <Badge variant={statusVariant(sub.status)}>
                        {tSub(`status.${sub.status}`)}
                      </Badge>
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
