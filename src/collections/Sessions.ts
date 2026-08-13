import type { CollectionConfig } from 'payload'

import { anyone, isAdmin, isAdminOrEditor } from '../access'

/**
 * A program slot: keynote, parallel session, coffee break, ceremony…
 * Parallel sessions are separate docs sharing the same date/time with different rooms.
 */
export const Sessions: CollectionConfig = {
  slug: 'sessions',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['date', 'startTime', 'endTime', 'title', 'type'],
    group: 'Program',
  },
  access: {
    read: anyone,
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'edition',
      type: 'relationship',
      relationTo: 'editions',
      required: true,
    },
    {
      name: 'title',
      type: 'text',
      localized: true,
      admin: { description: 'Empty for untitled parallel sessions (speaker shown instead)' },
    },
    {
      name: 'date',
      type: 'date',
      required: true,
      admin: { date: { pickerAppearance: 'dayOnly' } },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'startTime',
          type: 'text',
          required: true,
          admin: { description: 'HH:MM, e.g. 09:00', width: '50%' },
        },
        {
          name: 'endTime',
          type: 'text',
          required: true,
          admin: { description: 'HH:MM, e.g. 10:30', width: '50%' },
        },
      ],
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'session',
      options: [
        { label: 'Plenary / Keynote', value: 'keynote' },
        { label: 'Session', value: 'session' },
        { label: 'Break', value: 'break' },
        { label: 'Logistics', value: 'logistics' },
        { label: 'Ceremony', value: 'ceremony' },
        { label: 'Tour', value: 'tour' },
      ],
    },
    {
      name: 'room',
      type: 'relationship',
      relationTo: 'rooms',
    },
    {
      name: 'speakers',
      type: 'relationship',
      relationTo: 'speakers',
      hasMany: true,
    },
    {
      name: 'description',
      type: 'textarea',
      localized: true,
    },
  ],
}
