import type { CollectionConfig } from 'payload'

import { anyone, isAdmin, isAdminOrEditor } from '../access'

/** One doc per committee per edition, members managed as an ordered list. */
export const Committees: CollectionConfig = {
  slug: 'committees',
  admin: {
    useAsTitle: 'type',
    group: 'Content',
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
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Scientific committee', value: 'scientific' },
        { label: 'Organization committee', value: 'organization' },
      ],
    },
    {
      name: 'members',
      type: 'array',
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'affiliation', type: 'text' },
        {
          name: 'role',
          type: 'text',
          localized: true,
          admin: { description: 'e.g. Chair, Co-chair, Member' },
        },
      ],
    },
  ],
}
