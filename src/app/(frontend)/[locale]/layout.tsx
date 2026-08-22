import type { Metadata } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import { notFound } from 'next/navigation'
import { NextIntlClientProvider, hasLocale, type AbstractIntlMessages } from 'next-intl'
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server'
import { ThemeProvider } from 'next-themes'
import React from 'react'

import { routing } from '@/i18n/routing'
import { getServerURL } from '@/lib/server-url'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'

import '../globals.css'

/** Namespaces used by client components — the rest stay server-only. */
const CLIENT_NAMESPACES = ['common', 'nav', 'auth', 'program', 'registration', 'submission']

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'metadata' })
  return {
    metadataBase: new URL(getServerURL()),
    title: { default: t('title'), template: `%s | C2I2A` },
    description: t('description'),
    alternates: {
      languages: { fr: '/fr', en: '/en' },
    },
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  setRequestLocale(locale)

  const messages = await getMessages()
  const clientMessages = Object.fromEntries(
    CLIENT_NAMESPACES.map((namespace) => [namespace, messages[namespace]]),
  ) as AbstractIntlMessages

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${inter.variable} ${spaceGrotesk.variable} font-sans`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <NextIntlClientProvider messages={clientMessages}>
            <div className="relative flex min-h-screen flex-col">
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
