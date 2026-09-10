import type { Payload } from 'payload'

import type { Edition } from '../payload-types'

/**
 * Primary source: ICAIA'27 argumentaire/calendar supplied to the project.
 *
 * The argumentaire calendar gives 15 May 2027 while its cover/poster gives
 * 22 May 2027. Neither candidate is imported as the definitive conference
 * date or as an ImportantDate. The owner selected 15 May as the provisional
 * working date; both source candidates and the conflict note remain attached
 * to the edition until an authoritative organizer confirmation is available.
 *
 * The supplied source is French. Localized public fields intentionally rely
 * on Payload's French fallback for English requests rather than presenting an
 * unofficial translation as source-authored conference copy.
 */

const importantDates = [
  { date: '2026-09-01', label: 'Lancement de l’appel à communications', status: 'closed', order: 0 },
  {
    date: '2026-12-15',
    label: 'Date limite de soumission du résumé étendu',
    status: 'upcoming',
    order: 1,
  },
  {
    date: '2027-01-15',
    label: 'Notification d’acceptation du résumé',
    status: 'upcoming',
    order: 2,
  },
  {
    date: '2027-03-15',
    label: 'Date limite de soumission de l’article complet',
    status: 'upcoming',
    order: 3,
  },
  {
    date: '2027-04-05',
    label: 'Retour des évaluations finales',
    status: 'upcoming',
    order: 4,
  },
  {
    date: '2027-04-20',
    label: 'Date limite des versions finales corrigées',
    status: 'upcoming',
    order: 5,
  },
  {
    date: '2027-04-30',
    label: 'Clôture des inscriptions',
    status: 'upcoming',
    order: 6,
  },
  {
    date: '2027-05-05',
    label: 'Publication du programme',
    status: 'upcoming',
    order: 7,
  },
  {
    date: '2027-06-30',
    label: 'Soumission des versions étendues aux revues partenaires',
    status: 'upcoming',
    order: 8,
  },
] as const

const thematicAxes = [
  'IA responsable et transformation numérique',
  'Confiance, éthique et sécurité des systèmes intelligents',
  'Convergence des technologies émergentes : IA, IoT, Blockchain, 5G/6G et Cloud',
  'IA et développement durable',
  'Société numérique et inclusion',
  'Gouvernance, régulation et modèles économiques de l’IA',
  'Innovation, recherche et applications intelligentes',
  'IA générative, modèles de fondation et agents autonomes',
  'IA explicable, auditabilité et gouvernance adaptative des systèmes d’information',
  'IA, éducation et EdTech',
  'IA en santé et bien-être numérique',
  'IA, finance, assurance et nouveaux modèles économiques',
  'Villes intelligentes, mobilité et territoires connectés',
  'Industrie 4.0/5.0, logistique et chaînes d’approvisionnement intelligentes',
  'IA, langues et patrimoine, notamment les langues à faibles ressources',
] as const

const contributionTypes = [
  { code: 'research-paper', label: 'Articles de recherche' },
  { code: 'case-study', label: 'Études de cas et retours d’expérience' },
  { code: 'systematic-review', label: 'Revues systématiques' },
  { code: 'doctoral-communication', label: 'Communications doctorales' },
  { code: 'poster', label: 'Posters' },
] as const

const registrationFees = [
  {
    code: 'morocco-faculty-professional',
    label: 'Enseignants-chercheurs et professionnels au Maroc',
    amount: 1200,
    currency: 'MAD' as const,
    exempt: false,
  },
  {
    code: 'morocco-doctoral-student',
    label: 'Doctorants et étudiants au Maroc',
    amount: 600,
    currency: 'MAD' as const,
    exempt: false,
  },
  {
    code: 'foreign-onsite',
    label: 'Participants étrangers en présentiel',
    amount: 150,
    currency: 'EUR' as const,
    exempt: false,
  },
  {
    code: 'remote',
    label: 'Participation à distance',
    amount: 60,
    currency: 'EUR' as const,
    alternateAmount: 600,
    alternateCurrency: 'MAD' as const,
    exempt: false,
  },
  {
    code: 'committee-invited-speaker',
    label: 'Membres des comités et conférenciers invités',
    exempt: true,
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

export type ICAIA2027SeedResult = {
  editionId: number
  editionCreated: boolean
  importantDatesCreated: number
  importantDatesUpdated: number
  thematicAxesCreated: number
  thematicAxesUpdated: number
  detailsCreated: boolean
}

export async function seedICAIA2027(payload: Payload): Promise<ICAIA2027SeedResult> {
  const existingEdition = await payload.find({
    collection: 'editions',
    locale: 'fr',
    fallbackLocale: false,
    overrideAccess: true,
    where: { year: { equals: 2027 } },
    limit: 1,
  })

  const editionCreated = existingEdition.docs.length === 0
  const editionData = {
    title: 'Intelligence Artificielle et ses Applications (ICAIA’27)',
    editionNumber: 3,
    theme:
      'Vers un Écosystème Numérique Augmenté : Innover, Protéger et Transformer notre Monde Connecté',
    startDate: '2027-05-15',
    endDate: '2027-05-15',
    conferenceDateStatus: 'provisional' as const,
    conferenceDateCandidates: [
      { date: '2027-05-15', source: 'Argumentaire — calendrier principal' },
      { date: '2027-05-22', source: 'Argumentaire — couverture / affiche' },
    ],
    conferenceDateNote:
      'Le calendrier principal de l’argumentaire indique le 15 mai 2027, tandis que la couverture / affiche indique le 22 mai 2027. Le 15 mai 2027 est utilisé comme date de travail dans l’attente d’une confirmation finale des organisateurs.',
    venue: 'HEEC Marrakech',
    venueAddress: null,
    venueMapUrl: null,
    organizers: [{ name: 'HEEC Marrakech' }, { name: 'Université Cadi Ayyad' }],
    contactEmail: 'icaia@heec.ma',
    description: richText(
      'La troisième édition d’ICAIA, portée par HEEC Marrakech et l’Université Cadi Ayyad, est consacrée à la construction d’un écosystème numérique augmenté, innovant, sûr, responsable, durable et inclusif. Elle réunit recherche, retours d’expérience et travaux doctoraux autour des transformations liées à l’intelligence artificielle et aux technologies numériques convergentes.',
    ),
    submissionsEnabled: false,
    submissionDeadline: null,
    registrationEnabled: false,
    editionStatus: 'live' as const,
    _status: 'published' as const,
  }

  const edition = editionCreated
    ? await payload.create({
        collection: 'editions',
        locale: 'fr',
        draft: false,
        overrideAccess: true,
        data: { year: 2027, ...editionData },
      })
    : await payload.update({
        collection: 'editions',
        id: existingEdition.docs[0].id,
        locale: 'fr',
        draft: false,
        overrideAccess: true,
        data: editionData,
      })

  let importantDatesCreated = 0
  let importantDatesUpdated = 0
  for (const item of importantDates) {
    const existing = await payload.find({
      collection: 'important-dates',
      overrideAccess: true,
      where: { and: [{ edition: { equals: edition.id } }, { date: { equals: item.date } }] },
      limit: 1,
    })
    if (existing.docs[0]) {
      await payload.update({
        collection: 'important-dates',
        id: existing.docs[0].id,
        locale: 'fr',
        overrideAccess: true,
        data: item,
      })
      importantDatesUpdated++
    } else {
      await payload.create({
        collection: 'important-dates',
        locale: 'fr',
        overrideAccess: true,
        data: { edition: edition.id, ...item },
      })
      importantDatesCreated++
    }
  }

  let thematicAxesCreated = 0
  let thematicAxesUpdated = 0
  for (const [index, title] of thematicAxes.entries()) {
    const code = `AXE-${String(index + 1).padStart(2, '0')}`
    const existing = await payload.find({
      collection: 'thematic-axes',
      overrideAccess: true,
      where: { and: [{ edition: { equals: edition.id } }, { code: { equals: code } }] },
      limit: 1,
    })
    if (existing.docs[0]) {
      await payload.update({
        collection: 'thematic-axes',
        id: existing.docs[0].id,
        locale: 'fr',
        overrideAccess: true,
        data: { code, title, order: index + 1 },
      })
      thematicAxesUpdated++
    } else {
      await payload.create({
        collection: 'thematic-axes',
        locale: 'fr',
        overrideAccess: true,
        data: { edition: edition.id, code, title, order: index + 1 },
      })
      thematicAxesCreated++
    }
  }

  const existingDetails = await payload.find({
    collection: 'conference-details',
    overrideAccess: true,
    where: { edition: { equals: edition.id } },
    limit: 1,
  })
  const detailsData = {
    contributionTypes: contributionTypes.map((item) => ({ ...item })),
    submissionLanguages: ['fr', 'en', 'ar'] as ('fr' | 'en' | 'ar')[],
    englishAbstractRequired: true,
    extendedAbstractMinWords: 800,
    extendedAbstractMaxWords: 1000,
    fullPaperMinPages: 15,
    fullPaperMaxPages: 20,
    acceptedFormats: ['docx', 'pdf'] as ('docx' | 'pdf')[],
    anonymizedManuscriptRequired: true,
    separateAuthorCoverSheetRequired: true,
    reviewersPerSubmission: 2,
    thirdReviewerOnDisagreement: true,
    decisionOutcomes: ['acceptance', 'conditional-revision', 'rejection'] as (
      | 'acceptance'
      | 'conditional-revision'
      | 'rejection'
    )[],
    anonymizedReportsReturned: true,
    isbnProceedings: true,
    registrationRequired: true,
    paymentRequired: true,
    paymentProofRequired: true,
    invitationLettersAvailable: true,
    registrationFees: registrationFees.map((item) => ({ ...item })),
  }
  if (existingDetails.docs[0]) {
    await payload.update({
      collection: 'conference-details',
      id: existingDetails.docs[0].id,
      locale: 'fr',
      overrideAccess: true,
      data: detailsData,
    })
  } else {
    await payload.create({
      collection: 'conference-details',
      locale: 'fr',
      overrideAccess: true,
      data: { edition: edition.id, ...detailsData },
    })
  }

  return {
    editionId: edition.id,
    editionCreated,
    importantDatesCreated,
    importantDatesUpdated,
    thematicAxesCreated,
    thematicAxesUpdated,
    detailsCreated: existingDetails.docs.length === 0,
  }
}
