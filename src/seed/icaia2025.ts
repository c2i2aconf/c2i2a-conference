import type { Payload } from 'payload'

import type { Edition } from '../payload-types'

/**
 * Official sources, verified 2026-09-09:
 * - https://icaia25.sciencesconf.org/resource/page/id/2 (important dates and venue)
 * - https://icaia25.sciencesconf.org/resource/page/id/3 (identity, description and speaker)
 * - https://icaia25.sciencesconf.org/resource/sponsors (partners)
 *
 * The official programme still says 21 June 2025, while the newer important-dates
 * page says 18 October 2025. Sessions and their rooms are intentionally omitted
 * until that conflict can be resolved from an authoritative organizer source.
 */

const localizedEdition = {
  fr: {
    title: "Intelligence Artificielle et ses Applications (ICAIA’25)",
    theme: 'L’IA pour un Développement Durable et Inclusif',
    venueAddress: 'Boulevard Abou Oubeida Al Jarah, Marrakech, Maroc',
    description:
      "La deuxième édition de la Conférence Internationale sur l’Intelligence Artificielle et ses Applications est organisée par le Laboratoire des Technologies de l’Innovation Numérique (LABTIN) de HEEC Marrakech, en partenariat avec le Laboratoire des Systèmes et de l’Ingénierie Informatique (L2IS) de la FST et le Laboratoire de Modélisation des Systèmes Complexes (LMSC) de l’ENSA, Université Cadi Ayyad. Elle est consacrée aux avancées de l’intelligence artificielle et à leurs impacts sociétaux.",
  },
  en: {
    title: 'Artificial Intelligence and Its Applications (ICAIA’25)',
    theme: 'AI for Sustainable and Inclusive Development',
    venueAddress: 'Boulevard Abou Oubeida Al Jarah, Marrakech, Morocco',
    description:
      'The second edition of the International Conference on Artificial Intelligence and Its Applications is organized by the Digital Innovation Technologies Laboratory (LABTIN) at HEEC Marrakech, in partnership with the Systems and Computer Engineering Laboratory (L2IS) at FST and the Complex Systems Modeling Laboratory (LMSC) at ENSA, Cadi Ayyad University. It focuses on advances in artificial intelligence and their societal impacts.',
  },
} as const

const importantDates = [
  {
    date: '2025-09-01',
    order: 0,
    fr: 'Date limite de soumission des résumés',
    en: 'Abstract Submission Deadline',
  },
  {
    date: '2025-09-25',
    order: 1,
    fr: 'Notification d’acceptation',
    en: 'Notification of Acceptance',
  },
  {
    date: '2025-10-18',
    order: 2,
    fr: 'Date de l’événement',
    en: 'Event Date',
  },
] as const

const partners = [
  {
    name: 'FST Marrakech',
    description: "Faculté des Sciences et Techniques (FST) de l’UCA Marrakech.",
  },
  {
    name: 'ENSA Marrakech',
    description: "École Nationale des Sciences Appliquées de l’UCA Marrakech.",
  },
] as const

function richText(paragraph: string): NonNullable<Edition['description']> {
  return {
    root: {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          version: 1,
          children: [
            {
              type: 'text',
              version: 1,
              detail: 0,
              format: 0,
              mode: 'normal',
              style: '',
              text: paragraph,
            },
          ],
          direction: 'ltr',
          format: '',
          indent: 0,
          textFormat: 0,
          textStyle: '',
        },
      ],
      direction: 'ltr',
      format: '',
      indent: 0,
      version: 1,
    },
  }
}

export type ICAIA2025SeedResult = {
  editionId: number
  editionCreated: boolean
  importantDatesCreated: number
  importantDatesUpdated: number
  speakersCreated: number
  speakersUpdated: number
  partnersCreated: number
  partnersUpdated: number
}

export async function seedICAIA2025(payload: Payload): Promise<ICAIA2025SeedResult> {
  const existingEdition = await payload.find({
    collection: 'editions',
    locale: 'fr',
    fallbackLocale: false,
    overrideAccess: true,
    where: { year: { equals: 2025 } },
    limit: 1,
  })

  const editionCreated = existingEdition.docs.length === 0
  const frenchEditionData = {
    title: localizedEdition.fr.title,
    theme: localizedEdition.fr.theme,
    startDate: '2025-10-18',
    endDate: '2025-10-18',
    venue: 'HEEC Marrakech',
    venueAddress: localizedEdition.fr.venueAddress,
    description: richText(localizedEdition.fr.description),
    submissionsEnabled: false,
    submissionDeadline: null,
    editionStatus: 'archived' as const,
    _status: 'published' as const,
  }
  const edition = editionCreated
    ? await payload.create({
        collection: 'editions',
        locale: 'fr',
        draft: false,
        overrideAccess: true,
        data: { year: 2025, ...frenchEditionData },
      })
    : await payload.update({
        collection: 'editions',
        id: existingEdition.docs[0].id,
        locale: 'fr',
        draft: false,
        overrideAccess: true,
        data: frenchEditionData,
      })

  await payload.update({
    collection: 'editions',
    id: edition.id,
    locale: 'en',
    draft: false,
    overrideAccess: true,
    data: {
      title: localizedEdition.en.title,
      theme: localizedEdition.en.theme,
      venue: 'HEEC Marrakech',
      venueAddress: localizedEdition.en.venueAddress,
      description: richText(localizedEdition.en.description),
      _status: 'published',
    },
  })

  let importantDatesCreated = 0
  let importantDatesUpdated = 0
  for (const item of importantDates) {
    const existing = await payload.find({
      collection: 'important-dates',
      locale: 'fr',
      fallbackLocale: false,
      overrideAccess: true,
      where: {
        and: [
          { edition: { equals: edition.id } },
          { date: { equals: item.date } },
        ],
      },
      limit: 1,
    })

    const record = existing.docs[0]
      ? await payload.update({
          collection: 'important-dates',
          id: existing.docs[0].id,
          locale: 'fr',
          overrideAccess: true,
          data: { date: item.date, label: item.fr, status: 'closed', order: item.order },
        })
      : await payload.create({
          collection: 'important-dates',
          locale: 'fr',
          overrideAccess: true,
          data: {
            edition: edition.id,
            date: item.date,
            label: item.fr,
            status: 'closed',
            order: item.order,
          },
        })

    if (existing.docs[0]) {
      importantDatesUpdated++
    } else {
      importantDatesCreated++
    }
    await payload.update({
      collection: 'important-dates',
      id: record.id,
      locale: 'en',
      overrideAccess: true,
      data: { label: item.en },
    })
  }

  const speakerName = 'Prof. Mohammed Youssfi'
  const existingSpeaker = await payload.find({
    collection: 'speakers',
    overrideAccess: true,
    where: {
      and: [{ edition: { equals: edition.id } }, { name: { equals: speakerName } }],
    },
    limit: 1,
  })
  const frenchSpeakerData = {
    name: speakerName,
    affiliation: 'ENSET Mohammedia, Université Hassan II de Casablanca',
    bio: "Professeur-chercheur à l’ENSET Mohammedia, Université Hassan II de Casablanca. Ses publications portent notamment sur l’intelligence computationnelle, les systèmes parallèles et distribués, les systèmes multi-agents, le calcul haute performance, le big data et l’intelligence artificielle distribuée.",
    isKeynote: true,
  }
  const speaker = existingSpeaker.docs[0]
    ? await payload.update({
        collection: 'speakers',
        id: existingSpeaker.docs[0].id,
        locale: 'fr',
        overrideAccess: true,
        data: frenchSpeakerData,
      })
    : await payload.create({
        collection: 'speakers',
        locale: 'fr',
        overrideAccess: true,
        data: { edition: edition.id, ...frenchSpeakerData },
      })
  await payload.update({
    collection: 'speakers',
    id: speaker.id,
    locale: 'en',
    overrideAccess: true,
    data: {
      bio: 'Research professor at ENSET Mohammedia, Hassan II University of Casablanca. His research includes computational intelligence, parallel and distributed systems, multi-agent systems, high-performance computing, big data, and distributed artificial intelligence.',
    },
  })

  let partnersCreated = 0
  let partnersUpdated = 0
  for (const item of partners) {
    const existing = await payload.find({
      collection: 'sponsors',
      overrideAccess: true,
      where: {
        and: [{ edition: { equals: edition.id } }, { name: { equals: item.name } }],
      },
      limit: 1,
    })
    if (existing.docs[0]) {
      await payload.update({
        collection: 'sponsors',
        id: existing.docs[0].id,
        locale: 'fr',
        overrideAccess: true,
        data: { name: item.name, description: item.description, tier: 'partner' },
      })
      partnersUpdated++
    } else {
      await payload.create({
        collection: 'sponsors',
        locale: 'fr',
        overrideAccess: true,
        data: {
          edition: edition.id,
          name: item.name,
          description: item.description,
          tier: 'partner',
        },
      })
      partnersCreated++
    }
    // The official English partner page retains its descriptions in French,
    // so the public EN archive deliberately uses Payload's French fallback.
  }

  return {
    editionId: edition.id,
    editionCreated,
    importantDatesCreated,
    importantDatesUpdated,
    speakersCreated: existingSpeaker.docs[0] ? 0 : 1,
    speakersUpdated: existingSpeaker.docs[0] ? 1 : 0,
    partnersCreated,
    partnersUpdated,
  }
}
