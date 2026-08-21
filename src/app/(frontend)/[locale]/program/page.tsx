import { getTranslations, setRequestLocale } from 'next-intl/server'
import type { Metadata } from 'next'

import { getLiveEdition, getSessions } from '@/lib/queries'
import { ProgramSchedule } from '@/components/sections/ProgramSchedule'
import { PageHero } from '@/components/sections/PageHero'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: 'fr' | 'en' }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'program' })
  return { title: t('title') }
}

export default async function ProgramPage({
  params,
}: {
  params: Promise<{ locale: 'fr' | 'en' }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: 'program' })

  const edition = await getLiveEdition(locale)
  const sessions = edition ? await getSessions(edition.id, locale) : []

  return (
    <>
      <PageHero title={t('title')} subtitle={t('subtitle')} />
      <section className="container py-12 md:py-20">
        {!edition || sessions.length === 0 ? (
          <p className="text-center text-muted-foreground">{t('empty')}</p>
        ) : (
          <ProgramSchedule sessions={sessions} />
        )}
      </section>
    </>
  )
}
