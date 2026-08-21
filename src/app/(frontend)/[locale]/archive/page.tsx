import { getTranslations, setRequestLocale } from 'next-intl/server'
import Image from 'next/image'
import type { Metadata } from 'next'

import { getArchivedEditions } from '@/lib/queries'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { PageHero } from '@/components/sections/PageHero'
import { Link } from '@/i18n/navigation'
import { Calendar } from 'lucide-react'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: 'fr' | 'en' }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'archive' })
  return { title: t('title') }
}

export default async function ArchiveIndexPage({
  params,
}: {
  params: Promise<{ locale: 'fr' | 'en' }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: 'archive' })
  const archives = await getArchivedEditions(locale)

  return (
    <>
      <PageHero title={t('title')} subtitle={t('subtitle')} />
      <div className="container py-12 md:py-20">
        {archives.length === 0 ? (
          <p className="text-center text-muted-foreground">{t('empty')}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {archives.map((edition) => (
              <Link key={edition.id} href={`/archive/${edition.year}`} className="block group">
                <Card className="h-full overflow-hidden hover:shadow-xl transition-all group-hover:border-primary">
                  {edition.posterImage &&
                  typeof edition.posterImage === 'object' &&
                  edition.posterImage.url ? (
                    <div className="aspect-[4/3] relative overflow-hidden bg-muted">
                      <Image
                        src={edition.posterImage.url}
                        alt={edition.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  ) : (
                    <div className="aspect-[4/3] bg-muted flex items-center justify-center">
                      <Calendar className="w-12 h-12 text-muted-foreground/30" />
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-primary font-bold">{edition.year}</span>
                    </div>
                    <CardTitle className="group-hover:text-primary transition-colors">
                      {edition.title}
                    </CardTitle>
                    {edition.theme && <CardDescription>{edition.theme}</CardDescription>}
                  </CardHeader>
                  <CardContent>
                    <span className="text-sm font-medium text-primary">
                      {t('viewEdition')} &rarr;
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
