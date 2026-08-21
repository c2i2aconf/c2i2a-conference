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

  // ── Editions ────────────────────────────────────────────────────
  const existing2024 = await payload.find({
    collection: 'editions',
    where: { year: { equals: 2024 } },
    limit: 1,
  })

  let edition2024 = existing2024.docs[0]

  if (!edition2024) {
    edition2024 = await payload.create({
      collection: 'editions',
      locale: 'fr',
      draft: false,
      data: {
        year: 2024,
        title: "Colloque international sur l'intelligence artificielle et ses applications",
        theme: 'Intelligence artificielle et ses applications',
        startDate: '2024-06-01',
        endDate: '2024-06-01',
        venue: 'Marrakech, Maroc',
        editionStatus: 'archived',
      },
    })
    await payload.update({
      collection: 'editions',
      id: edition2024.id,
      locale: 'en',
      data: {
        title: 'International Conference on Artificial Intelligence and its Applications',
        theme: 'Artificial intelligence and its applications',
        venue: 'Marrakech, Morocco',
      },
    })
    payload.logger.info('  ✓ Edition 2024 (archived)')
  } else {
    payload.logger.info('  ⏭ Edition 2024 already exists, skipping')
  }

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
      },
    })
    payload.logger.info(`  ✓ Edition ${currentYear} (live)`)
  } else {
    payload.logger.info(`  ⏭ Edition ${currentYear} already exists, skipping`)
  }

  // ── 2024 program (from sciencesconf) ────────────────────────────
  const existingSessions = await payload.find({
    collection: 'sessions',
    where: { 'edition.year': { equals: 2024 } },
    limit: 1,
  })

  if (existingSessions.docs.length === 0 && edition2024) {
    const roomNames = [
      'Amphi Ibn Batouta',
      'Amphi Alfarabi',
      'Amphi Alkhawarizmi',
      'Médiathèque',
      'Terrasse',
    ]
    const rooms: Record<string, number> = {}
    for (const name of roomNames) {
      const room = await payload.create({
        collection: 'rooms',
        data: { edition: edition2024.id, name },
      })
      rooms[name] = room.id
    }

    const speakerNames = [
      'Mr Benelmostafa',
      'Mr El Amrani',
      'Pr Talea',
      'Pr Latif',
      'Mr Adamo Screnci',
      'Pr Ahmed Ouqour',
      'Pr Adnane Latif',
      'Pr Mohamed Nabil BAHIRI',
      'Pr Mohammed Youssfi',
      'Pr Adil Berrazzouk',
      'Prof Abderrahim BENBOUNA',
      'Pr Nihad Aghbalou',
    ]
    const speakers: Record<string, number> = {}
    for (const name of speakerNames) {
      const speaker = await payload.create({
        collection: 'speakers',
        data: { edition: edition2024.id, name },
      })
      speakers[name] = speaker.id
    }

    const D = '2024-06-01'
    type SessionSeed = {
      start: string
      end: string
      type: 'keynote' | 'session' | 'break' | 'logistics' | 'ceremony' | 'tour'
      room?: number
      title?: { fr: string; en: string }
      speakerNames?: string[]
    }
    const sessions: SessionSeed[] = [
      {
        start: '09:00',
        end: '09:30',
        type: 'ceremony',
        room: rooms['Amphi Ibn Batouta'],
        title: { fr: "Discours d'ouverture", en: 'Welcome speech' },
        speakerNames: ['Mr Benelmostafa', 'Mr El Amrani', 'Pr Talea', 'Pr Latif'],
      },
      {
        start: '09:30',
        end: '10:30',
        type: 'keynote',
        room: rooms['Amphi Ibn Batouta'],
        title: {
          fr: 'Session plénière sur l’hydrogène vert',
          en: 'Plenary session on green hydrogen',
        },
        speakerNames: ['Mr Adamo Screnci'],
      },
      {
        start: '10:30',
        end: '11:00',
        type: 'break',
        room: rooms['Médiathèque'],
        title: { fr: 'Pause café', en: 'Coffee break' },
      },
      {
        start: '11:00',
        end: '13:00',
        type: 'session',
        room: rooms['Amphi Ibn Batouta'],
        speakerNames: ['Pr Ahmed Ouqour'],
      },
      {
        start: '11:00',
        end: '13:00',
        type: 'session',
        room: rooms['Amphi Alfarabi'],
        speakerNames: ['Pr Adnane Latif'],
      },
      {
        start: '11:00',
        end: '13:00',
        type: 'session',
        room: rooms['Amphi Alkhawarizmi'],
        speakerNames: ['Pr Mohamed Nabil BAHIRI'],
      },
      {
        start: '13:00',
        end: '14:30',
        type: 'break',
        room: rooms['Terrasse'],
        title: { fr: 'Déjeuner', en: 'Lunch' },
      },
      {
        start: '14:30',
        end: '15:30',
        type: 'keynote',
        room: rooms['Amphi Ibn Batouta'],
        title: {
          fr: 'Generative AI with retrieval augment — architecture et cas d’usage',
          en: 'Generative AI with retrieval augment — architecture and use cases',
        },
        speakerNames: ['Pr Mohammed Youssfi'],
      },
      {
        start: '15:30',
        end: '17:30',
        type: 'session',
        room: rooms['Amphi Alkhawarizmi'],
        speakerNames: ['Pr Adil Berrazzouk'],
      },
      {
        start: '15:30',
        end: '17:30',
        type: 'session',
        room: rooms['Amphi Ibn Batouta'],
        speakerNames: ['Prof Abderrahim BENBOUNA'],
      },
      {
        start: '15:30',
        end: '17:30',
        type: 'session',
        room: rooms['Amphi Alfarabi'],
        speakerNames: ['Pr Nihad Aghbalou'],
      },
      {
        start: '17:30',
        end: '18:00',
        type: 'ceremony',
        title: {
          fr: 'Cérémonie de clôture et remise des prix',
          en: 'Closing ceremony and awards ceremony',
        },
      },
    ]

    for (const s of sessions) {
      const created = await payload.create({
        collection: 'sessions',
        locale: 'fr',
        data: {
          edition: edition2024.id,
          date: D,
          startTime: s.start,
          endTime: s.end,
          type: s.type,
          room: s.room,
          speakers: s.speakerNames?.map((n) => speakers[n]),
          title: s.title?.fr,
        },
      })
      if (s.title?.en) {
        await payload.update({
          collection: 'sessions',
          id: created.id,
          locale: 'en',
          data: { title: s.title.en },
        })
      }
    }
    payload.logger.info(
      `  ✓ 2024 program: ${sessions.length} sessions, ${speakerNames.length} speakers`,
    )

    // ── 2024 important dates ────────────────────────────────────────
    const dates = [
      {
        date: '2024-04-01',
        status: 'open' as const,
        fr: 'Appel à soumission des résumés',
        en: 'Call for abstracts',
        noteFr: '(Ouvert)',
        noteEn: '(Open)',
      },
      {
        date: '2024-05-10',
        status: 'closed' as const,
        fr: 'Date limite de soumission des résumés',
        en: 'Abstract submission deadline',
      },
      {
        date: '2024-05-27',
        status: 'extended' as const,
        fr: 'Prolongement date de soumission des résumés',
        en: 'Submission deadline extension',
      },
      {
        date: '2024-05-25',
        endDate: '2024-05-30',
        status: 'closed' as const,
        fr: "Notification d'acceptation (communication orale)",
        en: 'Acceptance notification (oral communication)',
      },
    ]
    for (const [i, d] of dates.entries()) {
      const created = await payload.create({
        collection: 'important-dates',
        locale: 'fr',
        data: {
          edition: edition2024.id,
          date: d.date,
          endDate: 'endDate' in d ? d.endDate : undefined,
          label: d.fr,
          note: 'noteFr' in d ? d.noteFr : undefined,
          status: d.status,
          order: i,
        },
      })
      await payload.update({
        collection: 'important-dates',
        id: created.id,
        locale: 'en',
        data: { label: d.en, note: 'noteEn' in d ? d.noteEn : undefined },
      })
    }
    payload.logger.info(`  ✓ 2024 important dates: ${dates.length}`)
  } else {
    payload.logger.info('  ⏭ 2024 program already seeded, skipping')
  }

  payload.logger.info('✅ Seed complete')
  process.exit(0)
}

await seed()
