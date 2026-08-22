import type { Media } from '@/payload-types'

type MediaField = Media | number | string | null | undefined

export interface ResolvedImage {
  url: string
  width?: number
  height?: number
}

/** The populated media doc for an upload relation, or null when only an ID. */
export function getMediaDoc(media: MediaField): Media | null {
  return media && typeof media === 'object' ? (media as Media) : null
}

/** Prefers a generated size variant (thumbnail/card/hero), falling back to the original. */
export function getMediaVariant(
  media: MediaField,
  size: keyof NonNullable<Media['sizes']>,
): ResolvedImage | null {
  const doc = getMediaDoc(media)
  if (!doc) return null
  const variant = doc.sizes?.[size]
  if (variant?.url) {
    return {
      url: variant.url,
      width: variant.width ?? undefined,
      height: variant.height ?? undefined,
    }
  }
  return doc.url
    ? { url: doc.url, width: doc.width ?? undefined, height: doc.height ?? undefined }
    : null
}

/** Original-file URL of a populated upload relation (hero backgrounds, OG images). */
export function getMediaUrl(media: MediaField): string | null {
  return getMediaDoc(media)?.url ?? null
}
