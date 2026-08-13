import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getLiveEdition, getSessions } from '@/lib/queries'
import { ProgramSchedule } from '@/components/sections/ProgramSchedule'
import { notFound } from 'next/navigation'

export default async function ProgramPage({
  params,
}: {
  params: Promise<{ locale: 'fr' | 'en' }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: 'program' })
  
  const edition = await getLiveEdition(locale)
  if (!edition) {
    // If no live edition, return a graceful state
    return (
      <div className="container py-24 text-center">
        <h1 className="text-4xl font-bold mb-4">{t('title')}</h1>
        <p className="text-muted-foreground">Aucune édition en cours pour le moment.</p>
      </div>
    )
  }

  const sessions = await getSessions(edition.id, locale)

  return (
    <div className="container py-12 md:py-24">
      <div className="mb-12">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">{t('title')}</h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Découvrez le programme détaillé du colloque. Vous pouvez filtrer les sessions par jour.
        </p>
      </div>
      
      <ProgramSchedule sessions={sessions} />
    </div>
  )
}
