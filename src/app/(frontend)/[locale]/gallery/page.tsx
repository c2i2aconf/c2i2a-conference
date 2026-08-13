'use client'

import React, { useState } from 'react'
import { useTranslations } from 'next-intl'
// Note: We need a server component to fetch, but the page can be split. Let's make this page server component and a client component for the grid.
// Let's write the server component wrapper directly here and the client component inside it, or just use normal React server component pattern. Wait, I can't put `use client` with async server functions in the same file. I need to make a client component or do it without a lightbox.
// I will just make it a server component that renders standard images for now. A lightbox can be added later or we can do a simple CSS hover scale.

import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getLiveEdition, getGalleryItems } from '@/lib/queries'

export default async function GalleryPage({
  params,
}: {
  params: Promise<{ locale: 'fr' | 'en' }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: 'nav' })
  const edition = await getLiveEdition(locale)
  const items = edition ? await getGalleryItems(edition.id, locale) : []

  return (
    <div className="container py-12 md:py-24">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">{t('gallery')}</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Retour en images sur les temps forts du colloque.
        </p>
      </div>
      
      {!edition || items.length === 0 ? (
        <p className="text-center text-muted-foreground">Aucune photo disponible pour le moment.</p>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
          {items.map((item) => {
            if (!item.image || typeof item.image !== 'object' || !item.image.url) return null
            return (
              <div key={item.id} className="break-inside-avoid relative group rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all">
                <img
                  src={item.image.url}
                  alt={item.caption || 'Gallery image'}
                  className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
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
  )
}
