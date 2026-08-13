import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  // Supported locales — French first (HEEC Marrakech primary language)
  locales: ['fr', 'en'],
  defaultLocale: 'fr',
  // Prefix: /fr/... and /en/... (explicit, good for SEO + archives)
  localePrefix: 'always',
})

export type Locale = (typeof routing.locales)[number]
