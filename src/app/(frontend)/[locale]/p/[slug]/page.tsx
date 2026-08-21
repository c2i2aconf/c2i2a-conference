import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getLiveEdition, getPageBySlug } from '@/lib/queries'
import { notFound } from 'next/navigation'
import { RichText } from '@payloadcms/richtext-lexical/react'
import type { Metadata } from 'next'
import { PageHero } from '@/components/sections/PageHero'

type Props = { params: Promise<{ locale: 'fr' | 'en'; slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const edition = await getLiveEdition(locale)
  const page = edition ? await getPageBySlug(slug, edition.id, locale) : null
  return { title: page?.title || slug, alternates: { canonical: `/${locale}/p/${slug}` } }
}

export default async function CustomPage({ params }: Props) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'customPage' })

  const edition = await getLiveEdition(locale)

  if (!edition) {
    notFound()
  }

  const page = await getPageBySlug(slug, edition.id, locale)

  if (!page) {
    notFound()
  }

  return (
    <>
      <PageHero eyebrow={`C2I2A ${edition.year}`} title={page.title} />
      <div className="container mx-auto max-w-4xl py-12 md:py-24">
        {page.content ? (
          <div className="rich-text">
            <RichText data={page.content} />
          </div>
        ) : (
          <p className="text-muted-foreground">{t('empty')}</p>
        )}
      </div>
    </>
  )
}
