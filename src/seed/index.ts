/**
 * Seed script — populates the database with:
 *  - the real C2I2A 2024 program (migrated from sciencesconf.org) as an archived edition
 *  - a fresh "live" edition for the upcoming year, ready to be edited in /admin
 *
 * Usage:  npm run seed        (requires DATABASE_URL to point to your Neon DB)
 * Idempotent: skips editions that already exist.
 */
import 'dotenv/config'

import { getPayload } from 'payload'

import config from '../payload.config'
import { seedC2I2A2024 } from './c2i2a2024'
import { seedICAIA2025 } from './icaia2025'

const HEEC_MAP_URL = 'https://maps.google.com/maps?q=HEEC+Marrakech&z=15&output=embed'
const HEEC_ADDRESS_FR =
  'Avenue Allal El Fassi, Rue Abou Oubaida Al Jarah, Daoudiate\nMarrakech, Maroc'
const HEEC_ADDRESS_EN =
  'Avenue Allal El Fassi, Rue Abou Oubaida Al Jarah, Daoudiate\nMarrakech, Morocco'

const seed = async () => {
  const payload = await getPayload({ config })

  payload.logger.info('🌱 Seeding C2I2A…')

  const settingsFr = await payload.findGlobal({ slug: 'site-settings', locale: 'fr' })
  await payload.updateGlobal({
    slug: 'site-settings',
    locale: 'fr',
    data: {
      siteName: settingsFr.siteName || 'C2I2A',
      siteTagline:
        settingsFr.siteTagline ||
        "Colloque International sur l'Intelligence Artificielle et ses Applications",
      organizationName: settingsFr.organizationName || 'HEEC Marrakech',
      organizationAddress: settingsFr.organizationAddress || 'Marrakech, Maroc',
      copyrightText: settingsFr.copyrightText || 'C2I2A — HEEC Marrakech',
    },
  })
  const settingsEn = await payload.findGlobal({ slug: 'site-settings', locale: 'en' })
  await payload.updateGlobal({
    slug: 'site-settings',
    locale: 'en',
    data: {
      siteName: settingsEn.siteName || 'C2I2A',
      siteTagline:
        settingsEn.siteTagline ||
        'International Conference on Artificial Intelligence and its Applications',
      organizationName: settingsEn.organizationName || 'HEEC Marrakech',
      organizationAddress: settingsEn.organizationAddress || 'Marrakech, Morocco',
      copyrightText: settingsEn.copyrightText || 'C2I2A — HEEC Marrakech',
    },
  })
  payload.logger.info('  ✓ Site settings')

  // ── C2I2A 2024 archive (official SciencesConf source) ──────────
  const seeded2024 = await seedC2I2A2024(payload)
  payload.logger.info(
    `  ✓ C2I2A 2024 archive (${seeded2024.editionCreated ? 'created' : 'updated'}; ` +
      `${seeded2024.sessionsCreated + seeded2024.sessionsUpdated} sessions, ` +
      `${seeded2024.speakersCreated + seeded2024.speakersUpdated} speakers, ` +
      `${seeded2024.roomsCreated + seeded2024.roomsUpdated} rooms, ` +
      `${seeded2024.committeesCreated + seeded2024.committeesUpdated} committees, ` +
      `${seeded2024.partnersCreated + seeded2024.partnersUpdated} partners)`,
  )

  // ── ICAIA 2025 archive (official SciencesConf source) ───────────
  const seeded2025 = await seedICAIA2025(payload)
  payload.logger.info(
    `  ✓ ICAIA 2025 archive (${seeded2025.editionCreated ? 'created' : 'updated'}; ` +
      `${seeded2025.importantDatesCreated + seeded2025.importantDatesUpdated} dates, ` +
      `${seeded2025.speakersCreated + seeded2025.speakersUpdated} speaker, ` +
      `${seeded2025.partnersCreated + seeded2025.partnersUpdated} partners)`,
  )

  const now = new Date()
  const currentYear = now.getMonth() >= 5 ? now.getFullYear() + 1 : now.getFullYear()
  const existingCurrent = await payload.find({
    collection: 'editions',
    where: { year: { equals: currentYear } },
    limit: 1,
  })

  if (!existingCurrent.docs[0]) {
    const current = await payload.create({
      collection: 'editions',
      locale: 'fr',
      draft: false,
      data: {
        year: currentYear,
        title: `C2I2A ${currentYear}`,
        theme: 'Intelligence artificielle et ses applications',
        startDate: `${currentYear}-06-01`,
        endDate: `${currentYear}-06-01`,
        venue: 'HEEC, Marrakech',
        venueAddress: HEEC_ADDRESS_FR,
        venueMapUrl: HEEC_MAP_URL,
        submissionsEnabled: true,
        submissionDeadline: `${currentYear}-04-30T22:59:59.000Z`,
        editionStatus: 'live',
      },
    })
    await payload.update({
      collection: 'editions',
      id: current.id,
      locale: 'en',
      data: {
        title: `C2I2A ${currentYear}`,
        theme: 'Artificial intelligence and its applications',
        venue: 'HEEC, Marrakech',
        venueAddress: HEEC_ADDRESS_EN,
      },
    })
    payload.logger.info(`  ✓ Edition ${currentYear} (live)`)
  } else {
    const existing = existingCurrent.docs[0]
    if (!existing.venueMapUrl || !existing.venueAddress) {
      await payload.update({
        collection: 'editions',
        id: existing.id,
        locale: 'fr',
        data: {
          ...(existing.venueMapUrl ? {} : { venueMapUrl: HEEC_MAP_URL }),
          ...(existing.venueAddress ? {} : { venueAddress: HEEC_ADDRESS_FR }),
        },
      })
      payload.logger.info(`  ✓ Edition ${currentYear}: backfilled venue map/address`)
    } else {
      payload.logger.info(`  ⏭ Edition ${currentYear} already exists, skipping`)
    }
    // localized fields fall back to fr when the en translation is missing
    const existingEn = await payload.find({
      collection: 'editions',
      where: { year: { equals: currentYear } },
      locale: 'en',
      fallbackLocale: false,
      limit: 1,
    })
    if (existingEn.docs[0] && !existingEn.docs[0].venueAddress) {
      await payload.update({
        collection: 'editions',
        id: existing.id,
        locale: 'en',
        data: { venueAddress: HEEC_ADDRESS_EN },
      })
      payload.logger.info(`  ✓ Edition ${currentYear}: backfilled EN venue address`)
    }
  }

  payload.logger.info('✅ Seed complete')
  process.exit(0)
}

await seed()
