import type { Payload } from 'payload'

import type { Committee, Edition } from '../payload-types'

/**
 * Official sources, verified 2026-09-09:
 * - https://c2i2a.sciencesconf.org/page/page_personnalisable_4 (identity, venue, speakers)
 * - https://c2i2a.sciencesconf.org/program (programme, rooms and speaker relationships)
 * - https://c2i2a.sciencesconf.org/page/page_personnalisable_3 (important dates)
 * - https://c2i2a.sciencesconf.org/resource/acces (venue confirmation)
 * - https://c2i2a.sciencesconf.org/resource/sponsors (partners)
 * - https://c2i2a.sciencesconf.org/page/page_personnalisable_2 (scientific committee)
 * - https://c2i2a.sciencesconf.org/page/page_personnalisable (organization committee)
 *
 * The French and English important-date pages disagree about the extension and
 * acceptance dates. The import uses the French page, which is the site's default
 * locale, for the non-localized date fields and retains the official English labels.
 */

const editionFr = {
  title: "Colloque international sur l'intelligence artificielle et ses applications",
  theme: 'Hydrogène vert et l’intelligence artificielle : Défis et opportunités',
  venue: 'EIGSI Casablanca',
  description:
    'Première édition du Colloque International sur l’Intelligence Artificielle et ses applications (C2I2A), organisée par l’EIGSI Casablanca, le CRSI de HEEC Marrakech, l’équipe TIM de l’ENSA Marrakech et le Laboratoire de traitement de l’information de la Faculté des sciences Ben M’Sik. Cette journée réunit chercheurs, doctorants et experts autour de l’intelligence artificielle et des énergies renouvelables.',
} as const

const rooms = [
  'Amphi Ibn Batouta',
  'Amphi Alfarabi',
  'Amphi Alkhawarizmi',
  'Médiathèque',
  'Terrasse',
] as const

const speakers = [
  { name: 'Mr Benelmostafa' },
  { name: 'Mr El Amrani' },
  { name: 'Pr Talea', affiliation: 'FSBM Casablanca' },
  { name: 'Pr Latif', affiliation: 'ENSA Marrakech' },
  {
    name: 'Mr Adamo Screnci',
    affiliation: 'Hydrogen Refueling Solutions',
    isKeynote: true,
    bio: 'Diplômé de l’Institut National Polytechnique de Grenoble et de l’INSEAD, Adamo Screnci a exercé des responsabilités dans la chaîne de valeur de l’hydrogène, notamment chez Air Liquide, McPhy, thyssenkrupp et TotalEnergies, avant d’être nommé Directeur Général Délégué d’Hydrogen Refueling Solutions.',
  },
  { name: 'Pr Ahmed Ouqour', affiliation: 'HEEC Marrakech' },
  { name: 'Pr Adnane Latif', affiliation: 'ENSA Marrakech' },
  { name: 'Pr Mohamed Nabil BAHIRI', affiliation: 'HEEC Marrakech' },
  {
    name: 'Pr Mohammed Youssfi',
    affiliation: 'ENSET Mohammedia, Université Hassan II de Casablanca',
    isKeynote: true,
    bio: 'Professeur chercheur à l’ENSET Mohammedia, Université Hassan II de Casablanca. Ses travaux portent notamment sur l’intelligence computationnelle, les systèmes parallèles et distribués, les systèmes multi-agents, le calcul haute performance, le big data et l’intelligence artificielle distribuée.',
  },
  { name: 'Pr Adil Berrazzouk' },
  { name: 'Prof Abderrahim BENBOUNA', affiliation: 'HEEC Marrakech' },
  { name: 'Pr Nihad Aghbalou', affiliation: 'EIGSI Casablanca' },
] as const

type SessionSeed = {
  start: string
  end: string
  type: 'keynote' | 'session' | 'break' | 'ceremony'
  room?: (typeof rooms)[number]
  fr: string
  en?: string
  descriptionFr?: string
  descriptionEn?: string
  speakers?: string[]
}

const sessions: SessionSeed[] = [
  {
    start: '09:00',
    end: '09:30',
    type: 'ceremony',
    room: 'Amphi Ibn Batouta',
    fr: 'Mot de bienvenue',
    en: 'Welcome speech',
    speakers: ['Mr Benelmostafa', 'Mr El Amrani', 'Pr Talea', 'Pr Latif'],
  },
  {
    start: '09:30',
    end: '10:30',
    type: 'keynote',
    room: 'Amphi Ibn Batouta',
    fr: "Séance plenière sur l'Hydrogène vert",
    en: 'plenary session on green hydrogen',
    descriptionFr: 'L’hydrogène vert, enjeux et applications',
    speakers: ['Mr Adamo Screnci'],
  },
  {
    start: '10:30',
    end: '11:00',
    type: 'break',
    room: 'Médiathèque',
    fr: 'Pause café',
    en: 'Coffee break',
  },
  {
    start: '11:00',
    end: '13:00',
    type: 'session',
    room: 'Amphi Ibn Batouta',
    fr: 'Inelligence artificielle et machine learning',
    speakers: ['Pr Ahmed Ouqour'],
  },
  {
    start: '11:00',
    end: '13:00',
    type: 'session',
    room: 'Amphi Alfarabi',
    fr: 'Industrie et automatisation',
    speakers: ['Pr Adnane Latif'],
  },
  {
    start: '11:00',
    end: '13:00',
    type: 'session',
    room: 'Amphi Alkhawarizmi',
    fr: 'Energies renouvelables et environnement',
    speakers: ['Pr Mohamed Nabil BAHIRI'],
  },
  {
    start: '13:00',
    end: '14:30',
    type: 'break',
    room: 'Terrasse',
    fr: 'Déjeuner',
    en: 'Lunch',
  },
  {
    start: '14:30',
    end: '15:30',
    type: 'keynote',
    room: 'Amphi Ibn Batouta',
    fr: 'IA Genrative',
    en: 'Generative AI with retrieval augment -architecture et Use case',
    descriptionFr: 'Generative AI with retrieval augment -architecture et Use case',
    descriptionEn: 'Generative AI with retrieval augment -architecture et Use case',
    speakers: ['Pr Mohammed Youssfi'],
  },
  {
    start: '15:30',
    end: '17:30',
    type: 'session',
    room: 'Amphi Alkhawarizmi',
    fr: "Applications de l'IA en finance et logistique",
    speakers: ['Pr Adil Berrazzouk'],
  },
  {
    start: '15:30',
    end: '17:30',
    type: 'session',
    room: 'Amphi Ibn Batouta',
    fr: "Applications de l'IA en matérieaux et prédiction",
    speakers: ['Prof Abderrahim BENBOUNA'],
  },
  {
    start: '15:30',
    end: '17:30',
    type: 'session',
    room: 'Amphi Alfarabi',
    fr: "Divers applications de l'IA",
    speakers: ['Pr Nihad Aghbalou'],
  },
  {
    start: '17:30',
    end: '18:00',
    type: 'ceremony',
    fr: 'Cocktail de clôture',
    en: 'Closing ceremony',
    descriptionFr: 'Cérémonie de clôture & remise des trophées',
    descriptionEn: 'Closing ceremony and awards ceremony',
  },
]

const importantDates = [
  {
    date: '2024-04-01',
    status: 'open' as const,
    order: 0,
    fr: 'Appel à soumission des résumés',
    en: 'Call for abstract submission',
    noteFr: '(Ouvert)',
    noteEn: '(Open)',
  },
  {
    date: '2024-05-10',
    status: 'closed' as const,
    order: 1,
    fr: 'Date limite de soumission des résumés',
    en: 'Deadline for abstract submission',
  },
  {
    date: '2024-05-27',
    status: 'extended' as const,
    order: 2,
    fr: 'Prolongement date de soumission des résumés',
    en: 'extended deadline for abstract submission',
  },
  {
    date: '2024-05-25',
    endDate: '2024-05-30',
    status: 'closed' as const,
    order: 3,
    fr: "Notification d'acceptation en vue de participation par communication orale",
    en: 'Notification for accepted abstract',
  },
] as const

const scientificCommittee = [
  ['Mr Adnane LATIF', 'ENSA Marrakech'],
  ['Mr Mohamed EL ADNANI', 'FSSM Marrakech'],
  ['Mr Soufiane BARIBI', 'CRMEF Marrakech'],
  ['Mr Abderrahim BEN BOUNA', 'HEEC Marrakech'],
  ['Mr Mohamed Nabil BAHIRI', 'HEEC Marrakech'],
  ['Mr Ahmed OUQOUR', 'HEEC Marrakech'],
  ['Mr Issam QAFFOU', 'FSSM Marrakech'],
  ['Mme Hanae SBAI', 'FSTM Mohammedia'],
  ['Mr Lahoussine ELMAHNI', 'UNIVERSITE IBN ZOHR Agadir'],
  ['Mr Omar ACHBAROU', 'ENSA de Marrakech'],
  ['Mr Aissam BEKKARI', 'ENSA de Marrakech'],
  ['Mr Abdelghafour ATLAS', 'ENSA de Marrakech'],
  ['Mr Tarik BOURAGBA', 'EIGSI Casablanca'],
  ['Mr Joël Jacquet', 'EIGSI La Rochelle'],
  ['Mr Mohamed TALEA', 'FSBM Casablanca'],
  ['Mme Assia BAKALI', 'ERN Casablanca'],
  ['Mme Aziza BENABOUD', 'ERN Casablanca'],
  ['Mr Sohaib BAROUD', 'EIGSI Casablanca'],
  ['Mme Houda ELHADAF', 'EIGSI Casablanca'],
  ['Mme Nihad AGHBALOU', 'EIGSI Casablanca'],
  ['Mme Hanae ERROUSSO', 'EIGSI Casablanca'],
  ['Mr Driss SERROU', 'EST Kenitra'],
  ['Mr Abdelkarim ELFAJRI', 'Faculté des sciences ELJADIDA'],
  ['Mr Abdelilah JRAIFI', 'ENSA SAFI'],
  ['Mr Ayoub AZZAYANI', 'FSJES Salé'],
  ['Mr Ismail LAGRAT', 'ENSA Kenitra'],
  ['Mr oussama BOUAZAOUI', 'ENSA Kenitra'],
  ['Mr Adnane ESSEHMOUDI', 'MANOP Fès'],
  ['Mr Khalid EL FAHSSI', 'Faculté des sciences Fès'],
  ['Mr Anouar HASBAOUI', 'ESCA Management'],
  ['Mr Oussama RIDA', 'ENSA Berrechid'],
  ['Mr Soufiane ELOUARDI', 'ENSET Mohammedia'],
  ['Mr Tariq RACHID', "Faculté d'économie et gestion Settat"],
  ['Mr My Hicham HANIN', 'Faculté des sciences kenitra'],
  ['Mr Rabii ELGOMRI', 'ISTL Casablanca'],
] as const

const organizationCommittee = [
  ['BOURAGBA Tarik', 'EIGSI CASA'],
  ['BENBOUNA Abderrahim', 'HEEC MARRAKECH'],
  ['ELAMRANI Kenza', 'HEEC MARRAKECH'],
  ['BELKADI Nada', 'EIGSI-CASA'],
  ['BAROUD Sohaib', 'EIGSI-CASA'],
  ['ERROUSSO Hanae', 'EIGSI-CASA'],
  ['ELHADAF Houda', 'EIGSI-CASA'],
  ['AGHBALOU Nihad', 'EIGSI-CASA'],
  ['HAJJI Souad', 'EIGSI-CASA'],
  ['AOULI Zineb', 'EIGSI-CASA'],
  ['AZZAYANI Ayoub', 'FSJES SALE'],
  ['JRAIFI Abdelilah', 'ENSA Safi'],
  ['SERROU Driss', 'EST Kenitra'],
  ['ELOUARDI Soufiane', 'ENSET Mohammedia'],
] as const

const juniorOrganizationCommittee = [
  ['RAKINE Imane', 'EIGSI CASA-LTI FSBM'],
  ['BENBOUKOUS Mostafa', 'LTI FSBM'],
] as const

const partners = ['ENSA de Marrakech UCA', "Faculté des sciences Ben M'sik FSBM"] as const

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

function relationshipId(value: number | { id: number } | null | undefined): number | undefined {
  return typeof value === 'number' ? value : value?.id
}

export type C2I2A2024SeedResult = {
  editionId: number
  editionCreated: boolean
  roomsCreated: number
  roomsUpdated: number
  speakersCreated: number
  speakersUpdated: number
  sessionsCreated: number
  sessionsUpdated: number
  importantDatesCreated: number
  importantDatesUpdated: number
  committeesCreated: number
  committeesUpdated: number
  partnersCreated: number
  partnersUpdated: number
}

export async function seedC2I2A2024(payload: Payload): Promise<C2I2A2024SeedResult> {
  const counts = {
    roomsCreated: 0,
    roomsUpdated: 0,
    speakersCreated: 0,
    speakersUpdated: 0,
    sessionsCreated: 0,
    sessionsUpdated: 0,
    importantDatesCreated: 0,
    importantDatesUpdated: 0,
    committeesCreated: 0,
    committeesUpdated: 0,
    partnersCreated: 0,
    partnersUpdated: 0,
  }
  const existingEdition = await payload.find({
    collection: 'editions',
    locale: 'fr',
    fallbackLocale: false,
    overrideAccess: true,
    where: { year: { equals: 2024 } },
    limit: 1,
  })
  const editionCreated = existingEdition.docs.length === 0
  const frenchEditionData = {
    title: editionFr.title,
    theme: editionFr.theme,
    startDate: '2024-06-01',
    endDate: '2024-06-01',
    venue: editionFr.venue,
    venueAddress: null,
    venueMapUrl: null,
    description: richText(editionFr.description),
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
        data: { year: 2024, ...frenchEditionData },
      })
    : await payload.update({
        collection: 'editions',
        id: existingEdition.docs[0].id,
        locale: 'fr',
        draft: false,
        overrideAccess: true,
        data: frenchEditionData,
      })

  // The official English description is empty. Keep the official French identity
  // verbatim and clear optional localized copy so other content falls back to FR.
  await payload.update({
    collection: 'editions',
    id: edition.id,
    locale: 'en',
    draft: false,
    overrideAccess: true,
    data: {
      title: editionFr.title,
      theme: null,
      venue: editionFr.venue,
      venueAddress: null,
      description: null,
      _status: 'published',
    },
  })

  const roomIds = new Map<string, number>()
  await Promise.all(
    rooms.map(async (name) => {
      const existing = await payload.find({
        collection: 'rooms',
        overrideAccess: true,
        where: { and: [{ edition: { equals: edition.id } }, { name: { equals: name } }] },
        limit: 1,
      })
      const room = existing.docs[0]
        ? await payload.update({
            collection: 'rooms',
            id: existing.docs[0].id,
            overrideAccess: true,
            data: { edition: edition.id, name },
          })
        : await payload.create({
            collection: 'rooms',
            overrideAccess: true,
            data: { edition: edition.id, name },
      })
      roomIds.set(name, room.id)
      if (existing.docs[0]) counts.roomsUpdated++
      else counts.roomsCreated++
    }),
  )

  const speakerIds = new Map<string, number>()
  await Promise.all(
    speakers.map(async (item) => {
      const existing = await payload.find({
        collection: 'speakers',
        overrideAccess: true,
        where: { and: [{ edition: { equals: edition.id } }, { name: { equals: item.name } }] },
        limit: 1,
      })
      const data = {
        edition: edition.id,
        name: item.name,
        affiliation: 'affiliation' in item ? item.affiliation : null,
        bio: 'bio' in item ? item.bio : null,
        isKeynote: 'isKeynote' in item ? item.isKeynote : false,
      }
      const speaker = existing.docs[0]
        ? await payload.update({
            collection: 'speakers',
            id: existing.docs[0].id,
            locale: 'fr',
            overrideAccess: true,
            data,
          })
        : await payload.create({
            collection: 'speakers',
            locale: 'fr',
            overrideAccess: true,
            data,
          })
      if ('bio' in item) {
        await payload.update({
          collection: 'speakers',
          id: speaker.id,
          locale: 'en',
          overrideAccess: true,
          data: { bio: null },
        })
      }
      speakerIds.set(item.name, speaker.id)
      if (existing.docs[0]) counts.speakersUpdated++
      else counts.speakersCreated++
    }),
  )

  const existingSessions = await payload.find({
    collection: 'sessions',
    overrideAccess: true,
    depth: 0,
    where: { edition: { equals: edition.id } },
    limit: 100,
  })
  await Promise.all(
    sessions.map(async (item) => {
      const roomId = item.room ? roomIds.get(item.room) : undefined
      const existing = existingSessions.docs.find(
        (candidate) =>
          candidate.date.startsWith('2024-06-01') &&
          candidate.startTime === item.start &&
          relationshipId(candidate.room) === roomId,
      )
      const data = {
        edition: edition.id,
        title: item.fr,
        date: '2024-06-01',
        startTime: item.start,
        endTime: item.end,
        type: item.type,
        room: roomId ?? null,
        speakers: item.speakers?.map((name) => speakerIds.get(name) as number) ?? [],
        description: item.descriptionFr ?? null,
      }
      const session = existing
        ? await payload.update({
            collection: 'sessions',
            id: existing.id,
            locale: 'fr',
            overrideAccess: true,
            data,
          })
        : await payload.create({
            collection: 'sessions',
            locale: 'fr',
            overrideAccess: true,
            data,
          })
      await payload.update({
        collection: 'sessions',
        id: session.id,
        locale: 'en',
        overrideAccess: true,
        data: { title: item.en ?? null, description: item.descriptionEn ?? null },
      })
      if (existing) counts.sessionsUpdated++
      else counts.sessionsCreated++
    }),
  )

  await Promise.all(
    importantDates.map(async (item) => {
      const existing = await payload.find({
        collection: 'important-dates',
        locale: 'fr',
        fallbackLocale: false,
        overrideAccess: true,
        where: { and: [{ edition: { equals: edition.id } }, { date: { equals: item.date } }] },
        limit: 1,
      })
      const data = {
        edition: edition.id,
        date: item.date,
        endDate: 'endDate' in item ? item.endDate : null,
        label: item.fr,
        note: 'noteFr' in item ? item.noteFr : null,
        status: item.status,
        order: item.order,
      }
      const record = existing.docs[0]
        ? await payload.update({
            collection: 'important-dates',
            id: existing.docs[0].id,
            locale: 'fr',
            overrideAccess: true,
            data,
          })
        : await payload.create({
            collection: 'important-dates',
            locale: 'fr',
            overrideAccess: true,
            data,
          })
      await payload.update({
        collection: 'important-dates',
        id: record.id,
        locale: 'en',
        overrideAccess: true,
        data: { label: item.en, note: 'noteEn' in item ? item.noteEn : null },
      })
      if (existing.docs[0]) counts.importantDatesUpdated++
      else counts.importantDatesCreated++
    }),
  )

  const committees: Array<{ type: Committee['type']; members: Committee['members'] }> = [
    {
      type: 'scientific',
      members: scientificCommittee.map(([name, affiliation]) => ({ name, affiliation })),
    },
    {
      type: 'organization',
      members: [
        ...organizationCommittee.map(([name, affiliation]) => ({ name, affiliation })),
        ...juniorOrganizationCommittee.map(([name, affiliation]) => ({
          name,
          affiliation,
          role: "Comité d'organisation juniors",
        })),
      ],
    },
  ]
  await Promise.all(
    committees.map(async (item) => {
      const existing = await payload.find({
        collection: 'committees',
        overrideAccess: true,
        where: { and: [{ edition: { equals: edition.id } }, { type: { equals: item.type } }] },
        limit: 1,
      })
      const committee = existing.docs[0]
        ? await payload.update({
            collection: 'committees',
            id: existing.docs[0].id,
            locale: 'fr',
            overrideAccess: true,
            data: { edition: edition.id, type: item.type, members: item.members },
          })
        : await payload.create({
            collection: 'committees',
            locale: 'fr',
            overrideAccess: true,
            data: { edition: edition.id, type: item.type, members: item.members },
          })
      if (item.type === 'organization' && committee.members) {
        await payload.update({
          collection: 'committees',
          id: committee.id,
          locale: 'en',
          overrideAccess: true,
          data: {
            members: committee.members.map((member) => ({
              id: member.id,
              name: member.name,
              affiliation: member.affiliation,
              role: member.role ? 'Junior organization committee' : null,
            })),
          },
        })
      }
      if (existing.docs[0]) counts.committeesUpdated++
      else counts.committeesCreated++
    }),
  )

  await Promise.all(
    partners.map(async (name) => {
      const existing = await payload.find({
        collection: 'sponsors',
        overrideAccess: true,
        where: { and: [{ edition: { equals: edition.id } }, { name: { equals: name } }] },
        limit: 1,
      })
      if (existing.docs[0]) {
        await payload.update({
          collection: 'sponsors',
          id: existing.docs[0].id,
          overrideAccess: true,
          data: { edition: edition.id, name, tier: 'partner' },
        })
        counts.partnersUpdated++
      } else {
        await payload.create({
          collection: 'sponsors',
          overrideAccess: true,
          data: { edition: edition.id, name, tier: 'partner' },
        })
        counts.partnersCreated++
      }
    }),
  )

  return { editionId: edition.id, editionCreated, ...counts }
}
