import { getPayload } from 'payload'
import configPromise from '@payload-config'
import type {
  Edition,
  Session,
  ImportantDate,
  Speaker,
  Sponsor,
  Committee,
  GalleryItem,
  Page,
  SiteSetting,
} from '@/payload-types'

async function getCachedPayload() {
  return await getPayload({ config: configPromise })
}

function logQueryFailure(context: string, error: unknown) {
  const cause = error instanceof Error ? error.cause : undefined
  const code =
    cause && typeof cause === 'object' && 'code' in cause ? String(cause.code) : 'unavailable'
  console.error(`${context} (${code})`)
}

export async function getSiteSettings(locale: 'fr' | 'en'): Promise<SiteSetting | null> {
  try {
    const payload = await getCachedPayload()
    return await payload.findGlobal({
      slug: 'site-settings',
      locale,
      fallbackLocale: 'fr',
    })
  } catch (error) {
    logQueryFailure('Failed to fetch site settings', error)
    return null
  }
}

export async function getLiveEdition(locale: 'fr' | 'en'): Promise<Edition | null> {
  try {
    const payload = await getCachedPayload()
    const { docs } = await payload.find({
      collection: 'editions',
      locale,
      fallbackLocale: 'fr',
      where: {
        editionStatus: {
          equals: 'live',
        },
      },
      // Deterministic pick if several editions are ever live at once
      sort: '-startDate',
      limit: 1,
    })
    return docs[0] || null
  } catch (error) {
    logQueryFailure('Failed to fetch live edition', error)
    return null
  }
}

export async function getEditionByYear(year: number, locale: 'fr' | 'en'): Promise<Edition | null> {
  try {
    const payload = await getCachedPayload()
    const { docs } = await payload.find({
      collection: 'editions',
      locale,
      fallbackLocale: 'fr',
      where: {
        year: {
          equals: year,
        },
      },
      limit: 1,
    })
    return docs[0] || null
  } catch (error) {
    logQueryFailure(`Failed to fetch edition ${year}`, error)
    return null
  }
}

export async function getArchivedEditions(locale: 'fr' | 'en'): Promise<Edition[]> {
  try {
    const payload = await getCachedPayload()
    const { docs } = await payload.find({
      collection: 'editions',
      locale,
      fallbackLocale: 'fr',
      where: {
        editionStatus: {
          equals: 'archived',
        },
      },
      sort: '-year',
    })
    return docs
  } catch (error) {
    logQueryFailure('Failed to fetch archived editions', error)
    return []
  }
}

export async function getSessions(editionId: number, locale: 'fr' | 'en'): Promise<Session[]> {
  try {
    const payload = await getCachedPayload()
    const { docs } = await payload.find({
      collection: 'sessions',
      locale,
      fallbackLocale: 'fr',
      where: {
        edition: {
          equals: editionId,
        },
      },
      depth: 2, // to get room and speakers
      sort: 'date,startTime',
      limit: 100, // Reasonable max
    })
    return docs
  } catch (error) {
    logQueryFailure('Failed to fetch sessions', error)
    return []
  }
}

export async function getImportantDates(
  editionId: number,
  locale: 'fr' | 'en',
): Promise<ImportantDate[]> {
  try {
    const payload = await getCachedPayload()
    const { docs } = await payload.find({
      collection: 'important-dates',
      locale,
      fallbackLocale: 'fr',
      where: {
        edition: {
          equals: editionId,
        },
      },
      sort: 'order,date',
      limit: 50,
    })
    return docs
  } catch (error) {
    logQueryFailure('Failed to fetch important dates', error)
    return []
  }
}

export async function getSpeakers(editionId: number, locale: 'fr' | 'en'): Promise<Speaker[]> {
  try {
    const payload = await getCachedPayload()
    const { docs } = await payload.find({
      collection: 'speakers',
      locale,
      fallbackLocale: 'fr',
      where: {
        edition: {
          equals: editionId,
        },
      },
      sort: 'name',
      limit: 100,
    })
    return docs
  } catch (error) {
    logQueryFailure('Failed to fetch speakers', error)
    return []
  }
}

export async function getSponsors(editionId: number, locale: 'fr' | 'en'): Promise<Sponsor[]> {
  try {
    const payload = await getCachedPayload()
    const { docs } = await payload.find({
      collection: 'sponsors',
      locale,
      fallbackLocale: 'fr',
      where: {
        edition: {
          equals: editionId,
        },
      },
      limit: 50,
    })
    return docs
  } catch (error) {
    logQueryFailure('Failed to fetch sponsors', error)
    return []
  }
}

export async function getCommittees(editionId: number, locale: 'fr' | 'en'): Promise<Committee[]> {
  try {
    const payload = await getCachedPayload()
    const { docs } = await payload.find({
      collection: 'committees',
      locale,
      fallbackLocale: 'fr',
      where: {
        edition: {
          equals: editionId,
        },
      },
      limit: 100,
    })
    return docs
  } catch (error) {
    logQueryFailure('Failed to fetch committees', error)
    return []
  }
}

export async function getGalleryItems(
  editionId: number,
  locale: 'fr' | 'en',
): Promise<GalleryItem[]> {
  try {
    const payload = await getCachedPayload()
    const { docs } = await payload.find({
      collection: 'gallery-items',
      locale,
      fallbackLocale: 'fr',
      where: {
        edition: {
          equals: editionId,
        },
      },
      sort: 'order',
      limit: 100,
    })
    return docs
  } catch (error) {
    logQueryFailure('Failed to fetch gallery items', error)
    return []
  }
}

/** Headline numbers for the homepage stats band (0s when the DB is unreachable). */
export async function getEditionStats(
  editionId: number,
): Promise<{ speakers: number; sessions: number; attendees: number }> {
  try {
    const payload = await getCachedPayload()
    const where = { edition: { equals: editionId } }
    const [speakers, sessions, attendees] = await Promise.all([
      payload.find({ collection: 'speakers', where, limit: 0 }),
      payload.find({ collection: 'sessions', where, limit: 0 }),
      // Registrations are admin/self-readable; the public stats band only
      // needs the aggregate count, never doc data
      payload.find({ collection: 'registrations', where, limit: 0, overrideAccess: true }),
    ])
    return {
      speakers: speakers.totalDocs,
      sessions: sessions.totalDocs,
      attendees: attendees.totalDocs,
    }
  } catch (error) {
    logQueryFailure('Failed to fetch edition stats', error)
    return { speakers: 0, sessions: 0, attendees: 0 }
  }
}

export async function getPageBySlug(
  slug: string,
  editionId: number,
  locale: 'fr' | 'en',
): Promise<Page | null> {
  try {
    const payload = await getCachedPayload()
    const { docs } = await payload.find({
      collection: 'pages',
      locale,
      fallbackLocale: 'fr',
      where: {
        and: [
          {
            slug: {
              equals: slug,
            },
          },
          {
            edition: {
              equals: editionId,
            },
          },
        ],
      },
      limit: 1,
    })
    return docs[0] || null
  } catch (error) {
    logQueryFailure(`Failed to fetch page ${slug}`, error)
    return null
  }
}

export async function getNavigationPages(editionId: number, locale: 'fr' | 'en'): Promise<Page[]> {
  try {
    const payload = await getCachedPayload()
    const { docs } = await payload.find({
      collection: 'pages',
      locale,
      fallbackLocale: 'fr',
      where: {
        and: [{ edition: { equals: editionId } }, { showInNav: { equals: true } }],
      },
      sort: 'navOrder',
      limit: 50,
    })
    return docs
  } catch (error) {
    logQueryFailure('Failed to fetch navigation pages', error)
    return []
  }
}
