/**
 * Seed script — populates the database with:
 *  - the real C2I2A 2024 program (migrated from sciencesconf.org) as an archived edition
 *  - the current ICAIA 2027 edition from its supplied argumentaire
 *
 * Usage:  npm run seed        (requires DATABASE_URL to point to your Neon DB)
 * Idempotent: skips editions that already exist.
 */
import 'dotenv/config'

import { getPayload } from 'payload'

import config from '../payload.config'
import { seedC2I2A2024 } from './c2i2a2024'
import { seedICAIA2025 } from './icaia2025'
import { seedICAIA2027 } from './icaia2027'

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

  const seeded2027 = await seedICAIA2027(payload)
  payload.logger.info(
    `  ✓ ICAIA 2027 (${seeded2027.editionCreated ? 'created' : 'updated'}; ` +
      `${seeded2027.importantDatesCreated + seeded2027.importantDatesUpdated} dates, ` +
      `${seeded2027.thematicAxesCreated + seeded2027.thematicAxesUpdated} thematic axes, ` +
      `${seeded2027.detailsCreated ? 'created' : 'updated'} conference details)`,
  )

  payload.logger.info('✅ Seed complete')
  process.exit(0)
}

await seed()
