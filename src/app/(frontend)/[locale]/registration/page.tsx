import { getTranslations, setRequestLocale } from 'next-intl/server'
import type { Metadata } from 'next'

import { RegistrationForm } from '@/components/sections/RegistrationForm'
import { PageHero } from '@/components/sections/PageHero'

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

  return (
    <>
      <PageHero title={t('title')} subtitle={t('subtitle')} />
      <section className="container py-12 md:py-20">
        <RegistrationForm />
      </section>
    </>
  )
}
