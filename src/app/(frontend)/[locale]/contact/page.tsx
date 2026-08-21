import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Building2, Mail, Share2 } from 'lucide-react'
import type { Metadata } from 'next'

import { getSiteSettings } from '@/lib/queries'
import { PageHero } from '@/components/sections/PageHero'
import { Reveal } from '@/components/motion/Reveal'
import { Card, CardContent } from '@/components/ui/card'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: 'fr' | 'en' }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'contact' })
  return { title: t('title') }
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: 'fr' | 'en' }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: 'contact' })
  const settings = await getSiteSettings(locale)
  const email = settings?.contactEmail

  return (
    <>
      <PageHero title={t('title')} subtitle={t('subtitle')} />

      <section className="container py-16 md:py-24">
        <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Reveal>
            {email ? (
              <a href={`mailto:${email}`} className="block h-full">
                <Card className="h-full transition-shadow hover:shadow-lg">
                  <CardContent className="flex h-full flex-col items-center p-8 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Mail className="h-5 w-5" />
                    </span>
                    <h2 className="mt-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      {t('email')}
                    </h2>
                    <p className="mt-2 break-all font-medium text-foreground">{email}</p>
                  </CardContent>
                </Card>
              </a>
            ) : null}
          </Reveal>

          <Reveal delay={0.1}>
            <Card className="h-full">
              <CardContent className="flex h-full flex-col items-center p-8 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Building2 className="h-5 w-5" />
                </span>
                <h2 className="mt-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('organization')}
                </h2>
                <p className="mt-2 font-medium text-foreground">{settings?.organizationName}</p>
                {settings?.organizationAddress ? (
                  <p className="whitespace-pre-line text-sm text-muted-foreground">
                    {settings.organizationAddress}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </Reveal>

          <Reveal delay={0.2}>
            <Card className="h-full">
              <CardContent className="flex h-full flex-col items-center p-8 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Share2 className="h-5 w-5" />
                </span>
                <h2 className="mt-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('socials')}
                </h2>
                {settings?.socials && settings.socials.length > 0 ? (
                  <ul className="mt-2 space-y-1.5">
                    {settings.socials.map((social) => (
                      <li key={social.id}>
                        <a
                          href={social.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium capitalize text-foreground transition-colors hover:text-primary"
                        >
                          {social.platform}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">{t('socialsEmpty')}</p>
                )}
              </CardContent>
            </Card>
          </Reveal>
        </div>
      </section>
    </>
  )
}
