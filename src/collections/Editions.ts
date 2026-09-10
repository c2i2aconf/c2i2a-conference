import { APIError, type CollectionConfig } from 'payload'

import { isAdmin, isAdminOrEditor, publishedOrAdminEditor } from '../access'
import { revalidateSiteAfterChange, revalidateSiteAfterDelete } from '../hooks/revalidateSite'

/**
 * A conference edition (one per year: C2I2A 2024, 2025, 2026…).
 * Everything (sessions, speakers, sponsors…) is linked to an edition.
 * - status "live"    → the current edition shown on the homepage
 * - status "archived"→ past edition, visible read-only under /archive/[year]
 */
export const Editions: CollectionConfig = {
  slug: 'editions',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['year', 'title', 'editionStatus', 'startDate'],
    group: 'Content',
  },
  hooks: {
    beforeValidate: [
      ({ data, originalDoc }) => {
        if (!data) return data
        const dateStatus = data.conferenceDateStatus ?? originalDoc?.conferenceDateStatus ?? 'confirmed'
        const startDate = data.startDate !== undefined ? data.startDate : originalDoc?.startDate
        const endDate = data.endDate !== undefined ? data.endDate : originalDoc?.endDate
        const candidates =
          data.conferenceDateCandidates ?? originalDoc?.conferenceDateCandidates ?? []

        if (dateStatus === 'unresolved') {
          if (startDate || endDate) {
            throw new APIError(
              'Unresolved conference dates must not publish a definitive start or end date.',
              400,
              undefined,
              true,
            )
          }
          if (candidates.length < 2) {
            throw new APIError(
              'At least two sourced candidates are required for an unresolved conference date.',
              400,
              undefined,
              true,
            )
          }
        } else if (!startDate || !endDate) {
          throw new APIError(
            'Confirmed and provisional conference dates require both a start and end date.',
            400,
            undefined,
            true,
          )
        }
        if (dateStatus === 'provisional') {
          if (
            candidates.length < 2 ||
            !(data.conferenceDateNote ?? originalDoc?.conferenceDateNote)
          ) {
            throw new APIError(
              'A provisional conference date requires the sourced candidates and an editorial note.',
              400,
              undefined,
              true,
            )
          }
        }
        return data
      },
    ],
    afterChange: [revalidateSiteAfterChange],
    afterDelete: [revalidateSiteAfterDelete],
  },
  access: {
    read: publishedOrAdminEditor,
    readVersions: isAdminOrEditor,
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdmin,
  },
  versions: {
    drafts: true,
  },
  fields: [
    {
      name: 'year',
      type: 'number',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
    },
    {
      name: 'editionNumber',
      type: 'number',
      admin: { description: 'Ordinal edition number, when the official source states it.' },
    },
    {
      name: 'theme',
      type: 'text',
      localized: true,
      admin: { description: 'Edition theme/motto, e.g. "Generative AI in practice"' },
    },
    {
      type: 'row',
      fields: [
        { name: 'startDate', type: 'date' },
        { name: 'endDate', type: 'date' },
      ],
    },
    {
      name: 'conferenceDateStatus',
      type: 'select',
      defaultValue: 'confirmed',
      options: [
        { label: 'Confirmed', value: 'confirmed' },
        { label: 'Provisional working date', value: 'provisional' },
        { label: 'Unresolved source conflict', value: 'unresolved' },
      ],
      admin: { description: 'Use unresolved when official sources disagree.' },
    },
    {
      name: 'conferenceDateNote',
      type: 'textarea',
      localized: true,
      admin: {
        description: 'Editorial provenance and confirmation status for a provisional date.',
        condition: (_, siblingData) => siblingData?.conferenceDateStatus === 'provisional',
      },
    },
    {
      name: 'conferenceDateCandidates',
      type: 'array',
      admin: {
        description: 'Sourced alternatives shown publicly while the conference date is unresolved.',
        condition: (_, siblingData) => siblingData?.conferenceDateStatus === 'unresolved',
      },
      fields: [
        { name: 'date', type: 'date', required: true },
        { name: 'source', type: 'text', required: true, localized: true },
      ],
    },
    {
      name: 'venue',
      type: 'text',
      localized: true,
      admin: { description: 'e.g. HEEC Campus, Marrakech' },
    },
    {
      name: 'venueAddress',
      type: 'textarea',
      localized: true,
    },
    {
      name: 'venueMapUrl',
      type: 'text',
      admin: { description: 'Google Maps link or embed URL' },
    },
    {
      name: 'organizers',
      type: 'array',
      fields: [{ name: 'name', type: 'text', required: true }],
    },
    {
      name: 'contactEmail',
      type: 'email',
      admin: { description: 'Edition-specific public contact address.' },
    },
    {
      name: 'bannerImage',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'posterImage',
      type: 'upload',
      relationTo: 'media',
      admin: { description: 'Official poster (call for papers)' },
    },
    {
      name: 'submissionsEnabled',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Manually enables submissions until the configured deadline.',
      },
    },
    {
      name: 'registrationEnabled',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Enables the public registration workflow for this edition.',
      },
    },
    {
      name: 'submissionDeadline',
      type: 'date',
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime' },
        description: 'Submissions close automatically at this exact time.',
        condition: (_, siblingData) => Boolean(siblingData?.submissionsEnabled),
      },
      validate: (value, { siblingData }) => {
        if ((siblingData as { submissionsEnabled?: boolean })?.submissionsEnabled && !value) {
          return 'A deadline is required while submissions are enabled.'
        }
        return true
      },
    },
    {
      name: 'description',
      type: 'richText',
      localized: true,
    },
    {
      name: 'editionStatus',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Draft (hidden)', value: 'draft' },
        { label: 'Live (current edition)', value: 'live' },
        { label: 'Archived (past edition)', value: 'archived' },
      ],
      admin: { position: 'sidebar' },
    },
  ],
}
