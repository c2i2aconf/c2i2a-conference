import type { MetadataRoute } from 'next'
import { getServerURL } from '@/lib/server-url'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/', '/graphql', '/*/account', '/*/auth/'],
    },
    sitemap: `${getServerURL()}/sitemap.xml`,
  }
}
