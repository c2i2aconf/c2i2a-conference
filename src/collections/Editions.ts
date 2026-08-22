import type { CollectionConfig } from 'payload'

import { anyone, isAdmin, isAdminOrEditor } from '../access'

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
  access: {
    read: anyone,
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
      name: 'theme',
      type: 'text',
      localized: true,
      admin: { description: 'Edition theme/motto, e.g. "Generative AI in practice"' },
    },
    {
      type: 'row',
      fields: [
        { name: 'startDate', type: 'date', required: true },
        { name: 'endDate', type: 'date', required: true },
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
