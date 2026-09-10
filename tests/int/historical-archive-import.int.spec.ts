import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import { seedC2I2A2024 } from '@/seed/c2i2a2024'
import { seedICAIA2025 } from '@/seed/icaia2025'

let payload: Payload | undefined

function relationshipId(value: number | { id: number } | null | undefined): number | undefined {
  return typeof value === 'number' ? value : value?.id
}

async function editionChildren(editionId: number) {
  if (!payload) throw new Error('Payload was not initialized')
  const where = { edition: { equals: editionId } }
  const [sessions, speakers, rooms, dates, sponsors, committees, gallery] = await Promise.all([
    payload.find({ collection: 'sessions', where, depth: 0, limit: 100, overrideAccess: true }),
    payload.find({ collection: 'speakers', where, limit: 100, overrideAccess: true }),
    payload.find({ collection: 'rooms', where, limit: 100, overrideAccess: true }),
    payload.find({ collection: 'important-dates', where, limit: 100, overrideAccess: true }),
    payload.find({ collection: 'sponsors', where, limit: 100, overrideAccess: true }),
    payload.find({ collection: 'committees', where, limit: 100, overrideAccess: true }),
    payload.find({ collection: 'gallery-items', where, limit: 100, overrideAccess: true }),
  ])
  return { sessions, speakers, rooms, dates, sponsors, committees, gallery }
}

describe('historical archive imports', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  it('corrects 2024 from the official source and is idempotent', async () => {
    if (!payload) throw new Error('Payload was not initialized')

    const first = await seedC2I2A2024(payload)
    const firstChildren = await editionChildren(first.editionId)
    const idsAfterFirst = {
      edition: first.editionId,
      sessions: firstChildren.sessions.docs.map(({ id }) => id).sort((a, b) => a - b),
      speakers: firstChildren.speakers.docs.map(({ id }) => id).sort((a, b) => a - b),
      rooms: firstChildren.rooms.docs.map(({ id }) => id).sort((a, b) => a - b),
      dates: firstChildren.dates.docs.map(({ id }) => id).sort((a, b) => a - b),
      sponsors: firstChildren.sponsors.docs.map(({ id }) => id).sort((a, b) => a - b),
      committees: firstChildren.committees.docs.map(({ id }) => id).sort((a, b) => a - b),
    }

    const second = await seedC2I2A2024(payload)
    const edition = await payload.findByID({
      collection: 'editions',
      id: second.editionId,
      locale: 'fr',
      fallbackLocale: false,
      overrideAccess: false,
    })
    const children = await editionChildren(second.editionId)

    expect(edition).toMatchObject({
      year: 2024,
      title: "Colloque international sur l'intelligence artificielle et ses applications",
      theme: 'Hydrogène vert et l’intelligence artificielle : Défis et opportunités',
      startDate: expect.stringContaining('2024-06-01'),
      endDate: expect.stringContaining('2024-06-01'),
      venue: 'EIGSI Casablanca',
      venueAddress: null,
      venueMapUrl: null,
      submissionsEnabled: false,
      editionStatus: 'archived',
      _status: 'published',
    })
    expect(children.sessions.docs).toHaveLength(12)
    expect(children.speakers.docs).toHaveLength(12)
    expect(children.rooms.docs).toHaveLength(5)
    expect(children.dates.docs).toHaveLength(4)
    expect(children.sponsors.docs.map(({ name }) => name).sort()).toEqual([
      'ENSA de Marrakech UCA',
      "Faculté des sciences Ben M'sik FSBM",
    ])
    expect(children.committees.docs).toHaveLength(2)
    expect(
      children.committees.docs.find(({ type }) => type === 'scientific')?.members,
    ).toHaveLength(35)
    expect(
      children.committees.docs.find(({ type }) => type === 'organization')?.members,
    ).toHaveLength(16)
    expect(children.gallery.docs).toHaveLength(0)

    expect(
      children.sessions.docs.find(
        ({ startTime, room }) =>
          startTime === '11:00' &&
          relationshipId(room) ===
            children.rooms.docs.find(({ name }) => name === 'Amphi Ibn Batouta')?.id,
      )?.title,
    ).toBe('Inelligence artificielle et machine learning')
    expect(children.sessions.docs.find(({ startTime }) => startTime === '14:30')?.title).toBe(
      'IA Genrative',
    )
    expect(
      children.speakers.docs.find(({ name }) => name === 'Pr Mohammed Youssfi')?.affiliation,
    ).toBe('ENSET Mohammedia, Université Hassan II de Casablanca')

    expect({
      edition: second.editionId,
      sessions: children.sessions.docs.map(({ id }) => id).sort((a, b) => a - b),
      speakers: children.speakers.docs.map(({ id }) => id).sort((a, b) => a - b),
      rooms: children.rooms.docs.map(({ id }) => id).sort((a, b) => a - b),
      dates: children.dates.docs.map(({ id }) => id).sort((a, b) => a - b),
      sponsors: children.sponsors.docs.map(({ id }) => id).sort((a, b) => a - b),
      committees: children.committees.docs.map(({ id }) => id).sort((a, b) => a - b),
    }).toEqual(idsAfterFirst)
  }, 180_000)

  it('keeps the conservative 2025 import idempotent and independent', async () => {
    if (!payload) throw new Error('Payload was not initialized')
    const first = await seedICAIA2025(payload)
    const childrenAfterFirst = await editionChildren(first.editionId)
    const idsAfterFirst = {
      edition: first.editionId,
      dates: childrenAfterFirst.dates.docs.map(({ id }) => id).sort((a, b) => a - b),
      speakers: childrenAfterFirst.speakers.docs.map(({ id }) => id).sort((a, b) => a - b),
      sponsors: childrenAfterFirst.sponsors.docs.map(({ id }) => id).sort((a, b) => a - b),
    }
    const second = await seedICAIA2025(payload)
    const edition = await payload.findByID({
      collection: 'editions',
      id: second.editionId,
      locale: 'fr',
      fallbackLocale: false,
      overrideAccess: false,
    })
    const children = await editionChildren(second.editionId)

    expect(edition).toMatchObject({
      year: 2025,
      startDate: expect.stringContaining('2025-10-18'),
      endDate: expect.stringContaining('2025-10-18'),
      venue: 'HEEC Marrakech',
      submissionsEnabled: false,
      submissionDeadline: null,
      editionStatus: 'archived',
      _status: 'published',
    })
    expect(children.dates.docs).toHaveLength(3)
    expect(children.speakers.docs.map(({ name }) => name)).toEqual(['Prof. Mohammed Youssfi'])
    expect(children.sponsors.docs.map(({ name }) => name).sort()).toEqual([
      'ENSA Marrakech',
      'FST Marrakech',
    ])
    expect(children.sessions.docs).toHaveLength(0)
    expect(children.rooms.docs).toHaveLength(0)
    expect(children.committees.docs).toHaveLength(0)
    expect(children.gallery.docs).toHaveLength(0)
    expect({
      edition: second.editionId,
      dates: children.dates.docs.map(({ id }) => id).sort((a, b) => a - b),
      speakers: children.speakers.docs.map(({ id }) => id).sort((a, b) => a - b),
      sponsors: children.sponsors.docs.map(({ id }) => id).sort((a, b) => a - b),
    }).toEqual(idsAfterFirst)
  })

  it('contains no cross-edition relationships', async () => {
    if (!payload) throw new Error('Payload was not initialized')
    const editions = await Promise.all(
      [2024, 2025].map((year) =>
        payload?.find({
          collection: 'editions',
          where: { year: { equals: year } },
          limit: 1,
          overrideAccess: true,
        }),
      ),
    )
    const edition2024 = editions[0]?.docs[0]
    const edition2025 = editions[1]?.docs[0]
    if (!edition2024 || !edition2025) throw new Error('Historical editions are missing')

    for (const edition of [edition2024, edition2025]) {
      const children = await editionChildren(edition.id)
      const roomIds = new Set(children.rooms.docs.map(({ id }) => id))
      const speakerIds = new Set(children.speakers.docs.map(({ id }) => id))
      for (const collection of [
        children.sessions.docs,
        children.speakers.docs,
        children.rooms.docs,
        children.dates.docs,
        children.sponsors.docs,
        children.committees.docs,
        children.gallery.docs,
      ]) {
        expect(collection.every((doc) => relationshipId(doc.edition) === edition.id)).toBe(true)
      }
      for (const session of children.sessions.docs) {
        expect(session.room == null || roomIds.has(relationshipId(session.room) as number)).toBe(
          true,
        )
        expect(
          (session.speakers ?? []).every((speaker) =>
            speakerIds.has(relationshipId(speaker) as number),
          ),
        ).toBe(true)
      }
    }
  })

  it('serves official localization and deliberate French fallback', async () => {
    if (!payload) throw new Error('Payload was not initialized')
    const [editions2024, editions2025] = await Promise.all([
      payload.find({
        collection: 'editions',
        where: { year: { equals: 2024 } },
        limit: 1,
        overrideAccess: true,
      }),
      payload.find({
        collection: 'editions',
        where: { year: { equals: 2025 } },
        limit: 1,
        overrideAccess: true,
      }),
    ])
    const archive2024 = editions2024.docs[0]
    const archive2025 = editions2025.docs[0]
    if (!archive2024 || !archive2025) throw new Error('Historical editions are missing')
    const [en2024, en2024Sessions, en2024Dates, fr2025, en2025, en2025Dates] = await Promise.all([
      payload.findByID({
        collection: 'editions',
        id: archive2024.id,
        locale: 'en',
        fallbackLocale: 'fr',
        overrideAccess: false,
      }),
      payload.find({
        collection: 'sessions',
        locale: 'en',
        fallbackLocale: 'fr',
        where: { edition: { equals: archive2024.id } },
        sort: 'startTime',
        limit: 100,
        overrideAccess: false,
      }),
      payload.find({
        collection: 'important-dates',
        locale: 'en',
        fallbackLocale: 'fr',
        where: { edition: { equals: archive2024.id } },
        sort: 'order',
        overrideAccess: false,
      }),
      payload.findByID({
        collection: 'editions',
        id: archive2025.id,
        locale: 'fr',
        fallbackLocale: false,
        overrideAccess: false,
      }),
      payload.findByID({
        collection: 'editions',
        id: archive2025.id,
        locale: 'en',
        fallbackLocale: 'fr',
        overrideAccess: false,
      }),
      payload.find({
        collection: 'important-dates',
        locale: 'en',
        fallbackLocale: 'fr',
        where: { edition: { equals: archive2025.id } },
        sort: 'order',
        overrideAccess: false,
      }),
    ])

    expect(en2024.title).toBe(
      "Colloque international sur l'intelligence artificielle et ses applications",
    )
    expect(en2024.theme).toBe(
      'Hydrogène vert et l’intelligence artificielle : Défis et opportunités',
    )
    expect(en2024Sessions.docs.some(({ title }) => title === 'Welcome speech')).toBe(true)
    expect(
      en2024Sessions.docs.some(
        ({ title }) => title === 'Inelligence artificielle et machine learning',
      ),
    ).toBe(true)
    expect(en2024Dates.docs.map(({ label }) => label)).toEqual([
      'Call for abstract submission',
      'Deadline for abstract submission',
      'extended deadline for abstract submission',
      'Notification for accepted abstract',
    ])
    expect(fr2025.theme).toBe('L’IA pour un Développement Durable et Inclusif')
    expect(en2025.theme).toBe('AI for Sustainable and Inclusive Development')
    expect(en2025Dates.docs.map(({ label }) => label)).toEqual([
      'Abstract Submission Deadline',
      'Notification of Acceptance',
      'Event Date',
    ])
  })

  afterAll(async () => {
    await payload?.destroy()
  })
})
