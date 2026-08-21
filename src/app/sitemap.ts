import type { MetadataRoute } from 'next'

import { routing } from '@/i18n/routing'
import { getArchivedEditions, getLiveEdition, getNavigationPages } from '@/lib/queries'
import { getServerURL } from '@/lib/server-url'

const STATIC_ROUTES = [
  '',
  '/about',
  '/access',
  '/archive',
  '/committees',
  '/contact',
  '/dates',
  '/gallery',
  '/program',
  '/registration',
  '/speakers',
  '/sponsors',
  '/submission',
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = getServerURL()
  const entries: MetadataRoute.Sitemap = []

  await Promise.all(
    routing.locales.map(async (locale) => {
      const [live, archived] = await Promise.all([
        getLiveEdition(locale),
        getArchivedEditions(locale),
      ])
      const customPages = live ? await getNavigationPages(live.id, locale) : []
      for (const route of STATIC_ROUTES) {
        entries.push({ url: `${origin}/${locale}${route}`, changeFrequency: 'weekly' })
      }
      for (const page of customPages) {
        entries.push({ url: `${origin}/${locale}/p/${page.slug}`, changeFrequency: 'monthly' })
      }
      for (const edition of archived) {
        entries.push({
          url: `${origin}/${locale}/archive/${edition.year}`,
          changeFrequency: 'yearly',
        })
      }
    }),
  )

  return entries
}
