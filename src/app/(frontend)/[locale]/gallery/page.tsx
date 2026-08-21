import React from 'react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import Image from 'next/image'
import type { Metadata } from 'next'

import { getLiveEdition, getGalleryItems } from '@/lib/queries'
import { PageHero } from '@/components/sections/PageHero'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: 'fr' | 'en' }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'gallery' })
  return { title: t('title') }
}

export default async function GalleryPage({
  params,
}: {
  params: Promise<{ locale: 'fr' | 'en' }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: 'gallery' })
  const edition = await getLiveEdition(locale)
  const items = edition ? await getGalleryItems(edition.id, locale) : []

  return (
    <>
      <PageHero title={t('title')} subtitle={t('subtitle')} />
      <div className="container py-12 md:py-20">
        {!edition || items.length === 0 ? (
          <p className="text-center text-muted-foreground">{t('empty')}</p>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
            {items.map((item) => {
              if (!item.image || typeof item.image !== 'object' || !item.image.url) return null
              return (
                <div
                  key={item.id}
                  className="break-inside-avoid relative group rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all"
                >
                  <Image
                    src={item.image.url}
                    alt={item.caption || t('imageAlt')}
                    width={item.image.width ?? 1200}
                    height={item.image.height ?? 800}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {item.caption && (
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                      <p className="text-white text-sm font-medium">{item.caption}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
