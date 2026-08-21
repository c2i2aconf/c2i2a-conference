import { getTranslations, setRequestLocale } from 'next-intl/server'
import type { Metadata } from 'next'

import { PageHero } from '@/components/sections/PageHero'
import { MagicLinkForm } from '@/components/sections/MagicLinkForm'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: 'fr' | 'en' }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'auth' })
  return { title: t('loginTitle') }
}

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: 'fr' | 'en' }>
  searchParams: Promise<{ error?: string }>
}) {
  const { locale } = await params
  const { error } = await searchParams
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: 'auth' })

  return (
    <>
      <PageHero title={t('loginTitle')} subtitle={t('loginSubtitle')} />
      <section className="container py-16 md:py-24">
        <MagicLinkForm urlError={error} />
      </section>
    </>
  )
}
