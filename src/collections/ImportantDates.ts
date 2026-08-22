import type { CollectionConfig } from 'payload'

import { anyone, isAdmin, isAdminOrEditor } from '../access'
import { revalidateSiteAfterChange, revalidateSiteAfterDelete } from '../hooks/revalidateSite'

export const ImportantDates: CollectionConfig = {
  slug: 'important-dates',
  admin: {
    useAsTitle: 'label',
    defaultColumns: ['date', 'label', 'status', 'edition'],
    group: 'Content',
  },
  hooks: {
    afterChange: [revalidateSiteAfterChange],
    afterDelete: [revalidateSiteAfterDelete],
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
      type: 'row',
      fields: [
        { name: 'date', type: 'date', required: true },
        {
          name: 'endDate',
          type: 'date',
          admin: { description: 'Optional — for date ranges' },
        },
      ],
    },
    {
      name: 'label',
      type: 'text',
      required: true,
      localized: true,
    },
    {
      name: 'note',
      type: 'text',
      localized: true,
      admin: { description: 'Optional extra info, e.g. "(extended)"' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'upcoming',
      options: [
        { label: 'Open', value: 'open' },
        { label: 'Closed', value: 'closed' },
        { label: 'Extended', value: 'extended' },
        { label: 'Upcoming', value: 'upcoming' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      admin: { position: 'sidebar' },
    },
  ],
}
