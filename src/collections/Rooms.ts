import type { CollectionConfig } from 'payload'

import { anyone, isAdmin, isAdminOrEditor } from '../access'
import { revalidateSiteAfterChange, revalidateSiteAfterDelete } from '../hooks/revalidateSite'

/** Conference rooms (e.g. "Amphi Ibn Batouta"). Names are proper nouns → not localized. */
export const Rooms: CollectionConfig = {
  slug: 'rooms',
  admin: {
    useAsTitle: 'name',
    group: 'Program',
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
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'capacity',
      type: 'number',
    },
  ],
}
