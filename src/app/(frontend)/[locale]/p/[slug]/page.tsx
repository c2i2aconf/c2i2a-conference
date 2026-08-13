import { setRequestLocale } from 'next-intl/server'
import { getLiveEdition, getPageBySlug } from '@/lib/queries'
import { notFound } from 'next/navigation'
import { RichText } from '@payloadcms/richtext-lexical/react'

export default async function CustomPage({
  params,
}: {
  params: Promise<{ locale: 'fr' | 'en'; slug: string }>
}) {
  const { locale, slug } = await params
  setRequestLocale(locale)

  const edition = await getLiveEdition(locale)
  
  if (!edition) {
    notFound()
  }

  const page = await getPageBySlug(slug, edition.id, locale)

  if (!page) {
    notFound()
  }

  return (
    <div className="container py-12 md:py-24 max-w-4xl mx-auto">
      <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-8">{page.title}</h1>
      
      {page.content ? (
        <div className="prose prose-lg dark:prose-invert max-w-none">
          <RichText data={page.content} />
        </div>
      ) : (
        <p className="text-muted-foreground">Ce contenu est vide.</p>
      )}
    </div>
  )
}
